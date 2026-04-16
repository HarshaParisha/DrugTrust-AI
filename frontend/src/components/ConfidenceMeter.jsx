import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

const TIER_COLORS = ['#00C853', '#69F0AE', '#FFD600', '#FF6D00', '#D50000'];
const ZONES = [
  { tier: 1, from: 99, to: 100, color: '#00C853' },
  { tier: 2, from: 97, to: 99,  color: '#69F0AE' },
  { tier: 3, from: 95, to: 97,  color: '#FFD600' },
  { tier: 4, from: 90, to: 95,  color: '#FF6D00' },
  { tier: 5, from: 0,  to: 90,  color: '#D50000' },
];

function valueToAngle(value) {
  // 0% maps to -135°, and 100% maps to 135° (270° sweep)
  return -135 + (value / 100) * 270;
}

function polarToXY(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function arcPath(cx, cy, r, startAngle, endAngle) {
  const start = polarToXY(cx, cy, r, startAngle);
  const end   = polarToXY(cx, cy, r, endAngle);
  const largeArc = (endAngle - startAngle) > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export default function ConfidenceMeter({ vision }) {
  if (!vision) return null;
  const { adjusted_confidence, mc_std, uncertainty_level } = vision;

  const confPct   = Math.round((adjusted_confidence || 0) * 100 * 10) / 10;
  const mcStdPct  = ((mc_std || 0) * 100).toFixed(1);
  const highUncert = uncertainty_level === 'HIGH';

  const cx = 120, cy = 120, r = 90;
  const needleAngle = valueToAngle(confPct);
  const needleTip   = polarToXY(cx, cy, r - 10, needleAngle);

  return (
    <div className="clinical-card flex flex-col items-center">
      <p className="font-mono text-mv-teal text-xs uppercase tracking-widest mb-4 self-start">
        Confidence Gauge
      </p>

      <svg width="240" height="160" viewBox="0 0 240 160">
        {/* Zone arcs */}
        {ZONES.map((z) => {
          const sa = valueToAngle(z.from);
          const ea = valueToAngle(z.to);
          return (
            <path
              key={z.tier}
              d={arcPath(cx, cy, r, sa, ea)}
              stroke={z.color}
              strokeWidth="14"
              fill="none"
              strokeLinecap="butt"
              opacity="0.7"
            />
          );
        })}

        {/* Background arc track */}
        <path
          d={arcPath(cx, cy, r, -135, 135)}
          stroke="#1F2937"
          strokeWidth="16"
          fill="none"
          strokeLinecap="butt"
          style={{ zIndex: -1 }}
        />

        {/* Re-draw zones on top */}
        {ZONES.map((z) => (
          <path
            key={`z-${z.tier}`}
            d={arcPath(cx, cy, r, valueToAngle(z.from), valueToAngle(z.to))}
            stroke={z.color}
            strokeWidth="12"
            fill="none"
            strokeLinecap="butt"
            opacity="0.85"
          />
        ))}

        {/* Needle */}
        <motion.line
          x1={cx} y1={cy}
          x2={needleTip.x} y2={needleTip.y}
          stroke="white"
          strokeWidth="2"
          strokeLinecap="square"
          initial={{ x2: cx, y2: cy + r }}
          animate={{ x2: needleTip.x, y2: needleTip.y }}
          transition={{ type: 'spring', stiffness: 60, damping: 18 }}
        />
        <circle cx={cx} cy={cy} r="5" fill="white" />

        {/* Center value */}
        <text
          x={cx} y={cy + 35}
          textAnchor="middle"
          fill="white"
          fontFamily="IBM Plex Mono"
          fontSize="22"
          fontWeight="bold"
        >
          {confPct}%
        </text>

        {/* Labels */}
        <text x="26" y="148" fill="#666" fontFamily="IBM Plex Mono" fontSize="9">0%</text>
        <text x="196" y="148" fill="#666" fontFamily="IBM Plex Mono" fontSize="9">100%</text>
      </svg>

      {/* Uncertainty */}
      <div className="mt-2 text-center">
        <p className="font-mono text-gray-400 text-xs">
          Uncertainty: <span className={highUncert ? 'text-mv-danger' : 'text-mv-teal'}>±{mcStdPct}%</span>
        </p>
      </div>

      {highUncert && (
        <motion.div
          className="mt-3 border border-mv-amber/40 bg-mv-amber/5 px-3 py-2 w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="font-mono text-mv-amber text-xs text-center inline-flex items-center justify-center gap-1.5 w-full">
            <AlertTriangle className="h-3.5 w-3.5" />
            HIGH MODEL UNCERTAINTY — MANUAL REVIEW RECOMMENDED
          </div>
        </motion.div>
      )}
    </div>
  );
}
