/**
 * hooks/useAudiogramEditor.js
 *
 * Manages state for creating and editing custom audiograms.
 * Custom audiograms are stored in React state (primary)
 * and localStorage (optional persistence — attempted but not relied upon).
 */

import { useState, useCallback, useEffect } from 'react';
import { THEME } from '../constants/theme.js';

const STORAGE_KEY = 'hearing-sim-custom-audiograms';
const DEFAULT_LOSS = new Array(8).fill(0);

/**
 * Sanitise a profile loaded from localStorage.
 * Adds any fields that didn't exist in older saved versions.
 * Returns a new object — never mutates the input.
 */
function sanitiseStoredProfile(p) {
  if (!p || typeof p !== 'object') return null;
  return {
    ...p,
    left:  Array.isArray(p.left)  && p.left.length  === 8 ? p.left  : [...DEFAULT_LOSS],
    right: Array.isArray(p.right) && p.right.length === 8 ? p.right : [...DEFAULT_LOSS],
    color:        p.color        ?? '#36454f',
    colorRight:   p.colorRight   ?? null,
    bypass:       Boolean(p.bypass),
    isConductive: Boolean(p.isConductive),
    flatAttenuationL: p.flatAttenuationL ?? null,
    flatAttenuationR: p.flatAttenuationR ?? null,
    desc:         p.desc         ?? 'User-defined audiogram.',
    worklet: {
      tinnitus: {
        enabled:   Boolean(p.worklet?.tinnitus?.enabled),
        frequency: Number(p.worklet?.tinnitus?.frequency ?? 4000),
        level:     Number(p.worklet?.tinnitus?.level     ?? 0),
      },
    },
  };
}

function generateId() {
  return `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function makeEmptyProfile(name = 'Custom Audiogram') {
  return {
    id:           generateId(),
    name,
    isCustom:     true,
    left:         [...DEFAULT_LOSS],
    right:        [...DEFAULT_LOSS],
    isSymmetric:  true,
    category:     'custom',
    bypass:       false,
    isConductive: false,
    flatAttenuationL: null,
    flatAttenuationR: null,
    color:        THEME.custom,
    colorRight:   null,
    desc:         'User-defined audiogram.',
    worklet: {
      tinnitus: { enabled: false, frequency: 4000, level: 0 },
    },
  };
}

export function useAudiogramEditor() {
  const [customProfiles, setCustomProfiles] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];
      // Sanitise every stored profile to handle older formats missing fields
      return parsed.map(sanitiseStoredProfile).filter(Boolean);
    } catch {
      return [];
    }
  });

  const [editingProfile, setEditingProfile] = useState(null);
  const [isEditorOpen,   setIsEditorOpen]   = useState(false);

  // Persist to localStorage whenever customProfiles changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customProfiles));
    } catch { /* storage unavailable — continue without persistence */ }
  }, [customProfiles]);

  // ── Editor open/close ──────────────────────────────────────────────────────

  const openNewEditor = useCallback(() => {
    setEditingProfile(makeEmptyProfile());
    setIsEditorOpen(true);
  }, []);

  const closeEditor = useCallback(() => {
    setEditingProfile(null);
    setIsEditorOpen(false);
  }, []);

  // ── Editing the in-progress profile ───────────────────────────────────────

  const setName = useCallback((name) => {
    setEditingProfile(prev => prev ? { ...prev, name: name.slice(0, 60) } : null);
  }, []);

  const setLossValue = useCallback((ear, bandIndex, db) => {
    const clamped = Math.max(0, Math.min(120, Math.round(Number(db) || 0)));
    setEditingProfile(prev => {
      if (!prev) return null;
      const updated = [...prev[ear]];
      updated[bandIndex] = clamped;
      const other = ear === 'left' ? prev.right : prev.left;
      return {
        ...prev,
        [ear]: updated,
        isSymmetric: updated.every((v, i) => v === other[i]),
      };
    });
  }, []);

  const mirrorLeftToRight = useCallback(() => {
    setEditingProfile(prev => {
      if (!prev) return null;
      return { ...prev, right: [...prev.left], isSymmetric: true };
    });
  }, []);

  const mirrorRightToLeft = useCallback(() => {
    setEditingProfile(prev => {
      if (!prev) return null;
      return { ...prev, left: [...prev.right], isSymmetric: true };
    });
  }, []);

  // ── Save / delete ──────────────────────────────────────────────────────────

  const saveProfile = useCallback(() => {
    if (!editingProfile) return null;
    const profile = { ...editingProfile };
    setCustomProfiles(prev => {
      const existing = prev.findIndex(p => p.id === profile.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = profile;
        return updated;
      }
      return [...prev, profile];
    });
    closeEditor();
    return profile;
  }, [editingProfile, closeEditor]);

  const deleteProfile = useCallback((id) => {
    setCustomProfiles(prev => prev.filter(p => p.id !== id));
  }, []);

  const addCustomProfile = useCallback((profile) => {
    const saved = { ...profile, id: generateId(), isCustom: true, category: 'custom' };
    setCustomProfiles(prev => [...prev, saved]);
    return saved;
  }, []);

  return {
    customProfiles,
    editingProfile,
    isEditorOpen,
    openNewEditor,
    closeEditor,
    setName,
    setLossValue,
    mirrorLeftToRight,
    mirrorRightToLeft,
    saveProfile,
    deleteProfile,
    addCustomProfile,
  };
}
