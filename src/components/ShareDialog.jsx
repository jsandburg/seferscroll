/**
 * components/ShareDialog.jsx
 * Profile-only share modal — encodes the full hearing profile into a URL.
 * No backend, no audio upload. Link is permanent by construction.
 *
 * Tabs:
 *   Link   — copy-to-clipboard URL field (existing behaviour)
 *   QR Code — QR code image generated client-side via the `qrcode` npm package
 *
 * QR code is generated asynchronously using QRCode.toDataURL(). The result is
 * a PNG data URL dropped into an <img> tag. No server or third-party API needed.
 */

import { useState, useEffect, useRef } from 'react';
import { THEME } from '../constants/theme.js';
import { buildPresetShareUrl } from '../utils/presetUrlEncoding.js';

// ── Copy field ────────────────────────────────────────────────────────────────

function CopyField({ url }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.querySelector('#share-url-input');
      el?.select();
    }
  };

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <input
        id="share-url-input"
        type="text"
        readOnly
        value={url}
        style={{
          flex: 1,
          background: THEME.bgInput,
          border: `1px solid ${THEME.border}`,
          borderRadius: 3,
          padding: '7px 10px',
          fontSize: 10,
          fontFamily: THEME.fontSans,
          color: THEME.textPrimary,
          outline: 'none',
          minWidth: 0,
        }}
        onFocus={e => e.target.select()}
      />
      <button
        type="button"
        onClick={handleCopy}
        style={{
          background: copied ? THEME.info : THEME.bgCard,
          border: `1px solid ${copied ? THEME.info : THEME.border}`,
          borderRadius: 3,
          cursor: 'pointer',
          fontSize: 10,
          fontFamily: THEME.fontSans,
          color: copied ? '#ffffff' : THEME.textSecondary,
          padding: '7px 12px',
          flexShrink: 0,
          transition: 'all 0.15s',
        }}
      >
        {copied ? '✓ Copied' : 'Copy'}
      </button>
    </div>
  );
}

// ── QR Code panel ─────────────────────────────────────────────────────────────

