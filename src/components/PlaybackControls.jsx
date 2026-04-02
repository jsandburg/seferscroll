/**
 * components/PlaybackControls.jsx
 */

import { useRef } from 'react';
import { THEME } from '../constants/theme.js';
import { formatDuration } from '../utils/fileValidation.js';

export function PlaybackControls({
  playState,
  elapsed,
  duration,
  volume,
  loopEnabled,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onLoopToggle,
  hasAudio,
  accentColor,
}) {
  const accent      = accentColor ?? THEME.info;
  const isPlaying   = playState === 'playing';
  const isLoading   = playState === 'loading';
  const progress    = duration > 0 ? elapsed / duration : 0;
  const progressRef = useRef(null);
  const inactive    = !hasAudio || isLoading;

  const handleProgressClick = (e) => {
    if (!hasAudio || !progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    onSeek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
  };

  return (
    <div>

      {/* Seek bar — 24px hit area over 3px visual track */}
      <div
        ref={progressRef}
        onClick={handleProgressClick}
        role="slider"
        aria-label="Playback position"
        aria-valuenow={Math.round(elapsed)}
        aria-valuemax={Math.round(duration ?? 0)}
        aria-valuemin={0}
        style={{
          height: 24,
          display: 'flex',
          alignItems: 'center',
          cursor: hasAudio ? 'pointer' : 'default',
        }}
      >
        <div style={{
          width: '100%',
          height: 3,
          background: inactive ? THEME.border : `${accent}30`,
          borderRadius: 2,
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            left: 0, top: 0, bottom: 0,
            width: `${progress * 100}%`,
            background: inactive ? THEME.border : accent,
            borderRadius: 2,
            transition: 'width 0.1s linear',
          }} />
        </div>
      </div>

      {/* Time */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 10,
        fontFamily: THEME.fontSans,
        color: THEME.textSecondary,
        marginBottom: 14,
      }}>
        <span>{hasAudio ? formatDuration(elapsed) : '0:00'}</span>
        <span>{duration ? formatDuration(duration) : '--:--'}</span>
      </div>

      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

        {/* Play / Stop */}
        <button
          type="button"
          onClick={onTogglePlay}
          disabled={inactive}
          aria-label={isPlaying ? 'Stop' : 'Play'}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            flexShrink: 0,
            background: inactive ? THEME.bgCardHover : accent,
            border: 'none',
            color: inactive ? THEME.textSecondary : '#ffffff',
            cursor: inactive ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            transition: 'all 0.15s',
            boxShadow: inactive ? 'none' : `0 2px 10px ${accent}40`,
          }}
        >
          {isLoading
            ? <span style={{ fontSize: 11 }}>…</span>
            : isPlaying
              ? '■'
              : <span style={{ marginLeft: 3 }}>▶</span>
          }
        </button>

        {/* Volume */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          opacity: inactive ? 0.4 : 1,
          transition: 'opacity 0.15s',
        }}>
          <span style={{
            fontSize: 10, fontFamily: THEME.fontSans,
            color: THEME.textPrimary, flexShrink: 0, userSelect: 'none',
          }}>
            Vol
          </span>
          <input
            type="range"
            min={0} max={100} step={1}
            value={volume}
            onChange={e => onVolumeChange(parseInt(e.target.value))}
            aria-label="Volume"
            disabled={inactive}
            style={{ flex: 1, accentColor: accent, cursor: inactive ? 'not-allowed' : 'pointer' }}
          />
          <span style={{
            fontSize: 10, fontFamily: THEME.fontSans,
            color: THEME.textPrimary, width: 28, textAlign: 'right', flexShrink: 0,
          }}>
            {volume}%
          </span>
        </div>

        {/* Loop — labelled text button */}
        <button
          type="button"
          onClick={onLoopToggle}
          aria-pressed={loopEnabled}
          title={loopEnabled ? 'Loop is on — click to turn off' : 'Loop is off — click to turn on'}
          style={{
            background: loopEnabled ? `${accent}12` : 'none',
            border: `1px solid ${loopEnabled ? accent : THEME.textSecondary}`,
            borderRadius: 3,
            cursor: 'pointer',
            padding: '4px 10px',
            fontSize: 10,
            fontFamily: THEME.fontSans,
            color: loopEnabled ? accent : THEME.textPrimary,
            opacity: inactive ? 0.4 : 1,
            transition: 'all 0.15s',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          Loop {loopEnabled ? 'on' : 'off'}
        </button>

      </div>


    </div>
  );
}
