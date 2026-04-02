/**
 * hooks/useWorkletParams.js
 *
 * Manages tinnitus overrides on top of the current preset's defaults.
 * These are UI-only concepts — the audio processor only receives enabled/frequency/level.
 */

import { useState, useCallback } from 'react';

const DEFAULT_TINNITUS = {
  enabled: false,
  frequency: 4000,
  level: 0.15,
};

function safeTinnitus(profile) {
  const t = profile?.worklet?.tinnitus ?? DEFAULT_TINNITUS;
  return {
    enabled:   Boolean(t.enabled),
    frequency: Number(t.frequency ?? 4000),
    level:     Number(t.level     ?? 0.15),
  };
}

export function useWorkletParams(currentProfile) {
  const [overrides, setOverrides] = useState({});

  const setTinnitus = useCallback((tinnitusObj) => {
    setOverrides(prev => ({
      ...prev,
      tinnitus: { ...(prev.tinnitus ?? {}), ...tinnitusObj },
    }));
  }, []);

  const resetToPreset = useCallback(() => {
    setOverrides({});
  }, []);

  const profileTinnitus = safeTinnitus(currentProfile);

  const effective = {
    tinnitus: {
      enabled:   overrides.tinnitus?.enabled   ?? profileTinnitus.enabled,
      frequency: overrides.tinnitus?.frequency ?? profileTinnitus.frequency,
      level:     overrides.tinnitus?.level     ?? profileTinnitus.level,
    },
  };

  return {
    overrides,
    effective,
    setTinnitus,
    resetToPreset,
  };
}
