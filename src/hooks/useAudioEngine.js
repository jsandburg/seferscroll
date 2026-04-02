/**
 * hooks/useAudioEngine.js
 *
 * React wrapper around the AudioEngine class.
 * Manages the engine lifecycle, exposes reactive state, and provides
 * a stable API for components.
 *
 * Returns:
 *  engine        — AudioEngine instance (stable ref)
 *  playState     — 'stopped' | 'playing' | 'loading'
 *  elapsed       — playback position in seconds (updated via rAF)
 *  fileInfo      — { name, duration, sampleRate, channels } | null
 *  workletReady  — boolean
 *  workletLoading — boolean
 *  errors        — { decode, format, size, context } — each string|null
 *  warnings      — string[]
 *  loadFile()
 *  startPlay()
 *  stop()
 *  seek()
 *  setVolume()
 *  setLooping()
 *  switchProfile()
 *  updateWorkletOverrides()
 *  clearError()
 *  clearWarning()
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioEngine } from '../engine/AudioEngine.js';
import { displayFileName, formatDuration } from '../utils/fileValidation.js';
import { percentToGain } from '../utils/volumeCurve.js';

export function useAudioEngine() {
  const engineRef       = useRef(null);
  const animFrameRef    = useRef(null);
  const mountedRef      = useRef(true);

  const [playState,     setPlayState]     = useState('stopped');
  const [elapsed,       setElapsed]       = useState(0);
  const [fileInfo,      setFileInfo]      = useState(null);
  const [workletReady,    setWorkletReady]    = useState(false);
  const [workletLoading,  setWorkletLoading]  = useState(false);
  const [workletAttempted,setWorkletAttempted]= useState(false);
  const [errors,        setErrors]        = useState({ decode: null, format: null, size: null, context: null });
  const [warnings,      setWarnings]      = useState([]);

  // ── Engine initialisation ──────────────────────────────────────────────────

  if (!engineRef.current) {
    engineRef.current = new AudioEngine();
  }

  useEffect(() => {
    mountedRef.current = true;
    const engine = engineRef.current;

    engine.onPlayEnd = () => {
      if (mountedRef.current) setPlayState('stopped');
    };

    engine.onWorkletReady = (ready) => {
      if (mountedRef.current) {
        setWorkletReady(ready);
        setWorkletLoading(false);
        setWorkletAttempted(true);
        if (!ready) {
          setWarnings(prev => [
            ...prev.filter(w => !w.startsWith('AudioWorklet')),
            'AudioWorklet is not available in this browser. Threshold gating and tinnitus features are disabled. Frequency attenuation is still active.',
          ]);
        }
      }
    };

    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(animFrameRef.current);
      engine.destroy();
    };
  }, []);

  // ── rAF loop for elapsed time + limiter polling ────────────────────────────

  useEffect(() => {
    const tick = () => {
      if (!mountedRef.current) return;
      const engine = engineRef.current;

      if (engine.isPlaying) {
          setElapsed(engine.elapsed);
        }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  // ── loadFile ───────────────────────────────────────────────────────────────

  const loadFile = useCallback(async (file) => {
    if (!file) return;
    const engine = engineRef.current;

    // Client-side validation before touching the engine
    const validationError = AudioEngine.validateFile(file);
    if (validationError) {
      // Categorise the error type
      if (validationError.includes('large')) {
        setErrors(e => ({ ...e, size: validationError }));
      } else {
        setErrors(e => ({ ...e, format: validationError }));
      }
      return;
    }

    setErrors({ decode: null, format: null, size: null, context: null });
    setPlayState('loading');

    try {
      if (!AudioEngine.isSupported()) {
        throw new Error('Web Audio API is not supported in this browser.');
      }
      await engine.ensureRunning();
      const buffer = await engine.loadFile(file);
      if (!buffer) return; // decode was superseded by a newer load

      if (!mountedRef.current) return;

      // Warn about low sample rate files
      if (buffer.sampleRate < 16000) {
        setWarnings(prev => [
          ...prev.filter(w => !w.startsWith('Low sample rate')),
          `Low sample rate (${buffer.sampleRate} Hz). The 8 kHz audiogram band may behave unexpectedly.`,
        ]);
      }

      // Warn about multichannel files silently downmixed by Safari
      if (file.name.match(/\.(wav|flac)$/i) && buffer.numberOfChannels > 2) {
        setWarnings(prev => [
          ...prev.filter(w => !w.includes('multichannel')),
          'Multichannel audio was downmixed to stereo.',
        ]);
      }

      setFileInfo({
        name:       displayFileName(file.name),
        duration:   buffer.duration,
        sampleRate: buffer.sampleRate,
        channels:   buffer.numberOfChannels,
      });
      setPlayState('stopped');
    } catch (err) {
      if (!mountedRef.current) return;
      if (err.message.includes('Web Audio')) {
        setErrors(e => ({ ...e, context: err.message }));
      } else {
        setErrors(e => ({ ...e, decode: err.message }));
      }
      setPlayState('stopped');
    }
  }, []);

  // ── Playback controls ──────────────────────────────────────────────────────

  const startPlay = useCallback((profile, overrides = {}) => {
    const engine = engineRef.current;
    if (!engine.buffer) return;
    engine.startPlay(profile, overrides);
    setPlayState('playing');
    setElapsed(0);
  }, []);

  const stop = useCallback(() => {
    engineRef.current.stop();
    setPlayState('stopped');
  }, []);

  const removeFile = useCallback(() => {
    engineRef.current.stop();
    engineRef.current._buffer = null;
    setFileInfo(null);
    setPlayState('stopped');
    setElapsed(0);
  }, []);

  const seek = useCallback((fraction) => {
    engineRef.current.seek(fraction);
  }, []);

  const setVolume = useCallback((percent) => {
    engineRef.current.setVolume(percentToGain(percent));
  }, []);

  const setLooping = useCallback((enabled) => {
    engineRef.current.setLooping(enabled);
  }, []);

  const switchProfile = useCallback((profile, overrides = {}) => {
    engineRef.current.switchProfile(profile, overrides);
  }, []);

  const updateWorkletOverrides = useCallback((overrides) => {
    engineRef.current.updateWorkletOverrides(overrides);
  }, []);

  // ── Error/warning management ───────────────────────────────────────────────

  const clearError = useCallback((key) => {
    setErrors(e => ({ ...e, [key]: null }));
  }, []);

  const clearWarning = useCallback((index) => {
    setWarnings(prev => prev.filter((_, i) => i !== index));
  }, []);

  return {
    engine:        engineRef.current,
    playState,
    elapsed,
    fileInfo,
    workletReady,
    workletLoading,
    workletAttempted,
    errors,
    warnings,
    loadFile,
    startPlay,
    stop,
    removeFile,
    seek,
    setVolume,
    setLooping,
    switchProfile,
    updateWorkletOverrides,
    clearError,
    clearWarning,
  };
}
