/**
 * components/AboutSection.jsx
 *
 * Always-visible description shown below the header.
 * Plain-language explanation of what the simulator models.
 */

import { THEME } from '../constants/theme.js';

export function AboutSection({ workletAttempted, workletReady }) {
  return (
    <div style={{
      borderBottom: `1px solid ${THEME.border}`,
      background: THEME.bg,
    }}>
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 32px 24px' }}>

      <p style={{
        fontSize: 13,
        fontFamily: THEME.fontSans,
        color: THEME.textSecondary,
        lineHeight: 1.7,
        marginBottom: 16,
      }}>
        This tool lets you hear what it's like to have a specific kind of hearing loss.
        Choose a hearing profile, upload a voice recording or piece of music, and press
        play. The audio is processed in real time to approximate how someone with that
        profile actually perceives sound — not just quieter, but altered in the ways
        that matter.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px 24px',
      }}>
        <Feature
          title="Frequency loss"
          body="Each profile is drawn from a real audiogram — the graph audiologists use to map which pitches a person can and can't hear. The simulation applies those exact thresholds to your audio."
        />
        <Feature
          title="Threshold effects"
          body="Real hearing loss isn't just volume. Sounds below the hearing threshold disappear entirely rather than fading. This is what makes the simulation feel accurate rather than like a muffler."
        />
        <Feature
          title="Tinnitus"
          body="The persistent ringing many people with hearing loss also experience. It partially masks real sounds near its pitch. Enable it under any profile using the tinnitus controls."
        />
      </div>

      {workletAttempted && !workletReady && (
        <div style={{
          marginTop: 14,
          padding: '8px 12px',
          background: 'rgba(183,119,13,0.06)',
          border: `1px solid rgba(183,119,13,0.2)`,
          borderRadius: 3,
          fontSize: 11,
          fontFamily: THEME.fontSans,
          color: THEME.warning,
        }}>
          Advanced threshold and tinnitus features are not available in this browser.
          Basic frequency simulation still works.
        </div>
      )}
    </div>
    </div>
  );
}

function Feature({ title, body }) {
  return (
    <div>
      <div style={{
        fontSize: 11,
        fontFamily: THEME.fontSans,
        fontWeight: 600,
        color: THEME.textPrimary,
        marginBottom: 3,
      }}>
        {title}
      </div>
      <div style={{
        fontSize: 11,
        fontFamily: THEME.fontSans,
        color: THEME.textSecondary,
        lineHeight: 1.6,
      }}>
        {body}
      </div>
    </div>
  );
}
