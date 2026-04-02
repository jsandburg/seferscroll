/**
 * components/AttenuationBars.jsx
 * Per-band signal attenuation bars.
 * Shows the effective dB reduction applied at each audiogram frequency
 * after RETSPL correction (i.e. what the simulation actually does to the audio).
 */

import { FREQUENCIES, FREQ_LABELS, RETSPL_CORRECTION, MAX_ATTENUATION } from '../constants/frequencies.js';
import { THEME } from '../constants/theme.js';

function Bar({ label, correctedDb, color }) {
  const pct = Math.min(100, (correctedDb / MAX_ATTENUATION) * 100);
  const hasLoss = correctedDb > 0;

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {/* Frequency label */}
      <div style={{
        fontSize: 9, fontFamily: THEME.fontSans,
        color: THEME.textSecondary,
        textAlign: 'center', marginBottom: 3,
      }}>
        {label}
      </div>

      {/* Bar */}
      <div style={{
        height: 52,
        background: THEME.bgCard,
        border: `1px solid ${THEME.border}`,
        borderRadius: 2,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: `${pct}%`,
          background: hasLoss ? `${color}55` : 'transparent',
          transition: 'height 0.2s',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            fontSize: 9, fontFamily: THEME.fontSans, fontWeight: hasLoss ? 600 : 400,
            color: hasLoss ? color : THEME.textTertiary,
          }}>
            {hasLoss ? `−${Math.round(correctedDb)}` : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}

export function AttenuationBars({ profile }) {
  if (!profile || profile.bypass) return null;

  const corrected = (arr) =>
    arr.map((v, i) => Math.min(MAX_ATTENUATION, Math.max(0, v - RETSPL_CORRECTION[i])));

  const corrL = corrected(profile.left);
  const corrR = corrected(profile.right);

  // Always use ISO 8253-1 clinical colors — same as the audiogram
  const leftColor  = THEME.leftEar;
  const rightColor = THEME.rightEar;

  return (
    <div style={{ padding: '12px 24px 16px' }}>
      <div style={{
        fontSize: 9, fontFamily: THEME.fontSans,
        color: THEME.textSecondary,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        marginBottom: 8,
      }}>
        Signal attenuation (dB)
      </div>

      {/* Right ear — first row, always shown */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 10 }}>
        {FREQUENCIES.map((f, i) => (
          <Bar key={`R${f}`} label={FREQ_LABELS[i]} correctedDb={corrR[i]} color={rightColor} />
        ))}
      </div>

      {/* Left ear — second row, always shown */}
      <div style={{ display: 'flex', gap: 3 }}>
        {FREQUENCIES.map((f, i) => (
          <Bar key={`L${f}`} label={FREQ_LABELS[i]} correctedDb={corrL[i]} color={leftColor} />
        ))}
      </div>
    </div>
  );
}
