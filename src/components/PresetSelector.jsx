/**
 * components/PresetSelector.jsx
 *
 * Multi-column grid layout. All profiles flow left-to-right in up to 4 columns,
 * grouped by category. Category names appear as inline section labels above
 * their group. Much more compact vertically than one-profile-per-row.
 *
 * Custom audiogram buttons show a × delete affordance on hover.
 */

import { useState } from 'react';
import { PRESETS, PRESET_CATEGORIES } from '../constants/presets.js';
import { THEME } from '../constants/theme.js';

function CustomProfileButton({ presetKey, profile, isActive, onSelect, onDelete }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={() => onSelect(presetKey, profile)}
        aria-pressed={isActive}
        style={{
          padding: hovered ? '5px 26px 5px 10px' : '5px 10px',
          fontSize: 11,
          fontFamily: THEME.fontSans,
          fontWeight: isActive ? 600 : 400,
          background: isActive ? THEME.textPrimary : THEME.bgCard,
          border: `1px solid ${isActive ? THEME.textPrimary : THEME.border}`,
          borderRadius: 3,
          color: isActive ? '#ffffff' : THEME.textSecondary,
          cursor: 'pointer',
          transition: 'all 0.12s',
          whiteSpace: 'nowrap',
          width: '100%',
          textAlign: 'left',
        }}
      >
        {profile.name}
      </button>
      {hovered && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onDelete(presetKey); }}
          aria-label={`Delete ${profile.name}`}
          style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: 22,
            background: 'none', border: 'none', cursor: 'pointer',
            color: isActive ? '#ffffff' : THEME.textSecondary,
            fontSize: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = isActive ? 'rgba(255,255,255,0.7)' : THEME.error; }}
          onMouseLeave={e => { e.currentTarget.style.color = isActive ? '#ffffff' : THEME.textSecondary; }}
        >×</button>
      )}
    </div>
  );
}

export function PresetSelector({ activeId, onSelect, customProfiles = [], onNewCustom, onDeleteCustom }) {
  const grouped = {};
  for (const [presetKey, profile] of Object.entries(PRESETS)) {
    const cat = profile.category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({ presetKey, profile });
  }

  const rows = PRESET_CATEGORIES
    .map(({ key: catKey, label }) => {
      const isCustom = catKey === 'custom';
      const items = isCustom
        ? customProfiles.map(p => ({ presetKey: p.id, profile: p }))
        : (grouped[catKey] ?? []);
      if (!isCustom && items.length === 0) return null;
      return { catKey, label, isCustom, items };
    })
    .filter(Boolean);

  return (
    <div>
      {rows.map(({ catKey, label, isCustom, items }) => (
        <div key={catKey} style={{ marginBottom: 10 }}>
          {/* Category label — textPrimary to match other section titles */}
          <div style={{
            fontSize: 9,
            fontFamily: THEME.fontSans,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: THEME.textPrimary,
            marginBottom: 5,
          }}>
            {label}
          </div>

          {/* Profiles in a responsive grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 4,
          }}>
            {items.map(({ presetKey, profile }) => {
              const isActive = activeId === presetKey;
              if (isCustom) {
                return (
                  <CustomProfileButton
                    key={presetKey}
                    presetKey={presetKey}
                    profile={profile}
                    isActive={isActive}
                    onSelect={onSelect}
                    onDelete={onDeleteCustom}
                  />
                );
              }
              return (
                <button
                  key={presetKey}
                  type="button"
                  onClick={() => onSelect(presetKey, profile)}
                  aria-pressed={isActive}
                  style={{
                    padding: '5px 10px',
                    fontSize: 11,
                    fontFamily: THEME.fontSans,
                    fontWeight: isActive ? 600 : 400,
                    background: isActive ? THEME.textPrimary : THEME.bgCard,
                    border: `1px solid ${isActive ? THEME.textPrimary : THEME.border}`,
                    borderRadius: 3,
                    color: isActive ? '#ffffff' : THEME.textSecondary,
                    cursor: 'pointer',
                    transition: 'all 0.12s',
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  {profile.name}
                </button>
              );
            })}

            {isCustom && (
              <button
                type="button"
                onClick={onNewCustom}
                style={{
                  padding: '5px 10px',
                  fontSize: 11,
                  fontFamily: THEME.fontSans,
                  background: THEME.bgCard,
                  border: `1px dashed ${THEME.textTertiary}`,
                  borderRadius: 3,
                  color: THEME.textSecondary,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                + New
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
