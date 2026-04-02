/**
 * utils/volumeCurve.js
 * Maps a 0–100 UI percentage to a 0–1 linear gain value using an
 * exponential curve that feels natural to human perception.
 *
 * Linear sliders feel wrong for volume because our perception of loudness
 * is logarithmic. This curve places 50% of the slider at roughly -20 dB
 * of gain (0.1 linear), which matches how most audio UIs behave.
 */

/**
 * @param {number} percent  0–100
 * @returns {number}        0–1 linear gain
 */
export function percentToGain(percent) {
  if (percent <= 0)   return 0;
  if (percent >= 100) return 1;
  // x^3 curve: 50% → ~0.125, 75% → ~0.42, 100% → 1.0
  const x = percent / 100;
  return x * x * x;
}
