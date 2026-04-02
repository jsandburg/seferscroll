/**
 * components/FileUploader.jsx
 * Drag-and-drop + click-to-browse audio file uploader.
 * Supports removing the loaded file as well as replacing it.
 * Shows a loading indicator while the audio is being decoded.
 */

import { useState, useRef } from 'react';
import { THEME } from '../constants/theme.js';
import { formatDuration } from '../utils/fileValidation.js';

export function FileUploader({ onFile, onRemove, fileInfo, isLoading, uploaderRef }) {
  const [dragCount, setDragCount] = useState(0);
  const fileInputRef = useRef(null);
  const isDragging = dragCount > 0;

  const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setDragCount(n => n + 1); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragCount(n => Math.max(0, n - 1)); };
  const handleDragOver  = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragCount(0);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };
  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = '';
  };

  return (
    <div ref={uploaderRef}>
      <input
        id="__file-input-hidden"
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.opus,.webm"
        onChange={handleInputChange}
        style={{ display: 'none' }}
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* ── Loading state ── */}
      {isLoading && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 0',
          marginBottom: 16,
          borderBottom: `1px solid ${THEME.border}`,
        }}>
          <div style={{
            width: 14, height: 14, flexShrink: 0,
            border: `2px solid ${THEME.border}`,
            borderTopColor: THEME.textPrimary,
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }} />
          <span style={{ fontSize: 12, fontFamily: THEME.fontSans, color: THEME.textSecondary }}>
            Loading audio…
          </span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* ── File loaded: compact strip with Replace + Remove ── */}
      {!isLoading && fileInfo && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 0',
          borderBottom: `1px solid ${THEME.border}`,
          marginBottom: 16,
        }}>
          {/* File info — clicking opens picker to replace */}
          <label
            htmlFor="__file-input-hidden"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={e => { e.preventDefault(); fileInputRef.current?.click(); }}
            style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
          >
            <div style={{
              fontSize: 12, fontFamily: THEME.fontSans,
              color: THEME.textPrimary, fontWeight: 500,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {fileInfo.name}
            </div>
            <div style={{ fontSize: 10, fontFamily: THEME.fontSans, color: THEME.textSecondary, marginTop: 1 }}>
              {formatDuration(fileInfo.duration)} · {fileInfo.sampleRate / 1000} kHz · {fileInfo.channels}ch
              <span style={{
                marginLeft: 8,
                textDecoration: 'underline',
                textDecorationStyle: 'dotted',
              }}>Replace</span>
            </div>
          </label>

          {/* Remove button */}
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove audio file"
            title="Remove file"
            style={{
              flexShrink: 0,
              background: 'none',
              border: `1px solid ${THEME.textTertiary}`,
              borderRadius: 3,
              cursor: 'pointer',
              padding: '4px 8px',
              fontSize: 11,
              fontFamily: THEME.fontSans,
              color: THEME.textSecondary,
              transition: 'all 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = THEME.error; e.currentTarget.style.color = THEME.error; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = THEME.textTertiary; e.currentTarget.style.color = THEME.textSecondary; }}
          >
            Remove
          </button>
        </div>
      )}

      {/* ── No file: upload zone ── */}
      {!isLoading && !fileInfo && (
        <label
          htmlFor="__file-input-hidden"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={e => { e.preventDefault(); fileInputRef.current?.click(); }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
          tabIndex={0}
          role="button"
          aria-label="Upload audio file"
          style={{
            display: 'block',
            padding: '20px 16px',
            border: `1px dashed ${isDragging ? THEME.textPrimary : THEME.textTertiary}`,
            borderRadius: 4,
            background: isDragging ? 'rgba(54,69,79,0.04)' : THEME.bgCardHover,
            cursor: 'pointer',
            transition: 'all 0.15s',
            outline: 'none',
            textAlign: 'center',
            marginBottom: 16,
          }}
          onFocus={e => { e.currentTarget.style.borderColor = THEME.borderFocus; }}
          onBlur={e => { e.currentTarget.style.borderColor = isDragging ? THEME.textPrimary : THEME.textTertiary; }}
        >
          <div style={{ fontSize: 11, fontFamily: THEME.fontSans, fontWeight: 500, color: isDragging ? THEME.textPrimary : THEME.textSecondary, marginBottom: 3 }}>
            {isDragging ? 'Drop to load' : 'Upload an audio file'}
          </div>
          <div style={{ fontSize: 10, fontFamily: THEME.fontSans, color: THEME.textSecondary }}>
            MP3, WAV, OGG, M4A, FLAC, OPUS · max 25 MB
          </div>
        </label>
      )}
    </div>
  );
}
