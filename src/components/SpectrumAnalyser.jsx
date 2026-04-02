/**
 * components/SpectrumAnalyser.jsx
 * Canvas-based real-time spectrum analyser.
 * Has its own requestAnimationFrame loop — decoupled from React's render cycle.
 * Uses ResizeObserver for DPR-correct canvas sizing.
 */

import { useRef, useEffect, memo } from 'react';
import { FREQUENCIES, FREQ_LABELS } from '../constants/frequencies.js';
import { THEME } from '../constants/theme.js';

export const SpectrumAnalyser = memo(function SpectrumAnalyser({ engine, isPlaying }) {
  const canvasRef  = useRef(null);
  const rafRef     = useRef(null);
  const fftBufRef  = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let running = true;

    // Resize observer for DPR-correct sizing.
    // Use setTransform (not scale) to avoid stacking transforms on repeated
    // resize events — each call to ctx.scale() multiplies the existing matrix.
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const dpr = window.devicePixelRatio || 1;
        const { width, height } = entry.contentRect;
        canvas.width  = Math.round(width  * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    });
    ro.observe(canvas);

    const draw = () => {
      if (!running) return;
      rafRef.current = requestAnimationFrame(draw);

      const analyser = engine?.analyser;
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      if (W === 0 || H === 0) return;

      ctx.clearRect(0, 0, W, H);

      if (!analyser || !isPlaying) {
        // Draw a flat baseline when idle
        ctx.fillStyle = THEME.gridLine;
        ctx.fillRect(0, H - 1, W, 1);
        return;
      }

      const bufLen = analyser.frequencyBinCount;
      if (!fftBufRef.current || fftBufRef.current.length !== bufLen) {
        fftBufRef.current = new Uint8Array(bufLen);
      }
      analyser.getByteFrequencyData(fftBufRef.current);

      const sampleRate = engine.sampleRate;
      const binHz      = sampleRate / (bufLen * 2);

      // Draw bars on logarithmic frequency axis
      const freqMin = Math.log10(200);
      const freqMax = Math.log10(10000);

      const NUM_BARS = 80;
      for (let i = 0; i < NUM_BARS; i++) {
        const t      = i / (NUM_BARS - 1);
        const freq   = Math.pow(10, freqMin + t * (freqMax - freqMin));
        const bin    = Math.round(freq / binHz);
        const val    = fftBufRef.current[Math.min(bin, bufLen - 1)];
        const norm   = val / 255;
        const barH   = norm * H;

        const x      = (i / NUM_BARS) * W;
        const bw     = Math.max(1, (W / NUM_BARS) - 1);

        ctx.fillStyle = `rgba(26,82,118,${0.2 + norm * 0.6})`; // THEME.leftEar at variable opacity
        ctx.fillRect(x, H - barH, bw, barH);
      }

      // Overlay audiogram frequency markers
      ctx.fillStyle = THEME.textTertiary;
      ctx.font      = `7px ${THEME.font}`;
      ctx.textAlign = 'center';
      FREQUENCIES.forEach((f, i) => {
        const t = (Math.log10(f) - freqMin) / (freqMax - freqMin);
        const x = t * W;
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(x, 0, 1, H);
        ctx.fillStyle = THEME.textTertiary;
        ctx.fillText(FREQ_LABELS[i], x, H - 3);
      });
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [engine, isPlaying]);

  return (
    <div style={{ padding: '0 24px 16px' }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: 80,
          background: THEME.bgCard,
          border: `1px solid ${THEME.border}`,
          borderRadius: 4,
        }}
        aria-hidden="true"
      />
    </div>
  );
});
