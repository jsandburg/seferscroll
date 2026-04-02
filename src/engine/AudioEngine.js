/**
 * engine/AudioEngine.js
 *
 * All Web Audio API state lives here. Zero React dependencies.
 * The useAudioEngine hook wraps this class for React consumption.
 *
 * Persistent node graph (created once in init(), torn down in destroy()):
 *
 *   SensorineuralPathGain ──┐
 *   ConductivePathGain   ──►  MakeupGainNode → SafetyLimiter → AnalyserNode → VolumeGain → Destination
 *   BypassPathGain       ──┘
 *
 * Per-playback nodes (created in startPlay(), torn down in stop()):
 *
 *   AudioBufferSourceNode → ChannelSplitter
 *     [L] → BiquadFilter[0..7] → AudioWorkletNode(L) ──► ChannelMerger → SensorineuralPathGain
 *     [R] → BiquadFilter[0..7] → AudioWorkletNode(R) ──┘
 *     [L+R direct]                                    ──► ConductivePathGain
 *     [L+R direct]                                    ──► BypassPathGain
 *
 * All three paths are always wired. Switching presets crossfades path gain
 * nodes over 100ms — no playback interruption.
 */

import {
  AUDIO_EXTENSIONS,
  AUDIO_MIME_TYPES,
  MAX_FILE_SIZE,
} from '../constants/frequencies.js';
import { buildFilterChain, applyProfileToFilters } from './buildFilterChain.js';
import { sendWorkletParams } from './workletBridge.js';

// Version string appended to addModule URL for cache-busting
const WORKLET_VERSION = 'v1';

export class AudioEngine {
  constructor() {
    // ── Persistent nodes ───────────────────────────────────────────────────
    this._ctx              = null;
    this._snsPathGain      = null;  // sensorineural path
    this._condPathGain     = null;  // conductive path
    this._bypassPathGain   = null;
    this._limiter          = null;
    this._analyser         = null;
    this._volumeGain       = null;

    // ── Worklet state ──────────────────────────────────────────────────────
    this._workletReady     = false;
    this._workletLoading   = false;

    // ── Per-playback nodes ─────────────────────────────────────────────────
    this._source           = null;
    this._sourceStarted    = false;
    this._chainCleanup     = null;
    this._filtersL         = [];
    this._filtersR         = [];
    this._workletL         = null;
    this._workletR         = null;

    // ── State ──────────────────────────────────────────────────────────────
    this._currentProfile   = null;
    this._workletOverrides = {};
    this._buffer           = null;
    this._playStartTime    = 0;
    this._isPlaying        = false;
    this._looping          = true;
    this._volume           = 1.0;

    // ── Safety ────────────────────────────────────────────────────────────
    this._decodeGen        = 0;
    this._debounceTimer    = null;

    // ── Callbacks (set by useAudioEngine) ──────────────────────────────────
    this.onPlayEnd         = null;
    this.onLimiterActive   = null;
    this.onWorkletReady    = null;
  }

  // ─── Static ────────────────────────────────────────────────────────────────

  static isSupported() {
    return typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined';
  }

