/**
 * components/SmallComponents.jsx
 * Small single-purpose components that don't warrant their own files.
 */

import React from 'react';
import { THEME } from '../constants/theme.js';

// ─── Header ───────────────────────────────────────────────────────────────────

export function Header() {
  return (
    <header style={{
      borderBottom: `1px solid ${THEME.border}`,
      background: '#ffffff',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '18px 32px 16px' }}>
        <h1 style={{
          margin: 0,
          fontSize: 17,
          fontFamily: THEME.fontSans,
          fontWeight: 700,
          color: THEME.textPrimary,
          letterSpacing: '-0.01em',
        }}>
          Hearing Loss Simulator
        </h1>
      </div>
    </header>
  );
}

// ─── ErrorBanner ──────────────────────────────────────────────────────────────

export function ErrorBanner({ errors, onClear }) {
  const activeErrors = Object.entries(errors).filter(([, v]) => v);
  if (activeErrors.length === 0) return null;

  return (
    <div style={{ padding: '0 24px' }}>
      {activeErrors.map(([key, msg]) => (
        <div key={key} style={{
          background: 'rgba(239,68,68,0.08)',
          border: `1px solid rgba(239,68,68,0.3)`,
          borderRadius: 4,
          padding: '10px 14px',
          marginBottom: 8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}>
          <span style={{ fontSize: 11, fontFamily: THEME.fontSans, color: THEME.error, lineHeight: 1.5 }}>
            ✕ {msg}
          </span>
          <button type="button"
            onClick={() => onClear(key)}
            aria-label="Dismiss error"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: THEME.error, fontSize: 14, padding: 0, lineHeight: 1,
              flexShrink: 0,
            }}
          >×</button>
        </div>
      ))}
    </div>
  );
}

// ─── WarningBar ───────────────────────────────────────────────────────────────

export function WarningBar({ warnings, onClear }) {
  if (!warnings || warnings.length === 0) return null;

  return (
    <div style={{ padding: '0 24px' }}>
      {warnings.map((msg, i) => (
        <div key={i} style={{
          background: 'rgba(245,158,11,0.06)',
          border: `1px solid rgba(245,158,11,0.25)`,
          borderRadius: 4,
          padding: '9px 14px',
          marginBottom: 8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}>
          <span style={{ fontSize: 11, fontFamily: THEME.fontSans, color: THEME.warning, lineHeight: 1.5 }}>
            ⚠ {msg}
          </span>
          <button type="button"
            onClick={() => onClear(i)}
            aria-label="Dismiss warning"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: THEME.warning, fontSize: 14, padding: 0, lineHeight: 1,
              flexShrink: 0,
            }}
          >×</button>
        </div>
      ))}
    </div>
  );
}

// ─── SharedProfileBanner ──────────────────────────────────────────────────────

export function SharedProfileBanner({ profile, onDismiss, onScrollToUploader, onSave }) {
  if (!profile) return null;

  const [saved, setSaved] = React.useState(false);

  const handleSave = () => {
    onSave?.();
    setSaved(true);
  };

  const lossAvg = Math.round(
    [...profile.left, ...profile.right].reduce((a, b) => a + b, 0) / 16
  );
  const severity =
    lossAvg < 20  ? 'Normal' :
    lossAvg < 40  ? 'Mild' :
    lossAvg < 55  ? 'Moderate' :
    lossAvg < 70  ? 'Moderate-severe' :
    lossAvg < 90  ? 'Severe' : 'Profound';

  return (
    <div style={{
      margin: '16px 24px 0',
      padding: '12px 16px',
      background: 'rgba(54,69,79,0.05)',
      border: `1px solid rgba(54,69,79,0.18)`,
      borderRadius: 4,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    }}>
      <div>
        <div style={{ fontSize: 11, fontFamily: THEME.fontSans, color: THEME.textPrimary, marginBottom: 3 }}>
          Shared hearing profile: <strong>{profile.name}</strong>
        </div>
        <div style={{ fontSize: 10, fontFamily: THEME.fontSans, color: THEME.textSecondary, marginBottom: 6 }}>
          {severity} {profile.isConductive ? 'conductive' : 'sensorineural'} loss
          {!profile.left.every((v, i) => v === profile.right[i]) ? ' · Asymmetric' : ''}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button type="button"
            onClick={onScrollToUploader}
            style={{
              background: 'rgba(54,69,79,0.08)',
              border: `1px solid rgba(54,69,79,0.22)`,
              borderRadius: 3, cursor: 'pointer',
              color: THEME.info, fontSize: 10, fontFamily: THEME.fontSans,
              padding: '5px 10px',
            }}
          >
            Upload audio to experience this profile →
          </button>
          {onSave && (
            <button type="button"
              onClick={handleSave}
              disabled={saved}
              style={{
                background: saved ? 'rgba(42,122,74,0.08)' : 'rgba(54,69,79,0.08)',
                border: `1px solid ${saved ? 'rgba(42,122,74,0.3)' : 'rgba(54,69,79,0.22)'}`,
                borderRadius: 3,
                cursor: saved ? 'default' : 'pointer',
                color: saved ? THEME.success : THEME.info,
                fontSize: 10, fontFamily: THEME.fontSans,
                padding: '5px 10px',
                transition: 'all 0.15s',
              }}
            >
              {saved ? '✓ Saved to my profiles' : 'Save to my profiles'}
            </button>
          )}
        </div>
      </div>
      <button type="button"
        onClick={onDismiss}
        aria-label="Dismiss shared profile banner"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: THEME.textTertiary, fontSize: 16, padding: 0, lineHeight: 1,
          flexShrink: 0,
        }}
      >×</button>
    </div>
  );
}

