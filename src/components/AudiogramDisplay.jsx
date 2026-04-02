/**
 * components/AudiogramDisplay.jsx
 *
 * SVG audiogram display. Shows left and right ear curves independently.
 * Follows ISO 8253-1 conventions: blue X = left, red O = right.
 * Y axis: dB HL, -10 at top to 120 at bottom (clinical standard).
 * X axis: logarithmic frequency 250–8000 Hz.
 */

import { memo } from 'react';
import { FREQUENCIES, FREQ_LABELS, DB_MIN, DB_MAX } from '../constants/frequencies.js';
import { THEME } from '../constants/theme.js';

const SVG_W  = 480;
const SVG_H  = 280;
const PAD    = { top: 28, right: 16, bottom: 38, left: 52 };
const CW     = SVG_W - PAD.left - PAD.right;
const CH     = SVG_H - PAD.top  - PAD.bottom;

const LOG_MIN = Math.log10(200);
const LOG_MAX = Math.log10(10000);

function fToX(f) {
  return PAD.left + ((Math.log10(f) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * CW;
}

function dToY(db) {
  const clamped = Math.max(DB_MIN, Math.min(DB_MAX, db));
  return PAD.top + ((clamped - DB_MIN) / (DB_MAX - DB_MIN)) * CH;
}

const snap = (v) => Math.round(v) + 0.5;

export const AudiogramDisplay = memo(function AudiogramDisplay({ profile }) {
  if (!profile) return null;

  const left    = profile.left;
  const right   = profile.right;
  // Guard against malformed share data with mismatched array lengths
  const symm    = left.length === right.length &&
                  left.every((v, i) => v === right[i]);
  // Audiogram always uses ISO 8253-1 clinical colours regardless of profile.color
  const leftCol  = THEME.leftEar;
  const rightCol = THEME.rightEar;
  // When symmetric, offset right ear line slightly downward so both are visible
  const SYMM_OFFSET = 3;

  // Horizontal grid lines at every 20 dB
  const hLines = [];
  for (let db = DB_MIN; db <= DB_MAX; db += 20) {
    const y = snap(dToY(db));
    hLines.push(
      <line
        key={db}
        x1={snap(PAD.left)} y1={y}
        x2={snap(PAD.left + CW)} y2={y}
        stroke={db === 0 ? 'rgba(0,0,0,0.15)' : THEME.gridLine}
        strokeWidth={db === 0 ? 0.8 : 0.5}
        shapeRendering="crispEdges"
      />
    );
  }

  // Vertical grid lines at each audiogram frequency
  const vLines = FREQUENCIES.map((f, i) => {
    const x = snap(fToX(f));
    return (
      <line
        key={f}
        x1={x} y1={snap(PAD.top)}
        x2={x} y2={snap(PAD.top + CH)}
        stroke={THEME.gridLine}
        strokeWidth={0.5}
        shapeRendering="crispEdges"
      />
    );
  });

  // Build SVG polyline points with optional y offset
  const pointsFor = (arr, yOff = 0) =>
    arr.map((db, i) => `${fToX(FREQUENCIES[i])},${dToY(db) + yOff}`).join(' ');

  // Symbols: X for left, O for right (ISO convention)
  const XSymbol = ({ x, y, color }) => (
    <g transform={`translate(${x},${y})`}>
      <line x1={-4} y1={-4} x2={4} y2={4} stroke={color} strokeWidth={1.5} />
      <line x1={4} y1={-4} x2={-4} y2={4} stroke={color} strokeWidth={1.5} />
    </g>
  );

  const OSymbol = ({ x, y, color }) => (
    <circle cx={x} cy={y} r={4} fill="none" stroke={color} strokeWidth={1.5} />
  );

  // Aria label summarising the audiogram
  const avgLeft  = Math.round(left.reduce((a,b) => a+b, 0) / left.length);
  const avgRight = Math.round(right.reduce((a,b) => a+b, 0) / right.length);
  const ariaLabel = symm
    ? `Audiogram showing ${avgLeft} dB HL average hearing loss both ears`
    : `Audiogram showing left ear ${avgLeft} dB HL average, right ear ${avgRight} dB HL average`;

  return (
    <div style={{ padding: '0 24px 8px' }}>
      <svg
        width={SVG_W}
        height={SVG_H}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        aria-label={ariaLabel}
        role="img"
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        {/* Grid */}
        {hLines}
        {vLines}

        {/* Y axis labels (dB HL) */}
        {[-10, 0, 20, 40, 60, 80, 100, 120].map(db => (
          <text
            key={db}
            x={PAD.left - 8}
            y={dToY(db) + 4}
            textAnchor="end"
            fontSize={8}
            fontFamily={THEME.font}
            fill={THEME.textTertiary}
          >
            {db}
          </text>
        ))}

        {/* Y axis label */}
        <text
          transform={`translate(10, ${PAD.top + CH / 2}) rotate(-90)`}
          textAnchor="middle"
          fontSize={7}
          fontFamily={THEME.font}
          fill={THEME.textTertiary}
        >
          Decibels (dB) Hearing Loss
        </text>

        {/* X axis labels (frequency) */}
        {FREQUENCIES.map((f, i) => (
          <text
            key={f}
            x={fToX(f)}
            y={SVG_H - PAD.bottom + 14}
            textAnchor="middle"
            fontSize={8}
            fontFamily={THEME.font}
            fill={THEME.textTertiary}
          >
            {FREQ_LABELS[i]}
          </text>
        ))}

        {/* X axis label */}
        <text
          x={PAD.left + CW / 2}
          y={SVG_H - 4}
          textAnchor="middle"
          fontSize={8}
          fontFamily={THEME.font}
          fill={THEME.textTertiary}
        >
          Frequency (Hz)
        </text>

        {/* Normal hearing shaded band (0 dB ± 20 dB) */}
        <rect
          x={PAD.left} y={dToY(-10)}
          width={CW} height={dToY(20) - dToY(-10)}
          fill="rgba(52,211,153,0.03)"
        />

        {/* Left ear curve — drawn first so right renders on top */}
        <polyline
          points={pointsFor(left)}
          fill="none"
          stroke={leftCol}
          strokeWidth={2}
        />
        {left.map((db, i) => (
          <XSymbol
            key={i}
            x={fToX(FREQUENCIES[i])}
            y={dToY(db)}
            color={leftCol}
          />
        ))}

        {/* Right ear curve — drawn on top; offset slightly when symmetric so both lines show */}
        <polyline
          points={pointsFor(right, symm ? SYMM_OFFSET : 0)}
          fill="none"
          stroke={rightCol}
          strokeWidth={1.5}
          strokeOpacity={0.6}
          strokeDasharray="4 3"
        />
        {right.map((db, i) => (
          <OSymbol
            key={i}
            x={fToX(FREQUENCIES[i])}
            y={dToY(db) + (symm ? SYMM_OFFSET : 0)}
            color={rightCol}
          />
        ))}

        {/* Legend — Right listed first, then Left */}
        <g transform={`translate(${PAD.left + CW - 80}, ${PAD.top + 6})`}>
            <rect x={0} y={0} width={76} height={34}
              fill={THEME.bg} stroke={THEME.border} rx={2} />
            {/* Right — first entry */}
            <line x1={8} y1={11} x2={18} y2={11} stroke={rightCol} strokeWidth={1.5} strokeDasharray="3 2" />
            <circle cx={13} cy={11} r={3} fill="none" stroke={rightCol} strokeWidth={1.5} />
            <text x={22} y={14} fontSize={8} fontFamily={THEME.font} fill={THEME.textSecondary}>Right</text>
            {/* Left — second entry */}
            <line x1={8} y1={26} x2={18} y2={26} stroke={leftCol} strokeWidth={2} />
            <line x1={10} y1={22} x2={16} y2={30} stroke={leftCol} strokeWidth={1.5} />
            <line x1={16} y1={22} x2={10} y2={30} stroke={leftCol} strokeWidth={1.5} />
            <text x={22} y={29} fontSize={8} fontFamily={THEME.font} fill={THEME.textSecondary}>Left</text>
          </g>
      </svg>
    </div>
  );
});
