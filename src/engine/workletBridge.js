/**
 * engine/workletBridge.js
 *
 * All communication between React state and the AudioWorkletNode instances
 * flows through this module. It is the single authoritative place where:
 *  - Tinnitus UI values are validated before sending
 *  - Messages are sent to both left and right worklet nodes together
 *
 * NEVER call workletNode.port.postMessage() directly from component code.
 * Always use sendWorkletParams() so both ears stay in sync.
 */

import { RETSPL_CORRECTION } from '../constants/frequencies.js';

/**
 * Convert raw dB HL audiogram values to RETSPL-corrected dB SPL thresholds.
 * This is the same correction applied to the BiquadFilter gains — the worklet
 * must use the same scale so threshold gating matches filter attenuation.
 *
 * Without this correction, mild loss profiles gate too aggressively:
 * 10 dB HL at 250 Hz is 0 dB effective SPL loss (25.5 dB RETSPL offset),
 * yet the raw value 10 would gate at linear amplitude 0.316 — cutting speech.
 */
function applyRetsplToThresholds(dBHLValues) {
  return dBHLValues.map((v, i) => Math.max(0, v - RETSPL_CORRECTION[i]));
}

/**
 * Send worklet parameters to both ear nodes.
 * Recruitment, smearing, and fine structure are omitted — removed from UI.
 * The processor receives zeros for those fields and leaves them inert.
 *
 * @param {AudioWorkletNode|null} workletL
 * @param {AudioWorkletNode|null} workletR
 * @param {HearingProfile} profile
 * @param {object} overrides  — tinnitus overrides from user sliders
 */
export function sendWorkletParams(workletL, workletR, profile, overrides = {}) {
  if (!workletL && !workletR) return;

  const pw = profile?.worklet ?? {};
  const pt = pw.tinnitus ?? {};

  // Merge preset tinnitus with any user overrides
  const tinnitus = {
    enabled:   Boolean(overrides.tinnitus?.enabled   ?? pt.enabled),
    frequency: Number(overrides.tinnitus?.frequency  ?? pt.frequency ?? 4000),
    level:     Math.max(0, Math.min(1, Number(overrides.tinnitus?.level ?? pt.level ?? 0))),
  };

  const baseMsg = {
    // Threshold gating — RETSPL-corrected so mild loss doesn't over-gate
    tinnitus,
  };

  const threshL = applyRetsplToThresholds(profile.left  ?? []);
  const threshR = applyRetsplToThresholds(profile.right ?? []);

  if (workletL) {
    workletL.port.postMessage({ ...baseMsg, thresholds: threshL });
  }
  if (workletR) {
    workletR.port.postMessage({ ...baseMsg, thresholds: threshR });
  }
}

// ─── UI label helpers ─────────────────────────────────────────────────────────

export function tinnitusLevelLabel(v) {
  if (v === 0)   return 'Off';
  if (v < 0.2)   return 'Faint';
  if (v < 0.4)   return 'Moderate';
  if (v < 0.7)   return 'Loud';
  return 'Very Loud';
}
