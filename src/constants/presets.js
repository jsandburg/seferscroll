/**
 * constants/presets.js
 * All built-in hearing profiles.
 * Ordered: mild sensorineural first, then by severity and type.
 */

import { THEME } from './theme.js';

export const PRESETS = {

  // ── Sensorineural ──────────────────────────────────────────────────────────

  mild_sensorineural: {
    name:     'Mild Sensorineural',
    left:     [10, 15, 20, 30, 35, 40, 40, 40],
    right:    [10, 15, 20, 30, 35, 40, 40, 40],
    color:    '#36454f',
    colorRight: null,
    category: 'sensorineural',
    bypass:   false,
    isConductive:    false,
    flatAttenuationL: null,
    flatAttenuationR: null,
    desc:        'Mild loss across all frequencies (26–40 dB HL) — often the first level at which hearing aids are recommended. Soft speech is frequently missed, and background noise significantly reduces comprehension.',
    worklet: {
      tinnitus: { enabled: false, frequency: 4000, level: 0.15 },
    },
  },

  moderate_sensorineural: {
    name:     'Moderate Sensorineural',
    left:     [15, 20, 35, 50, 55, 60, 60, 55],
    right:    [15, 20, 35, 50, 55, 60, 60, 55],
    color:    '#36454f',
    colorRight: null,
    category: 'sensorineural',
    bypass:   false,
    isConductive:    false,
    flatAttenuationL: null,
    flatAttenuationR: null,
    desc:        'Moderate loss (41–55 dB HL). Normal conversation requires sustained effort and concentration, and unaided speech recognition drops sharply in noisy environments. Hearing aids are typically prescribed at this stage.',
    worklet: {
      tinnitus: { enabled: false, frequency: 4000, level: 0.15 },
    },
  },

  severe_sensorineural: {
    name:     'Severe Sensorineural',
    left:     [55, 60, 65, 70, 75, 80, 85, 85],
    right:    [55, 60, 65, 70, 75, 80, 85, 85],
    color:    '#36454f',
    colorRight: null,
    category: 'sensorineural',
    bypass:   false,
    isConductive:    false,
    flatAttenuationL: null,
    flatAttenuationR: null,
    desc:        'Severe loss (71–90 dB HL). Most speech is inaudible without amplification, and even with hearing aids, understanding remains limited. Cochlear implant candidacy is typically evaluated at this level.',
    worklet: {
      tinnitus: { enabled: false, frequency: 4000, level: 0.15 },
    },
  },

  // ── Presbycusis ────────────────────────────────────────────────────────────

  mild_presbycusis: {
    name:     'Mild Presbycusis',
    left:     [0, 5, 10, 20, 30, 40, 45, 50],
    right:    [0, 5, 10, 20, 30, 40, 45, 50],
    color:    '#36454f',
    colorRight: null,
    category: 'sensorineural',
    bypass:   false,
    isConductive:    false,
    flatAttenuationL: null,
    flatAttenuationR: null,
    desc:        'Early age-related loss beginning with the high frequencies above 2 kHz — the most common pattern of hearing loss overall. Consonants like S, F, and TH start to blur, and speech in noise becomes harder to follow.',
    worklet: {
      tinnitus: { enabled: false, frequency: 4000, level: 0.15 },
    },
  },

  moderate_presbycusis: {
    name:     'Moderate Presbycusis',
    left:     [5, 15, 25, 40, 55, 65, 70, 75],
    right:    [5, 15, 25, 40, 55, 65, 70, 75],
    color:    '#36454f',
    colorRight: null,
    category: 'sensorineural',
    bypass:   false,
    isConductive:    false,
    flatAttenuationL: null,
    flatAttenuationR: null,
    desc:        'Moderate age-related loss, affecting a majority of adults over 65. Conversation requires concentration, speech in noise is difficult, and the television volume tends to creep up. Amplification is typically recommended at this stage.',
    worklet: {
      tinnitus: { enabled: false, frequency: 4000, level: 0.15 },
    },
  },

  severe_presbycusis: {
    name:     'Severe Presbycusis',
    left:     [25, 35, 50, 65, 75, 80, 85, 85],
    right:    [25, 35, 50, 65, 75, 80, 85, 85],
    color:    '#36454f',
    colorRight: null,
    category: 'sensorineural',
    bypass:   false,
    isConductive:    false,
    flatAttenuationL: null,
    flatAttenuationR: null,
    desc:        'Significant age-related loss. One-on-one conversation is difficult even in quiet, and group conversations are nearly impossible. Hearing aids may not provide sufficient benefit at this level; cochlear implant evaluation is sometimes appropriate.',
    worklet: {
      tinnitus: { enabled: false, frequency: 4000, level: 0.15 },
    },
  },

  // ── Noise-Induced ──────────────────────────────────────────────────────────

  noise_notch: {
    name:     'Noise-Induced (4 kHz Notch)',
    left:     [0, 0, 5, 15, 50, 65, 40, 20],
    right:    [0, 0, 5, 15, 50, 65, 40, 20],
    color:    '#36454f',
    colorRight: null,
    category: 'noise',
    bypass:   false,
    isConductive:    false,
    flatAttenuationL: null,
    flatAttenuationR: null,
    desc:        'Classic acoustic-trauma pattern — a sharp notch centred at 4 kHz, where the cochlea is most mechanically stressed by loud sounds. Common after gunfire, industrial noise, or concert exposure. The notch typically widens with continued or repeated exposure.',
    worklet: {
      tinnitus: { enabled: false, frequency: 4000, level: 0.15 },
    },
  },

  // ── Conductive ─────────────────────────────────────────────────────────────

  conductive_mild: {
    name:     'Conductive Loss (Mild)',
    left:     [25, 30, 30, 30, 28, 25, 22, 20],
    right:    [25, 30, 30, 30, 28, 25, 22, 20],
    color:    '#36454f',
    colorRight: null,
    category: 'conductive',
    bypass:   false,
    isConductive:    true,
    flatAttenuationL: 27,
    flatAttenuationR: 27,
    desc:        'Mild middle-ear blockage — like hearing through earplugs or with fluid in the ear. Sounds are uniformly softer but not distorted, because the inner ear (cochlea) is intact. Typically caused by otitis media, cerumen impaction, or ossicular chain disruption.',
    worklet: {
      tinnitus: { enabled: false, frequency: 4000, level: 0.15 },
    },
  },

  conductive_moderate: {
    name:     'Conductive Loss (Moderate)',
    left:     [40, 45, 45, 42, 40, 38, 35, 30],
    right:    [40, 45, 45, 42, 40, 38, 35, 30],
    color:    '#36454f',
    colorRight: null,
    category: 'conductive',
    bypass:   false,
    isConductive:    true,
    flatAttenuationL: 40,
    flatAttenuationR: 40,
    desc:        'Moderate middle-ear blockage (41–55 dB HL). Speech requires significant volume to be audible, and normal conversation is difficult without raised voices. Conductive loss at this level is often treatable medically or surgically.',
    worklet: {
      tinnitus: { enabled: false, frequency: 4000, level: 0.15 },
    },
  },

  // ── Genetic / Pattern ──────────────────────────────────────────────────────

  cookie_bite_low: {
    name:     'Cookie Bite (Mid-Low)',
    left:     [5, 10, 40, 55, 50, 35, 15, 5],
    right:    [5, 10, 40, 55, 50, 35, 15, 5],
    color:    '#36454f',
    colorRight: null,
    category: 'genetic',
    bypass:   false,
    isConductive:    false,
    flatAttenuationL: null,
    flatAttenuationR: null,
    desc:        'Mid-frequency loss centred around 1–2 kHz — a U-shaped dip named for looking like a bite taken from the middle of the audiogram. Voice fundamentals fall squarely in this range, so speech can sound hollow or muffled. This pattern is often hereditary.',
    worklet: {
      tinnitus: { enabled: false, frequency: 4000, level: 0.15 },
    },
  },

  cookie_bite_high: {
    name:     'Cookie Bite (Mid-High)',
    left:     [5, 10, 25, 50, 55, 45, 20, 10],
    right:    [5, 10, 25, 50, 55, 45, 20, 10],
    color:    '#36454f',
    colorRight: null,
    category: 'genetic',
    bypass:   false,
    isConductive:    false,
    flatAttenuationL: null,
    flatAttenuationR: null,
    desc:        'Mid-frequency loss centred around 2–3 kHz, where consonant clarity lives. Sounds like "s", "sh", and "ch" become hard to distinguish from one another. Often hereditary; may be stable for decades before progression.',
    worklet: {
      tinnitus: { enabled: false, frequency: 4000, level: 0.15 },
    },
  },

  precipitous: {
    name:     'Precipitous High-Frequency',
    left:     [0, 0, 0, 10, 35, 65, 85, 90],
    right:    [0, 0, 0, 10, 35, 65, 85, 90],
    color:    '#36454f',
    colorRight: null,
    category: 'genetic',
    bypass:   false,
    isConductive:    false,
    flatAttenuationL: null,
    flatAttenuationR: null,
    desc:        'A steep cliff-like drop above 2 kHz — near-normal hearing in the low and mid frequencies, with high-frequency sounds nearly inaudible. Common in genetic hearing loss patterns and in late-stage noise-induced loss.',
    worklet: {
      tinnitus: { enabled: false, frequency: 4000, level: 0.15 },
    },
  },

  // ── Asymmetric ─────────────────────────────────────────────────────────────

  asymmetric_noise: {
    name:     'Asymmetric Noise-Induced',
    left:     [0, 0, 10, 25, 65, 75, 55, 30],
    right:    [0, 0, 5,  10, 30, 35, 25, 15],
    color:    THEME.leftEar,
    colorRight: THEME.rightEar,
    category: 'asymmetric',
    bypass:   false,
    isConductive:    false,
    flatAttenuationL: null,
    flatAttenuationR: null,
    desc:        'Unilateral noise exposure — left ear significantly worse than right, with a pronounced 4 kHz notch on the left. Common in occupational settings or shooting sports. Asymmetric sensorineural loss should always be investigated to exclude retrocochlear pathology such as acoustic neuroma.',
    worklet: {
      tinnitus: { enabled: false, frequency: 4000, level: 0.15 },
    },
  },

  sudden_unilateral: {
    name:     'Sudden Unilateral Loss',
    left:     [55, 60, 65, 70, 75, 80, 85, 85],
    right:    [0,  0,  0,  0,  0,  0,  0,  0],
    color:    THEME.leftEar,
    colorRight: THEME.rightEar,
    category: 'asymmetric',
    bypass:   false,
    isConductive:    false,
    flatAttenuationL: null,
    flatAttenuationR: null,
    desc:        'Sudden sensorineural hearing loss in the left ear, with a normal right. Profoundly disorienting — spatial awareness is severely compromised and the brain receives no input to localise sound direction. Sudden SNHL is a medical emergency requiring urgent evaluation.',
    worklet: {
      tinnitus: { enabled: false, frequency: 4000, level: 0.15 },
    },
  },

  // ── Reference ──────────────────────────────────────────────────────────────

  normal: {
    name:     'Normal Hearing',
    left:     [0, 0, 0, 0, 0, 0, 0, 0],
    right:    [0, 0, 0, 0, 0, 0, 0, 0],
    color:    THEME.success,
    colorRight: null,
    category: 'reference',
    bypass:   true,
    isConductive:    false,
    flatAttenuationL: null,
    flatAttenuationR: null,
    desc:        'Full auditory range with thresholds of 0–20 dB HL across all frequencies — considered within normal limits for adults. No processing applied. Use as a reference baseline when comparing against a simulated profile.',
    worklet: {
      tinnitus: { enabled: false, frequency: 4000, level: 0.15 },
    },
  },


};

// ─── Category definitions ──────────────────────────────────────────────────────

export const PRESET_CATEGORIES = [
  { key: 'reference',     label: 'Normal' },
  { key: 'sensorineural', label: 'Sensorineural' },
  { key: 'noise',         label: 'Noise-Induced' },
  { key: 'conductive',    label: 'Conductive' },
  { key: 'genetic',       label: 'Genetic' },
  { key: 'asymmetric',    label: 'Asymmetric' },
  { key: 'custom',        label: 'Custom Audiograms' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function isSymmetric(profile) {
  return profile.left.every((v, i) => v === profile.right[i]);
}

export function findPreset(key) {
  return PRESETS[key] ?? null;
}
