import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Flag } from 'lucide-react';

const TIER_COLORS = {
  1: '#00C853',
  2: '#69F0AE',
  3: '#FFD600',
  4: '#FF6D00',
  5: '#D50000',
};

function WarningIcon({ pulsing }) {
  return (
    <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
      <path d="M14 3L26 24H2L14 3Z" stroke="currentColor" strokeWidth="2" fill="none"/>
      <line x1="14" y1="11" x2="14" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
      <rect x="13" y="19" width="2" height="2" fill="currentColor"/>
    </svg>
  );
}

export default function SafetyVerdict({ result }) {
  if (!result) return null;

  const { risk_tier, risk_label, risk_color, action_required, final_confidence, ocr, flags } = result;
  const color = risk_color || TIER_COLORS[risk_tier] || '#888';
  const isExpired  = ocr?.expiry_status === 'EXPIRED';
  const isDanger   = risk_tier >= 4;
  const isCritical = risk_tier === 5;

  return (
    <div className="w-full">
      {/* Expired sub-banner */}
      <AnimatePresence>
        {isExpired && (
          <motion.div
            className="clinical-card mb-2 flex items-center gap-3"
            style={{ borderLeft: '6px solid #FF1744', background: 'rgba(255,23,68,0.08)' }}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="font-mono text-mv-danger text-sm font-bold tracking-widest">
              <span className="inline-flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" /> EXPIRED MEDICINE
              </span>
            </span>
            <span className="font-mono text-mv-danger/70 text-xs">
              Do not use under any circumstance.
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main verdict banner */}
      <motion.div
        className="clinical-card clinical-card-left flex items-center justify-between gap-4"
        style={{
          borderLeftColor: color,
          ...(isCritical ? {} : {}),
        }}
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 16 }}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {isDanger && (
            <div style={{ color }}>
              <WarningIcon pulsing={isCritical} />
            </div>
          )}
          <div>
            <div
              className="font-mono font-bold text-sm tracking-widest px-3 py-1 inline-block text-white"
              style={{ background: color }}
            >
              {risk_label}
            </div>
            <p className="font-sans text-gray-400 text-sm mt-2">{action_required}</p>
          </div>
        </div>

        {/* Confidence right-aligned */}
        <div className="text-right flex-shrink-0">
          <p className="font-mono text-3xl font-bold" style={{ color }}>
            {typeof final_confidence === 'number' ? final_confidence.toFixed(1) : '--'}%
          </p>
          <p className="font-mono text-gray-600 text-xs uppercase tracking-wider">Confidence</p>
        </div>
      </motion.div>

      {/* Flags */}
      {flags && flags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {flags.map((flag, i) => (
            <span key={i} className="font-mono text-xs px-2 py-0.5 border border-mv-amber/40 text-mv-amber bg-mv-amber/5">
              <span className="inline-flex items-center gap-1">
                <Flag className="h-3 w-3" /> {flag}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Consult reminder */}
      <p className="font-mono text-xs text-gray-500 mt-3 border-l-2 border-gray-700 pl-3">
        {result.consult_reminder || 'Always consult your doctor or a licensed pharmacist before using any medicine.'}
      </p>
    </div>
  );
}
