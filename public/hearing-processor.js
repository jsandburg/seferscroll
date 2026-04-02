/**
 * hearing-processor.js
 * AudioWorklet processor for the Hearing Loss Simulator.
 *
 * IMPORTANT: This file runs in the AudioWorklet global scope — a completely
 * separate JavaScript environment from the main React app. There is NO:
 *   - import / require
 *   - DOM access
 *   - React state
 *   - window / document
 *
 * Only available globals: AudioWorkletProcessor, registerProcessor, sampleRate,
 * currentTime, currentFrame, MessagePort.
 *
 * This file must be served as a static asset (placed in /public/).
 * It is loaded via: audioContext.audioWorklet.addModule('/hearing-processor.js?v=1')
 *
 * Architecture: Filterbank — per-band isolation
 * For each of the 8 audiogram frequency bands:
 *   1. Analysis bandpass filter measures band energy (RMS over 128-sample block)
 *   2. Threshold gate: if band energy < hearing threshold → mute that band
 * Then on the full mixed signal:
 *   3. Tinnitus tone addition (sinusoidal oscillator)
 *   4. Hard clip to [-1, 1]
 */

'use strict';

// ─── Constants ──────────────────────────────────────────────────────────────

const NUM_BANDS    = 8;
const FREQUENCIES  = [250, 500, 1000, 2000, 3000, 4000, 6000, 8000];
// Per-band Q values calculated from audiogram frequency spacing
const BAND_Q       = [1.41, 1.42, 1.41, 1.93, 2.96, 2.79, 2.96, 3.86];

// ─── Biquad Filter Utilities ─────────────────────────────────────────────────
// Direct-form II transposed biquad implementation.
// Each filter state: { b0, b1, b2, a1, a2, z1, z2 }

function makeBandpassCoeffs(freq, Q, sr) {
  // RBJ bandpass (constant 0 dB peak) cookbook formula
  const w0    = 2 * Math.PI * freq / sr;
  const alpha = Math.sin(w0) / (2 * Q);
  const b0    =  alpha;
  const b1    =  0;
  const b2    = -alpha;
  const a0    =  1 + alpha;
  const a1    = -2 * Math.cos(w0);
  const a2    =  1 - alpha;
  return {
    b0: b0 / a0, b1: b1 / a0, b2: b2 / a0,
    a1: a1 / a0, a2: a2 / a0,
    z1: 0, z2: 0,
  };
}

function tickBiquad(f, x) {
  // Process one sample through a biquad filter state object.
  // Returns filtered sample, mutates f.z1 and f.z2 in place.
  const y = f.b0 * x + f.z1;
  f.z1    = f.b1 * x - f.a1 * y + f.z2;
  f.z2    = f.b2 * x - f.a2 * y;
  return y;
}

// ─── HearingProcessor ────────────────────────────────────────────────────────

class HearingProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super(options);

    // ── Parameters (updated via MessagePort) ──────────────────────────────
    // thresholds: Float32Array[8] — hearing threshold per band in dB HL
    // tinnitus: { enabled, frequency, level }
    this.thresholds    = new Float32Array(NUM_BANDS); // all 0 = no gating
    this.tinnitus      = { enabled: false, frequency: 4000, level: 0 };

    // ── Analysis filterbank ────────────────────────────────────────────────
    // One bandpass biquad per band. Used to measure per-band energy.
    this.analysisFilters = FREQUENCIES.map((f, i) =>
      makeBandpassCoeffs(f, BAND_Q[i], sampleRate)
    );

    // ── Reconstruction filterbank ──────────────────────────────────────────
    // Matched pair to analysis filters. Used to reconstruct the output
    // from gated per-band signals.
    this.reconstructFilters = FREQUENCIES.map((f, i) =>
      makeBandpassCoeffs(f, BAND_Q[i], sampleRate)
    );

    // ── Per-band energy ────────────────────────────────────────────────────
    this.bandEnergy = new Float32Array(NUM_BANDS); // RMS per band

    // ── Tinnitus oscillator ────────────────────────────────────────────────
    this.tinnitusPhase = 0;

    // ── Message handler — receives parameter updates from React ───────────
    this.port.onmessage = (e) => {
      const d = e.data;
      if (!d) return;

      if (d.thresholds) {
        // Accept plain array or Float32Array
        for (let i = 0; i < NUM_BANDS; i++) {
          this.thresholds[i] = Number(d.thresholds[i] ?? 0);
        }
      }
      if ('tinnitus' in d) {
        this.tinnitus = {
          enabled:   Boolean(d.tinnitus.enabled),
          frequency: Math.max(20, Math.min(20000, Number(d.tinnitus.frequency ?? 4000))),
          level:     Math.max(0,  Math.min(1,     Number(d.tinnitus.level     ?? 0))),
        };
      }
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  _dbToLinear(db) {
    return Math.pow(10, db / 20);
  }

  // ── Main process loop ──────────────────────────────────────────────────────

  process(inputs, outputs) {
    const inputChannel  = inputs[0]?.[0];
    const outputChannel = outputs[0]?.[0];

    if (!inputChannel || !outputChannel) return true;

    const blockSize = inputChannel.length; // always 128

    // ── Step 1: Measure per-band energy (RMS over block) ──────────────────
    // We save and restore the analysis filter state after measurement so that
    // the energy probe is effectively stateless — preventing state drift that
    // would cause threshold gating decisions to be based on stale energy estimates.
    for (let b = 0; b < NUM_BANDS; b++) {
      const af      = this.analysisFilters[b];
      const savedZ1 = af.z1;
      const savedZ2 = af.z2;

      let sumSq = 0;
      for (let i = 0; i < blockSize; i++) {
        const s = tickBiquad(af, inputChannel[i]);
        sumSq += s * s;
      }

      // Restore state: next block's energy measurement starts from the same
      // point as this block, keeping measurement independent of reconstruction
      af.z1 = savedZ1;
      af.z2 = savedZ2;

      this.bandEnergy[b] = Math.sqrt(sumSq / blockSize);
    }

    // ── Step 2: Process each sample ───────────────────────────────────────
    // Hoist tinnitus phase increment — constant within a block
    const tinnitusPhaseInc = this.tinnitus.enabled
      ? (2 * Math.PI * this.tinnitus.frequency) / sampleRate
      : 0;

    for (let i = 0; i < blockSize; i++) {
      const x = inputChannel[i];

      // Reconstruct signal as sum of gated frequency bands
      let reconstructed = 0;

      for (let b = 0; b < NUM_BANDS; b++) {
        const bandSample = tickBiquad(this.reconstructFilters[b], x);
        const energy     = this.bandEnergy[b];
        const threshDb   = this.thresholds[b];

        let gain;
        if (threshDb > 0) {
          // Threshold gating: below threshold → silence
          const threshLin = this._dbToLinear(-threshDb);
          gain = energy < threshLin ? 0.0 : 1.0;
        } else {
          gain = 1.0;
        }

        reconstructed += bandSample * gain;
      }

      // ── Step 3: Tinnitus tone ──────────────────────────────────────────
      let sample = reconstructed;
      if (this.tinnitus.enabled && this.tinnitus.level > 0) {
        sample            += Math.sin(this.tinnitusPhase) * this.tinnitus.level * 0.15;
        this.tinnitusPhase = (this.tinnitusPhase + tinnitusPhaseInc) % (2 * Math.PI);
      }

      // ── Step 4: Hard clip to [-1, 1] ──────────────────────────────────
      outputChannel[i] = sample < -1.0 ? -1.0 : sample > 1.0 ? 1.0 : sample;
    }

    return true; // keep processor alive
  }
}

registerProcessor('hearing-processor', HearingProcessor);
