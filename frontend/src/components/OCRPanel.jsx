import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

const EXPIRY_COLORS = {
  EXPIRED:       { bg: 'rgba(255,23,68,0.1)',  border: '#FF1744', text: 'text-mv-danger', dot: '#FF1744' },
  EXPIRING_SOON: { bg: 'rgba(255,179,0,0.08)', border: '#FFB300', text: 'text-mv-amber',  dot: '#FFB300' },
  VALID:         { bg: 'transparent',           border: '#1F2937', text: 'text-gray-300',   dot: '#00E676' },
  UNKNOWN:       { bg: 'transparent',           border: '#1F2937', text: 'text-gray-500',   dot: '#374151' },
};

function FieldCard({ label, value, extra, special }) {
  const detected = Boolean(value);

  return (
    <motion.div
      className="p-3 border border-mv-border relative"
      style={special ? { background: special.bg, borderColor: special.border } : {}}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="font-mono text-gray-500 text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className={`font-mono text-sm break-all ${special ? special.text : (detected ? 'text-white' : 'text-gray-600')}`}>
          {value || '— not detected'}
        </p>
        {value && (label === 'Batch No' || label === 'License No') && (
          <button
            onClick={() => navigator.clipboard.writeText(value)}
            title="Copy"
            className="flex-shrink-0 mv-button mv-button-ghost px-2 py-1 min-h-0"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="3" width="7" height="8" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M4 3V2h7v7H10" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
          </button>
        )}
      </div>
      {extra && <p className="font-mono text-xs text-gray-600 mt-0.5">{extra}</p>}
    </motion.div>
  );
}

export default function OCRPanel({ ocr }) {
  if (!ocr) return null;

  const expiryStyle = EXPIRY_COLORS[ocr.expiry_status] || EXPIRY_COLORS.UNKNOWN;
  const lowConf = ocr.ocr_confidence_score < 60;

  return (
    <div className="clinical-card">
      <div className="flex items-center justify-between mb-4">
        <p className="font-mono text-mv-teal text-xs uppercase tracking-widest">
          OCR Extracted Fields
        </p>
        <span className="font-mono text-xs text-gray-500">
          via {ocr.ocr_engine_used} · score {ocr.ocr_confidence_score.toFixed(0)}%
        </span>
      </div>

      {lowConf && (
        <div className="mb-4 border border-mv-amber/40 bg-mv-amber/5 px-3 py-2">
          <div className="font-mono text-mv-amber text-xs inline-flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            LOW OCR CONFIDENCE — IMAGE MAY BE BLURRY OR TEXT OBSCURED. MANUAL VERIFICATION REQUIRED.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FieldCard label="Medicine Name"   value={ocr.medicine_name} />
        <FieldCard label="Dosage Strength" value={ocr.dosage_strength} />
        <FieldCard
          label="Expiry Date"
          value={ocr.expiry_date}
          extra={ocr.expiry_status !== 'UNKNOWN' ? `Status: ${ocr.expiry_status}` : null}
          special={expiryStyle}
        />
        <FieldCard label="Mfg Date"        value={ocr.mfg_date} />
        <FieldCard label="Batch No"        value={ocr.batch_number} />
        <FieldCard label="Manufacturer"    value={ocr.manufacturer_name} />
        <FieldCard label="Salt / Composition" value={ocr.salt_composition} />
        <FieldCard label="License No"      value={ocr.license_number} />
        <FieldCard label="MRP"             value={ocr.mrp} />
        <FieldCard label="Storage"         value={ocr.storage_instructions} />
      </div>
    </div>
  );
}
