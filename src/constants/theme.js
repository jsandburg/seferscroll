/**
 * constants/theme.js
 * Modern Minimalist design tokens.
 *
 * Palette:
 *   Charcoal   #36454f  — primary dark, active states, headings
 *   Slate Gray #708090  — medium accents, secondary text
 *   Light Gray #d3d3d3  — borders, dividers
 *   White      #ffffff  — backgrounds
 *
 * Audiogram colours follow ISO 8253-1 and are intentionally preserved:
 *   Left ear  #4a6fa5  — clinical blue (X symbol)
 *   Right ear #c0392b  — clinical red  (O symbol)
 */

export const THEME = {
  // Backgrounds
  bg:           '#ffffff',
  bgCard:       '#ffffff',
  bgCardHover:  '#f5f5f5',
  bgInput:      '#ffffff',

  // Borders
  border:       '#d3d3d3',
  borderFocus:  '#36454f',

  // Text
  textPrimary:   '#36454f',
  textSecondary: '#536068',
  textTertiary:  '#708090',
  textMuted:     '#9aa5ad',

  // Semantic (kept for error/warning/success meaning)
  error:   '#c0392b',
  warning: '#b7770d',
  success: '#2a7a4a',
  info:    '#36454f',

  // Audiogram colours — ISO 8253-1, do not change
  leftEar:  '#4a6fa5',
  rightEar: '#c0392b',

  // Feature accents
  worklet:  '#708090',
  custom:   '#36454f',

  // Typography
  // font: alias for fontSans, used in SVG/canvas contexts where "Sans" feels awkward
  font:     '"Helvetica Neue", Helvetica, Arial, sans-serif',
  fontSans: '"Helvetica Neue", Helvetica, Arial, sans-serif',

  // Grid
  gridLine: 'rgba(54,69,79,0.08)',
};
