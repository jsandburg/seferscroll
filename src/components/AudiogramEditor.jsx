/**
 * components/AudiogramEditor.jsx
 *
 * Modal overlay for creating and editing custom hearing profiles.
 * Rendered at the page root (like ShareDialog), NOT inline inside a column.
 *
 * EarRow is defined at MODULE LEVEL — never inside a component function.
 * Defining a component inside another component causes React to treat it
 * as a new type on every render, which unmounts and remounts it, destroying
 * input state and potentially crashing the tree with a blank page.
 */

import { THEME } from '../constants/theme.js';
import { FREQUENCIES, FREQ_LABELS } from '../constants/frequencies.js';

// ── Module-level helper components ────────────────────────────────────────────

function EarRow({ profile, ear, label, color, onSetLoss }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: 11, fontFamily: THEME.fontSans,
        fontWeight: 600, color, marginBottom: 10,
      }}>
        {label}
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gap: 8,
      }}>
        {FREQUENCIES.map((f, i) => (
          <div key={f}>
            <div style={{
              fontSize: 9, fontFamily: THEME.fontSans,
              color: THEME.textMuted, textAlign: 'center', marginBottom: 4,
            }}>
              {FREQ_LABELS[i]}
            </div>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={profile[ear][i] === 0 ? '' : profile[ear][i]}
              placeholder="0"
              onChange={e => onSetLoss(ear, i, e.target.value === '' ? '0' : e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: THEME.bgInput,
                border: `1px solid ${profile[ear][i] > 0 ? color : THEME.border}`,
                borderRadius: 3,
                padding: '6px 4px',
                fontSize: 12,
                fontFamily: THEME.fontSans,
                color: profile[ear][i] > 0 ? color : THEME.textMuted,
                textAlign: 'center',
                outline: 'none',
                fontWeight: profile[ear][i] > 0 ? 600 : 400,
                // Hide browser spinner arrows on number inputs
                MozAppearance: 'textfield',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── AudiogramEditor modal ─────────────────────────────────────────────────────

export function AudiogramEditor({
  profile,
  onSetName,
  onSetLoss,
  onMirrorLR,
  onMirrorRL,
  onSave,
  onCancel,
}) {
  if (!profile) return null;

  return (
    /* Backdrop — click outside to cancel */
    <div
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(54,69,79,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 24,
      }}
    >
      <div style={{
        background: '#ffffff',
        border: `1px solid ${THEME.border}`,
        borderRadius: 6,
        boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
        width: '100%',
        maxWidth: 680,
        maxHeight: '90vh',
        overflow: 'auto',
        padding: 28,
      }}>

        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 22,
        }}>
          <div style={{
            fontSize: 15,
            fontFamily: THEME.fontSans,
            fontWeight: 700,
            color: THEME.textPrimary,
          }}>
            Custom Audiogram
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: THEME.textMuted, fontSize: 20, lineHeight: 1, padding: 4,
            }}
          >×</button>
        </div>

        {/* Name */}
        <div style={{ marginBottom: 22 }}>
          <label style={{
            display: 'block',
            fontSize: 11, fontFamily: THEME.fontSans,
            color: THEME.textTertiary, marginBottom: 6,
          }}>
            Profile name
          </label>
          <input
            type="text"
            value={profile.name}
            onChange={e => onSetName(e.target.value)}
            placeholder="e.g. Mom's audiogram"
            autoFocus
            style={{
              width: '100%', boxSizing: 'border-box',
              background: THEME.bgInput,
              border: `1px solid ${THEME.border}`,
              borderRadius: 3, padding: '9px 12px',
              fontSize: 13, fontFamily: THEME.fontSans,
              color: THEME.textPrimary, outline: 'none',
            }}
          />
        </div>

        {/* Instructions */}
        <div style={{
          fontSize: 11, fontFamily: THEME.fontSans,
          color: THEME.textTertiary, marginBottom: 14, lineHeight: 1.5,
        }}>
          Enter the dB values from an existing audiogram.
        </div>

        {/* "Duplicate" button — above the right ear row */}
        <div style={{ marginBottom: 14 }}>
          <button
            type="button"
            onClick={onMirrorRL}
            style={{
              fontSize: 11, fontFamily: THEME.fontSans,
              background: 'none',
              border: `1px solid ${THEME.border}`,
              borderRadius: 3, cursor: 'pointer',
              color: THEME.textTertiary, padding: '6px 14px',
            }}
          >
            Duplicate input data from right ear
          </button>
        </div>

        {/* Right ear — first row */}
        <EarRow
          profile={profile}
          ear="right"
          label="Right Ear  (dB HL)"
          color={THEME.rightEar}
          onSetLoss={onSetLoss}
        />

        {/* "Duplicate from left ear" button — between the rows */}
        <div style={{ marginBottom: 14 }}>
          <button
            type="button"
            onClick={onMirrorLR}
            style={{
              fontSize: 11, fontFamily: THEME.fontSans,
              background: 'none',
              border: `1px solid ${THEME.border}`,
              borderRadius: 3, cursor: 'pointer',
              color: THEME.textTertiary, padding: '6px 14px',
            }}
          >
            Duplicate input data from left ear
          </button>
        </div>

        {/* Left ear — second row */}
        <EarRow
          profile={profile}
          ear="left"
          label="Left Ear  (dB HL)"
          color={THEME.leftEar}
          onSetLoss={onSetLoss}
        />

        {/* Actions */}
        <div style={{
          display: 'flex', gap: 10, justifyContent: 'flex-end',
          marginTop: 8, paddingTop: 20,
          borderTop: `1px solid ${THEME.border}`,
        }}>
          <button type="button"
            onClick={onCancel}
            style={{
              fontSize: 12, fontFamily: THEME.fontSans,
              background: 'none',
              border: `1px solid ${THEME.border}`,
              borderRadius: 3, cursor: 'pointer',
              color: THEME.textSecondary, padding: '9px 20px',
            }}
          >
            Cancel
          </button>
          <button type="button"
            onClick={onSave}
            disabled={!profile.name.trim()}
            style={{
              fontSize: 12, fontFamily: THEME.fontSans, fontWeight: 600,
              background: profile.name.trim() ? THEME.custom : THEME.bgCardHover,
              border: `1px solid ${profile.name.trim() ? THEME.custom : THEME.border}`,
              borderRadius: 3,
              cursor: profile.name.trim() ? 'pointer' : 'not-allowed',
              color: profile.name.trim() ? '#ffffff' : THEME.textMuted,
              padding: '9px 20px',
            }}
          >
            Save Audiogram
          </button>
        </div>

      </div>
    </div>
  );
}