  static validateFile(file) {
    if (!file) return 'No file provided.';
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is ${Math.round(MAX_FILE_SIZE / (1024 * 1024))} MB.`;
    }
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const mimeOk = AUDIO_MIME_TYPES.has(file.type);
    const extOk  = AUDIO_EXTENSIONS.has(ext);
    if (!mimeOk && !extOk) {
      return `Unsupported file type "${ext}". Please use MP3, WAV, OGG, M4A, AAC, FLAC, or OPUS.`;
    }
    return null;
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  async init() {
    if (this._ctx) return; // already initialised

    const Ctx = window.AudioContext || window.webkitAudioContext;
    this._ctx = new Ctx({ sampleRate: 44100 });

    // Clamp destination to stereo — prevents surround upmixing
    this._ctx.destination.channelCount         = 2;
    this._ctx.destination.channelCountMode      = 'explicit';
    this._ctx.destination.channelInterpretation = 'speakers';

    // ── Persistent node graph ──────────────────────────────────────────────
    this._snsPathGain    = this._ctx.createGain();
    this._condPathGain   = this._ctx.createGain();
    this._bypassPathGain = this._ctx.createGain();

    this._limiter = this._ctx.createDynamicsCompressor();
    this._limiter.threshold.value = -3;
    this._limiter.knee.value      = 0;
    this._limiter.ratio.value     = 20;
    this._limiter.attack.value    = 0.001;
    this._limiter.release.value   = 0.05;

    this._analyser = this._ctx.createAnalyser();
    this._analyser.fftSize            = 2048;
    this._analyser.smoothingTimeConstant = 0.8;

    this._volumeGain = this._ctx.createGain();
    this._volumeGain.gain.value = this._volume;

    // Wire persistent graph — path gains connect directly to limiter
    this._snsPathGain.connect(this._limiter);
    this._condPathGain.connect(this._limiter);
    this._bypassPathGain.connect(this._limiter);
    this._limiter.connect(this._analyser);
    this._analyser.connect(this._volumeGain);
    this._volumeGain.connect(this._ctx.destination);

    // All paths start silent
    this._snsPathGain.gain.value    = 0;
    this._condPathGain.gain.value   = 0;
    this._bypassPathGain.gain.value = 0;

    // ── Load AudioWorklet module ────────────────────────────────────────────
    // Safari and Firefox start a new AudioContext in "suspended" state even
    // during a user gesture. addModule() fails on a suspended context in both
    // browsers (Chrome is more lenient). Resume first, then load the module.
    if (this._ctx.state === 'suspended') {
      try { await this._ctx.resume(); } catch (_) {}
    }

    this._workletLoading = true;
    try {
      await this._ctx.audioWorklet.addModule(
        `/hearing-processor.js?${WORKLET_VERSION}`
      );
      this._workletReady   = true;
      this._workletLoading = false;
      if (this.onWorkletReady) this.onWorkletReady(true);
    } catch (err) {
      console.warn('[AudioEngine] AudioWorklet unavailable — falling back to BiquadFilter-only mode.', err);
      this._workletReady   = false;
      this._workletLoading = false;
      if (this.onWorkletReady) this.onWorkletReady(false);
    }
  }

  async ensureRunning() {
    if (!this._ctx) await this.init();
    if (this._ctx.state === 'closed') {
      // Context was closed (e.g. long inactivity on mobile) — recreate
      this._ctx = null;
      this._workletReady = false;
      await this.init();
    }
    if (this._ctx.state === 'suspended') {
      await this._ctx.resume();
    }
  }

  destroy() {
    this.stop();
    if (this._ctx) {
      try { this._ctx.close(); } catch (_) {}
      this._ctx = null;
    }
    this._workletReady = false;
  }

  // ─── File loading ──────────────────────────────────────────────────────────

  async loadFile(file) {
    const validationError = AudioEngine.validateFile(file);
    if (validationError) throw new Error(validationError);

    this.stop();
    await this.ensureRunning();

    const gen = ++this._decodeGen;
    let arrayBuffer;
    try {
      arrayBuffer = await file.arrayBuffer();
    } catch (_) {
      throw new Error('Could not read file. The file may be corrupted or inaccessible.');
    }

    let audioBuffer;
    try {
      audioBuffer = await this._ctx.decodeAudioData(arrayBuffer);
    } catch (_) {
      throw new Error(
        'Could not decode audio. The file may be corrupt or in an unsupported format. ' +
        'Try converting to MP3 or WAV.'
      );
    }

    // Guard against race condition: another load started while we were decoding
    if (gen !== this._decodeGen) return null;

    this._buffer = audioBuffer;

    // Warn about files with sample content only in low frequency range
    // (e.g. voice memos recorded at 8 kHz — 8k filter will behave oddly)
    const nyquist = audioBuffer.sampleRate / 2;
    if (nyquist < 8000) {
      console.warn(
        `[AudioEngine] File sample rate ${audioBuffer.sampleRate} Hz — ` +
        `Nyquist limit ${nyquist} Hz is below the 8 kHz audiogram band.`
      );
    }

    return audioBuffer;
  }

  // ─── Playback ──────────────────────────────────────────────────────────────

  startPlay(profile, overrides = {}) {
    if (!this._ctx || !this._buffer) return;
    if (this._isPlaying) this._teardownSource();

    this._currentProfile   = profile;
    this._workletOverrides = overrides;

    // Build per-playback filter chain
    const chain = buildFilterChain(this._ctx, profile, this._workletReady);
    this._chainCleanup = chain.cleanup;
    this._filtersL     = chain.filtersL;
    this._filtersR     = chain.filtersR;
    this._workletL     = chain.workletL;
    this._workletR     = chain.workletR;

    // Wire source into chain
    this._source        = this._ctx.createBufferSource();
    this._source.buffer = this._buffer;
    this._source.loop   = this._looping;
    this._source.connect(chain.input);

    // Connect chain output to the correct path gain node FIRST,
    // then open the path gain — ensures no gap between connection and signal flow.
    // Each profile type routes to its own persistent gain node:
    //   sensorineural → _snsPathGain, conductive → _condPathGain, bypass → _bypassPathGain
    chain.output.connect(this._pathGainNode(profile));

    // Send worklet parameters (if worklet is active)
    if (this._workletL || this._workletR) {
      sendWorkletParams(this._workletL, this._workletR, profile, overrides);
    }

    // Start source
    this._source.start(0);
    this._sourceStarted = true;
    this._playStartTime = this._ctx.currentTime;
    this._isPlaying     = true;

    // onended only fires for non-looping sources
    this._source.onended = () => {
      if (!this._looping) {
        this._isPlaying = false;
        if (this.onPlayEnd) this.onPlayEnd();
      }
    };

    // Open the correct path gain after the chain is connected
    this._setPathGainsForProfile(profile, false);
  }

  stop() {
    if (this._source && this._sourceStarted) {
      try { this._source.stop(); } catch (_) {}
    }
    this._teardownSource();
    this._isPlaying = false;
    this._setAllPathGainsSilent();
  }

  _teardownSource() {
    if (this._chainCleanup) {
      try { this._chainCleanup(); } catch (_) {}
      this._chainCleanup = null;
    }
    this._source        = null;
    this._sourceStarted = false;
    this._filtersL      = [];
    this._filtersR      = [];
    this._workletL      = null;
    this._workletR      = null;
  }

  // ─── Profile switching (live, no playback interruption) ───────────────────

  switchProfile(newProfile, overrides = {}) {
    if (!this._ctx || !this._isPlaying) {
      this._currentProfile   = newProfile;
      this._workletOverrides = overrides;
      return;
    }

    // Debounce rapid switching (Firefox biquad NaN protection)
    clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => {
      this._doSwitchProfile(newProfile, overrides);
    }, 16); // one animation frame
  }

  _doSwitchProfile(newProfile, overrides) {
    if (!this._ctx || !this._isPlaying) return;

    const prevProfile = this._currentProfile;
    this._currentProfile   = newProfile;
    this._workletOverrides = overrides;

    const now      = this._ctx.currentTime;
    const FADE     = 0.1; // 100ms crossfade

    // If path type changes (e.g. sensorineural → conductive), we need to
    // rebuild the chain. Otherwise we can update in place.
    const pathChanged = this._getPathKey(prevProfile) !== this._getPathKey(newProfile);

    if (pathChanged) {
      // Fade out current path
      this._setAllPathGainsSilent(now, FADE);
      // Rebuild chain after fade
      setTimeout(() => {
        if (!this._isPlaying) return;
        this._teardownSource();
        this.startPlay(newProfile, overrides);
      }, FADE * 1000 + 20);
      return;
    }

    // Same path type — update filters in place
    if (this._filtersL.length > 0) {
      applyProfileToFilters(this._filtersL, newProfile.left,  this._ctx);
      applyProfileToFilters(this._filtersR, newProfile.right, this._ctx);
    }

    // Update worklet parameters
    if (this._workletL || this._workletR) {
      sendWorkletParams(this._workletL, this._workletR, newProfile, overrides);
    }

  }

  // Update worklet overrides without switching profile
  updateWorkletOverrides(overrides) {
    this._workletOverrides = overrides;
    if (this._currentProfile && (this._workletL || this._workletR)) {
      sendWorkletParams(this._workletL, this._workletR, this._currentProfile, overrides);
    }
  }

  // ─── Path gain helpers ─────────────────────────────────────────────────────

  _getPathKey(profile) {
    if (!profile)             return 'bypass';
    if (profile.bypass)       return 'bypass';
    if (profile.isConductive) return 'conductive';
    return 'sensorineural';
  }

  _pathGainNode(profile) {
    // Returns the persistent gain node that receives audio for this profile type.
    const key = this._getPathKey(profile);
    if (key === 'conductive') return this._condPathGain;
    if (key === 'bypass')     return this._bypassPathGain;
    return this._snsPathGain;
  }

  _setPathGainsForProfile(profile, animate = true) {
    if (!this._ctx) return;
    const now  = this._ctx.currentTime;
    const RAMP = animate ? 0.1 : 0.005;
    const key  = this._getPathKey(profile);

    const targets = {
      sensorineural: key === 'sensorineural' ? 1 : 0,
      conductive:    key === 'conductive'    ? 1 : 0,
      bypass:        key === 'bypass'        ? 1 : 0,
    };

    [
      [this._snsPathGain,    targets.sensorineural],
      [this._condPathGain,   targets.conductive],
      [this._bypassPathGain, targets.bypass],
    ].forEach(([node, target]) => {
      node.gain.cancelScheduledValues(now);
      node.gain.setValueAtTime(node.gain.value, now);
      node.gain.linearRampToValueAtTime(target, now + RAMP);
    });
  }

  _setAllPathGainsSilent(now, fadeTime = 0.005) {
    if (!this._ctx) return;
    const t = now ?? this._ctx.currentTime;
    [this._snsPathGain, this._condPathGain, this._bypassPathGain].forEach(node => {
      node.gain.cancelScheduledValues(t);
      node.gain.setValueAtTime(node.gain.value, t);
      node.gain.linearRampToValueAtTime(0, t + fadeTime);
    });
  }

  // ─── Seek ──────────────────────────────────────────────────────────────────

  seek(fraction) {
    if (!this._buffer || !this._isPlaying) return;
    const profile   = this._currentProfile;
    const overrides = this._workletOverrides;
    const offset    = Math.max(0, Math.min(1, fraction)) * this._buffer.duration;

    // Stop the current source cleanly without calling the full stop()
    // (which would silence path gains — we want audio to continue immediately)
    if (this._source && this._sourceStarted) {
      try { this._source.stop(); } catch (_) {}
    }
    this._teardownSource();

    // Rebuild filter chain and start at the new offset position
    const chain = buildFilterChain(this._ctx, profile, this._workletReady);
    this._chainCleanup = chain.cleanup;
    this._filtersL     = chain.filtersL;
    this._filtersR     = chain.filtersR;
    this._workletL     = chain.workletL;
    this._workletR     = chain.workletR;

    this._source        = this._ctx.createBufferSource();
    this._source.buffer = this._buffer;
    this._source.loop   = this._looping;
    this._source.connect(chain.input);
    chain.output.connect(this._pathGainNode(profile));

    if (this._workletL || this._workletR) {
      sendWorkletParams(this._workletL, this._workletR, profile, overrides);
    }

    this._source.onended = () => {
      if (!this._looping) {
        this._isPlaying = false;
        if (this.onPlayEnd) this.onPlayEnd();
      }
    };

    this._source.start(0, offset);
    this._sourceStarted = true;
    this._playStartTime = this._ctx.currentTime - offset;
    this._isPlaying     = true;
  }

  // ─── Volume ────────────────────────────────────────────────────────────────

  setVolume(linearGain) {
    this._volume = linearGain;
    if (this._volumeGain && this._ctx) {
      const now = this._ctx.currentTime;
      this._volumeGain.gain.cancelScheduledValues(now);
      this._volumeGain.gain.setValueAtTime(this._volumeGain.gain.value, now);
      this._volumeGain.gain.linearRampToValueAtTime(linearGain, now + 0.02);
    }
  }

  // ─── Loop ──────────────────────────────────────────────────────────────────

  setLooping(enabled) {
    this._looping = enabled;
    if (this._source) this._source.loop = enabled;
  }

  // ─── Load pre-decoded ArrayBuffer (for share player) ─────────────────────

  async loadBuffer(arrayBuffer) {
    await this.ensureRunning();
    const gen = ++this._decodeGen;
    let buf;
    try {
      buf = await this._ctx.decodeAudioData(arrayBuffer);
    } catch (_) {
      throw new Error(
        'Could not decode shared audio. The file may be corrupt or in an unsupported format.'
      );
    }
    if (gen !== this._decodeGen) return null; // superseded by another load
    this._buffer = buf;
    return buf;
  }

  // ─── Getters ───────────────────────────────────────────────────────────────

  get isPlaying()     { return this._isPlaying; }
  get workletReady()  { return this._workletReady; }
  get workletLoading(){ return this._workletLoading; }
  get buffer()        { return this._buffer; }
  get analyser()      { return this._analyser; }
  get sampleRate()    { return this._ctx?.sampleRate ?? 44100; }

  get elapsed() {
    if (!this._isPlaying || !this._ctx) return 0;
    const raw = this._ctx.currentTime - this._playStartTime;
    if (!this._buffer) return raw;
    return this._looping
      ? raw % this._buffer.duration
      : Math.min(raw, this._buffer.duration);
  }

  get limiterReduction() {
    return this._limiter ? Math.abs(this._limiter.reduction) : 0;
  }
}
