/**
 * components/PresetDescription.jsx
 * Profile name and description — rendered flat.
 * When tinnitus is active, a brief explanation is appended.
 */

import { THEME } from '../constants/theme.js';

export function PresetDescription({ profile, workletReady, workletAttempted, effectiveTinnitus }) {
  if (!profile) return null;

  // Tinnitus is "active" when the worklet is ready AND the user has it enabled
  const tinnitusActive =
    workletAttempted && workletReady && effectiveTinnitus?.enabled;

  return (
    <div style={{
      background: THEME.bgCardHover,
      borderRadius: 4,
      padding: '16px 20px',
    }}>

      <div style={{
        fontSize: 12,
        fontFamily: THEME.fontSans,
        fontWeight: 600,
        color: THEME.textPrimary,
        marginBottom: 6,
      }}>
        {profile.name}
        {tinnitusActive && (
          <span style={{
            marginLeft: 8,
            fontSize: 9,
            fontFamily: THEME.fontSans,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: THEME.worklet,
            background: `${THEME.worklet}15`,
            border: `1px solid ${THEME.worklet}40`,
            borderRadius: 2,
            padding: '2px 6px',
            verticalAlign: 'middle',
          }}>
            Tinnitus
          </span>
        )}
      </div>

      <div style={{
        fontSize: 11,
        fontFamily: THEME.fontSans,
        color: THEME.textSecondary,
        lineHeight: 1.65,
        marginBottom: tinnitusActive ? 8 : 0,
      }}>
        {profile.desc}
      </div>

      {/* Tinnitus explanation — shown only when tinnitus is active */}
      {tinnitusActive && (
        <div style={{
          fontSize: 11,
          fontFamily: THEME.fontSans,
          color: THEME.textSecondary,
          lineHeight: 1.65,
          borderTop: `1px solid ${THEME.border}`,
          paddingTop: 8,
        }}>
          <span style={{ fontWeight: 600 }}>Tinnitus</span> is a
          persistent ringing, buzzing, or tonal sound perceived in the ears even without an
          external source. It is frequently associated with hearing loss and can partially mask
          real sounds near its pitch. The simulated tone you hear represents what many people
          with this type of hearing loss experience continuously.
        </div>
      )}
    </div>
  );
}