function QrPanel({ url }) {
  const [dataUrl, setDataUrl] = useState(null);
  const [error,   setError]   = useState(false);
  // Keep a ref to the current generation request so stale results are discarded
  const reqRef = useRef(0);

  useEffect(() => {
    if (!url) return;
    setDataUrl(null);
    setError(false);

    const id = ++reqRef.current;

    // Dynamic import so the qrcode library is only loaded when this tab is opened
    import('qrcode').then(({ default: QRCode }) => {
      return QRCode.toDataURL(url, {
        width:          220,
        margin:         2,
        color: {
          dark:  '#36454f',   // charcoal — matches app primary text
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      });
    }).then(du => {
      if (id !== reqRef.current) return;  // discard stale result
      setDataUrl(du);
    }).catch(() => {
      if (id !== reqRef.current) return;
      setError(true);
    });
  }, [url]);

  if (error) {
    return (
      <div style={{
        padding: '20px 0', textAlign: 'center',
        fontSize: 11, fontFamily: THEME.fontSans, color: THEME.warning,
      }}>
        Could not generate QR code.
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 220,
      }}>
        <div style={{
          width: 20, height: 20,
          border: `2px solid ${THEME.border}`,
          borderTopColor: THEME.textPrimary,
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <img
        src={dataUrl}
        alt="QR code for this hearing profile"
        style={{
          width: 220, height: 220,
          display: 'block',
          margin: '0 auto',
          border: `1px solid ${THEME.border}`,
          borderRadius: 4,
        }}
      />
      <div style={{
        fontSize: 10, fontFamily: THEME.fontSans,
        color: THEME.textTertiary, marginTop: 10, lineHeight: 1.5,
      }}>
        Scan with a phone camera to open this profile directly.
      </div>
      <a
        href={dataUrl}
        download="hearing-profile-qr.png"
        style={{
          display: 'inline-block',
          marginTop: 10,
          padding: '6px 16px',
          fontSize: 11,
          fontFamily: THEME.fontSans,
          color: THEME.textSecondary,
          border: `1px solid ${THEME.textTertiary}`,
          borderRadius: 3,
          textDecoration: 'none',
          transition: 'all 0.12s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = THEME.textPrimary; e.currentTarget.style.color = THEME.textPrimary; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = THEME.textTertiary; e.currentTarget.style.color = THEME.textSecondary; }}
      >
        Save QR code image
      </a>
    </div>
  );
}

// ── ShareDialog ───────────────────────────────────────────────────────────────

export function ShareDialog({ isOpen, onClose, profile }) {
  const [name,       setName]       = useState('');
  const [profileUrl, setProfileUrl] = useState('');
  const [activeTab,  setActiveTab]  = useState('link');  // 'link' | 'qr'

  useEffect(() => {
    if (!profile) return;
    const namedProfile = name.trim() ? { ...profile, name: name.trim() } : profile;
    setProfileUrl(buildPresetShareUrl(namedProfile) ?? '');
  }, [profile, name]);

  // Reset tab to 'link' each time dialog opens
  useEffect(() => {
    if (isOpen) setActiveTab('link');
  }, [isOpen]);

  if (!isOpen) return null;

  const tabStyle = (tab) => ({
    flex: 1,
    padding: '6px 0',
    fontSize: 11,
    fontFamily: THEME.fontSans,
    fontWeight: activeTab === tab ? 600 : 400,
    background: 'none',
    border: 'none',
    borderBottom: `2px solid ${activeTab === tab ? THEME.textPrimary : 'transparent'}`,
    color: activeTab === tab ? THEME.textPrimary : THEME.textTertiary,
    cursor: 'pointer',
    transition: 'all 0.12s',
  });

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(54,69,79,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div style={{
        background: THEME.bgCard,
        border: `1px solid ${THEME.border}`,
        borderRadius: 6,
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        width: '100%',
        maxWidth: 420,
        padding: 24,
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 12,
        }}>
          <div style={{
            fontSize: 13, fontFamily: THEME.fontSans,
            fontWeight: 600, color: THEME.textPrimary,
          }}>
            Share Hearing Profile
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: THEME.textTertiary, fontSize: 18, lineHeight: 1, padding: 4,
            }}
          >×</button>
        </div>

        <p style={{
          fontSize: 11, fontFamily: THEME.fontSans, color: THEME.textSecondary,
          lineHeight: 1.6, marginBottom: 16,
        }}>
          Anyone with this link can load this hearing profile and apply it to their own audio.
        </p>

        {/* Optional name override */}
        <div style={{ marginBottom: 16 }}>
          <label style={{
            fontSize: 10, fontFamily: THEME.fontSans,
            color: THEME.textSecondary, display: 'block', marginBottom: 5,
          }}>
            Profile name (optional)
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value.slice(0, 60))}
            placeholder={profile?.name ?? 'e.g. "Grandma\'s hearing"'}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: THEME.bgInput,
              border: `1px solid ${THEME.border}`,
              borderRadius: 3, padding: '7px 10px',
              fontSize: 11, fontFamily: THEME.fontSans,
              color: THEME.textPrimary, outline: 'none',
            }}
          />
        </div>

        {/* Tab switcher */}
        <div style={{
          display: 'flex',
          borderBottom: `1px solid ${THEME.border}`,
          marginBottom: 16,
        }}>
          <button type="button" style={tabStyle('link')}  onClick={() => setActiveTab('link')}>Link</button>
          <button type="button" style={tabStyle('qr')}    onClick={() => setActiveTab('qr')}>QR Code</button>
        </div>

        {/* Tab content */}
        {profileUrl && activeTab === 'link' && <CopyField url={profileUrl} />}
        {profileUrl && activeTab === 'qr'   && <QrPanel   url={profileUrl} />}

      </div>
    </div>
  );
}
