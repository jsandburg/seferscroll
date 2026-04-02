/**
 * utils/fileValidation.js
 * File display helpers.
 * Note: file validation lives in AudioEngine.validateFile() — do not duplicate here.
 */

/**
 * Truncate and sanitise a filename for display.
 * Keeps extension visible, truncates the stem if > 40 chars total.
 */
export function displayFileName(name) {
  if (!name) return '';
  const base = name.split(/[/\\]/).pop() ?? name;
  if (base.length <= 40) return base;

  const dotIdx = base.lastIndexOf('.');
  if (dotIdx === -1) return base.slice(0, 37) + '…';

  const ext  = base.slice(dotIdx);           // e.g. ".mp3"
  const stem = base.slice(0, dotIdx);
  const maxStem = 36 - ext.length;
  return stem.slice(0, maxStem) + '…' + ext;
}

/**
 * Format a duration in seconds as m:ss.
 */
export function formatDuration(seconds) {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
