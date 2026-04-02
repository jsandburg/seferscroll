/**
 * utils/presetUrlEncoding.js
 *
 * Encode a HearingProfile into a URL-safe Base64 string, and decode it back.
 * Used for the preset-only share flow: /?p=<encoded>
 *
 * v1 format (current):
 *   - Compact JSON with short field names
 *   - URL-safe Base64 (RFC 4648): + → -, / → _, no padding, no encodeURIComponent
 *   - flL / flR omitted (always null; decoder already handles missing fields)
 *
 * Backward compatibility:
 *   The decoder handles both old links (standard Base64 via encodeURIComponent)
 *   and new links (URL-safe Base64). It runs decodeURIComponent first (harmless
 *   on new links), then normalises - / _ back to + / / before atob. Old links
 *   that contain + or / in the encoded string decode correctly because those
 *   characters were percent-encoded in the URL and are restored by
 *   decodeURIComponent before the normalisation step touches them.
 *
 * URL length: ~220–302 chars for a full profile with 20-char name.
 * Previous format was ~252–338 chars (30–36 chars shorter now).
 */

const CURRENT_VERSION = 1;
const MAX_NAME_LENGTH = 60;

/**
 * Encode a HearingProfile into a URL-safe Base64 string (no encodeURIComponent).
 * @param {HearingProfile} profile
 * @returns {string}  URL-safe Base64 string
 */
export function encodePresetToUrl(profile) {
  const payload = {
    v:    CURRENT_VERSION,
    n:    (profile.name ?? 'Shared Profile').slice(0, MAX_NAME_LENGTH),
    l:    Array.from(profile.left).map(v => Math.round(Math.max(0, Math.min(120, v)))),
    r:    Array.from(profile.right).map(v => Math.round(Math.max(0, Math.min(120, v)))),
    cat:  profile.category ?? 'sensorineural',
    cond: profile.isConductive ? 1 : 0,
    // flL / flR intentionally omitted — always null; decoder defaults missing to null
    wk: {
      ten: profile.worklet?.tinnitus?.enabled   ? 1 : 0,
      tF:  Math.round(profile.worklet?.tinnitus?.frequency ?? 4000),
      tL:  +((profile.worklet?.tinnitus?.level  ?? 0.15).toFixed(3)),
    },
  };

  try {
    const json    = JSON.stringify(payload);
    const bytes   = new TextEncoder().encode(json);
    let binaryStr = '';
    for (let i = 0; i < bytes.length; i++) binaryStr += String.fromCharCode(bytes[i]);
    // URL-safe Base64: replace + with -, / with _, strip = padding
    const b64 = btoa(binaryStr)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    // No encodeURIComponent — URL-safe chars only
    return b64;
  } catch (err) {
    console.error('[presetUrlEncoding] encode failed:', err);
    return '';
  }
}

/**
 * Decode a URL parameter value back into a HearingProfile.
 * Handles both old format (standard Base64 via encodeURIComponent) and
 * new format (URL-safe Base64, no percent-encoding).
 * Returns null if the string is missing, malformed, or version-incompatible.
 *
 * @param {string} encoded  The raw value of the ?p= query parameter
 * @returns {HearingProfile|null}
 */
export function decodePresetFromUrl(encoded) {
  if (!encoded) return null;

  let payload;
  try {
    // Step 1: decodeURIComponent handles old links that used encodeURIComponent.
    //         New links have no percent-encoding so this is a no-op for them.
    const afterPct = decodeURIComponent(encoded);

    // Step 2: normalise URL-safe Base64 chars back to standard Base64.
    //         Old links: no - or _ present, so this is a no-op for them.
    //         New links: restores - → + and _ → /.
    const b64 = afterPct
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      + '=='.slice((afterPct.replace(/-/g,'+').replace(/_/g,'/').length % 4) || 4);

    // Step 3: standard atob → bytes → UTF-8
    const raw   = atob(b64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    const json  = new TextDecoder().decode(bytes);
    payload     = JSON.parse(json);
  } catch {
    return null;
  }

  // Version check — must equal 1 (only version that exists)
  if (payload.v !== CURRENT_VERSION) return null;

  // Validate required arrays
  if (!Array.isArray(payload.l) || payload.l.length !== 8) return null;
  if (!Array.isArray(payload.r) || payload.r.length !== 8) return null;

  const clamp   = (v, lo, hi) => Math.max(lo, Math.min(hi, Number(v) || 0));
  const clamp01 = (v) => clamp(v, 0, 1);

  const left  = payload.l.map(v => clamp(v, 0, 120));
  const right = payload.r.map(v => clamp(v, 0, 120));

  return {
    id:           `custom_${Date.now()}`,
    name:         typeof payload.n === 'string'
                    ? payload.n.slice(0, MAX_NAME_LENGTH) || 'Shared Profile'
                    : 'Shared Profile',
    isCustom:     true,
    left,
    right,
    isSymmetric:  left.every((v, i) => v === right[i]),
    category:     typeof payload.cat === 'string' ? payload.cat : 'sensorineural',
    bypass:       false,
    isConductive: payload.cond === 1,
    // flL / flR were never non-null; missing from new payloads → null safely
    flatAttenuationL: payload.flL != null ? clamp(payload.flL, 0, 120) : null,
    flatAttenuationR: payload.flR != null ? clamp(payload.flR, 0, 120) : null,
    color:        '#36454f',
    colorRight:   null,
    desc:         'Shared hearing profile.',
    worklet: {
      tinnitus: {
        enabled:   payload.wk?.ten === 1,
        frequency: clamp(payload.wk?.tF ?? 4000, 500, 12000),
        level:     clamp01(payload.wk?.tL ?? 0.15),
      },
    },
  };
}

/**
 * Build the full shareable URL for a profile-only share.
 */
export function buildPresetShareUrl(profile) {
  // Built-in profiles: use the short, readable ?preset=<id> form.
  // Custom profiles: encode full data into ?p=<base64> since they aren't in the bundle.
  if (!profile.isCustom && profile.id) {
    return `${window.location.origin}/?preset=${encodeURIComponent(profile.id)}`;
  }

  const encoded = encodePresetToUrl(profile);
  if (!encoded) return null;
  return `${window.location.origin}/?p=${encoded}`;
}
