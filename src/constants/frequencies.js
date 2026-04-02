/**
 * constants/frequencies.js
 * All DSP constants for the hearing loss simulator.
 * Centralised here so AudioEngine, buildFilterChain, and the worklet bridge
 * all reference the same values.
 */

export const FREQUENCIES = [250, 500, 1000, 2000, 3000, 4000, 6000, 8000];
export const FREQ_LABELS  = ['250', '500', '1k', '2k', '3k', '4k', '6k', '8k'];

/**
 * Per-band Q values for the BiquadFilterNode peaking EQ chain.
 * Calculated so each filter's -3dB bandwidth spans from the geometric midpoint
 * to its left neighbour to the geometric midpoint to its right neighbour.
 * Prevents the overlap/gap problem caused by using a flat Q across all bands.
 *
 * Band  | Centre | Bandwidth | Q
 *  0    |  250   |  177 Hz   | 1.41
 *  1    |  500   |  353 Hz   | 1.42
 *  2    | 1000   |  707 Hz   | 1.41
 *  3    | 2000   | 1035 Hz   | 1.93
 *  4    | 3000   | 1015 Hz   | 2.96
 *  5    | 4000   | 1435 Hz   | 2.79
 *  6    | 6000   | 2029 Hz   | 2.96
 *  7    | 8000   | 2072 Hz   | 3.86
 */
export const FILTER_Q = [1.41, 1.42, 1.41, 1.93, 2.96, 2.79, 2.96, 3.86];

/**
 * Reference Equivalent Threshold Sound Pressure Levels (RETSPL) from ISO 389-7.
 * Converts audiogram dB HL values to actual dB SPL attenuation values
 * that the peaking EQ filters should apply.
 *
 * effectiveAttenuation[i] = max(0, loss[i] - RETSPL_CORRECTION[i])
 */
export const RETSPL_CORRECTION = [25.5, 11.5, 7.0, 9.0, 11.5, 12.0, 16.0, 15.5];

/**
 * Maximum attenuation we apply per band. Caps at 40 dB to ensure all profiles
 * remain audible. Beyond 40 dB a band is at ≤1% of its original level — clearly
 * impaired but still perceptible. Higher values (as occur in severe profiles)
 * produce complete silence in a digital simulation, which is not educational.
 */
export const MAX_ATTENUATION = 40;

/**
 * Audiogram Y-axis range (dB HL).
 * Clinical audiograms typically show -10 to 120 dB HL.
 */
export const DB_MIN = -10;
export const DB_MAX = 120;

/** Maximum file size for audio uploads: 25 MB */
export const MAX_FILE_SIZE = 25 * 1024 * 1024;

/** Accepted audio file extensions */
export const AUDIO_EXTENSIONS = new Set([
  'mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'webm', 'opus', 'wma',
]);

/** Accepted MIME types for file validation */
export const AUDIO_MIME_TYPES = new Set([
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav',
  'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/x-aac',
  'audio/flac', 'audio/x-flac', 'audio/webm', 'audio/opus',
]);

/**
 * Compute the effective Q for a given band at a given loss level.
 * Higher loss → broader critical band → lower Q (more spectral smearing).
 * This models reduced frequency selectivity in damaged cochleae.
 *
 * At 0 dB loss: Q = FILTER_Q[bandIndex] (normal)
 * At 60 dB loss: Q ≈ FILTER_Q[bandIndex] / 3  (3× broader band)
 */
export function getEffectiveQ(bandIndex, lossDb) {
  if (lossDb <= 0) return FILTER_Q[bandIndex];
  const broadeningFactor = 1 + (Math.min(lossDb, 60) / 30);
  return FILTER_Q[bandIndex] / broadeningFactor;
}

