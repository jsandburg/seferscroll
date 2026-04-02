/**
 * components/WorkletControls.jsx
 * Tinnitus simulation controls — always visible, sliders always shown.
 * "Tinnitus" label uses textPrimary to match other section titles.
 */

import { THEME } from '../constants/theme.js';
import { tinnitusLevelLabel } from '../engine/workletBridge.js';

export function WorkletControls({ effective, onSetTinnitus, hasFile }) {
  const tinnitus = effective.tinnitus;

  return (
    <div style={{ marginTop: 16 }}>
      {/* Header row: label + checkbox (no On/Off text) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: tinnitus.enabled ? 12 : 0,
      }}>
        <span style={{
          fontSize: 10, fontFamily: THEME.fontSans, fontWeight: 600,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: THEME.textPrimary,
        }}>
          Tinnitus
        </span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={tinnitus.enabled}
            onChange={e => onSetTinnitus({ ...tinnitus, enabled: e.target.checked })}
            style={{ accentColor: THEME.info, cursor: 'pointer', width: 13, height: 13 }}
          />
        </label>
      </div>

      {tinnitus.enabled && (
        <div>
          {/* Warning */}
          {!hasFile ? (
            <div style={{
              padding: '6px 10px',
              background: 'rgba(183,119,13,0.06)',
              border: `1px solid rgba(183,119,13,0.2)`,
              borderRadius: 3,
              fontSize: 10, fontFamily: THEME.fontSans, color: THEME.warning,
              marginBottom: 12,
            }}>
              ⚠ Upload a file to hear this effect.
            </div>
          ) : (
            <div style={{
              padding: '6px 10px',
              background: 'rgba(183,119,13,0.06)',
              border: `1px solid rgba(183,119,13,0.2)`,
              borderRadius: 3,
              fontSize: 10, fontFamily: THEME.fontSans, color: THEME.warning,
              marginBottom: 12,
            }}>
              ⚠ You will hear a tone through your speakers or headphones.
            </div>
          )}

          {/* Pitch */}
          <div style={{ marginBottom: 10 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 10, fontFamily: THEME.fontSans, color: THEME.textSecondary,
              marginBottom: 4,
            }}>
              <span>Pitch</span>
              <span style={{ color: THEME.textTertiary }}>{Math.round(tinnitus.frequency).toLocaleString()} Hz</span>
            </div>
            <input
              type="range" min={500} max={12000} step={50}
              value={tinnitus.frequency}
              onChange={e => onSetTinnitus({ ...tinnitus, frequency: parseInt(e.target.value) })}
              style={{ width: '100%', accentColor: THEME.info, cursor: 'pointer' }}
            />
          </div>

          {/* Loudness */}
          <div style={{ marginBottom: 0 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 10, fontFamily: THEME.fontSans, color: THEME.textSecondary,
              marginBottom: 4,
            }}>
              <span>Loudness</span>
              <span style={{ color: THEME.textTertiary }}>{tinnitusLevelLabel(tinnitus.level)}</span>
            </div>
            <input
              type="range" min={0} max={1} step={0.01}
              value={tinnitus.level}
              onChange={e => onSetTinnitus({ ...tinnitus, level: parseFloat(e.target.value) })}
              style={{ width: '100%', accentColor: THEME.info, cursor: 'pointer' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
