import React from 'react';
import { motion } from 'framer-motion';
import { HeartPulse, Users, UserRound, Activity, AlertTriangle, ExternalLink } from 'lucide-react';

function SafetyCell({ label, value, icon }) {
  const color =
    value === 'Yes' ? '#00E676' :
    value?.toLowerCase().includes('no') ? '#FF1744' :
    '#FFB300';

  return (
    <div className="border border-mv-border p-3 flex flex-col items-center gap-1">
      <span className="text-lg">{icon}</span>
      <span className="font-mono text-gray-500 text-xs uppercase tracking-wide text-center">{label}</span>
      <span className="font-mono text-xs text-center font-semibold" style={{ color }}>
        {value || 'N/A'}
      </span>
    </div>
  );
}

function SideEffectTag({ text, serious }) {
  return (
    <span
      className="font-mono text-xs px-2 py-0.5 mr-1 mb-1 inline-block"
      style={{
        border: `1px solid ${serious ? 'rgba(255,23,68,0.4)' : 'rgba(255,179,0,0.3)'}`,
        background: serious ? 'rgba(255,23,68,0.06)' : 'rgba(255,179,0,0.06)',
        color: serious ? '#FF1744' : '#FFB300',
      }}
    >
      {text}
    </span>
  );
}

export default function PrescriptionIntel({ intel }) {
  if (!intel) return null;

  return (
    <motion.div
      className="clinical-card flex flex-col gap-4"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {!intel.llm_available && (
        <div className="border border-mv-border p-4 bg-mv-surface mb-2">
          <p className="font-mono text-mv-teal text-xs uppercase tracking-wider mb-2">Clinical AI Briefing Offline</p>
          <p className="font-sans text-gray-400 text-sm mb-3">Connect your local LLM service to enable full doctor-style narrative guidance.</p>
          <a href="/llm-setup" className="font-mono text-mv-teal text-xs underline inline-flex items-center gap-1.5">
            Open local LLM setup <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}
      <div className="flex items-center justify-between">
        <p className="font-mono text-mv-teal text-xs uppercase tracking-widest">
          Prescription Assessment Note
        </p>
        {intel.category && (
          <span className="tag-pill">{intel.category}</span>
        )}
      </div>

      {/* Used For */}
      {intel.used_for?.length > 0 && (
        <div className="border border-mv-border p-3">
          <p className="font-mono text-gray-500 text-xs uppercase tracking-wider mb-2">Primary Indications</p>
          <div className="flex flex-wrap">
            {intel.used_for.map((u, i) => <span key={i} className="tag-pill">{u}</span>)}
          </div>
        </div>
      )}

      {/* How to Take / Clinical Briefing */}
      {intel.how_to_take && (
        <div className="border border-mv-border p-4 flex gap-4 bg-white/5">
          <div className="flex-shrink-0 mt-1">
            <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="8" stroke="#00E5CC" strokeWidth="1.2"/>
              <path d="M6 9l2 2 4-4" stroke="#00E5CC" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="flex-grow">
            <p className="font-mono text-mv-teal text-[10px] uppercase tracking-widest mb-2">
              {intel.llm_available ? 'Senior Doctor Prescription Note' : 'Administration Guidance'}
            </p>
            <div className={`font-sans text-sm leading-relaxed ${intel.llm_available ? 'text-gray-200' : 'text-gray-300'}`}>
              {intel.llm_available ? (
                <div className="whitespace-pre-wrap space-y-2">
                  {intel.how_to_take}
                </div>
              ) : (
                intel.how_to_take
              )}
            </div>
          </div>
        </div>
      )}

      {/* Safety Grid - show only if we have data or if it's a DB match */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <SafetyCell label="Pregnant"  value={intel.safe_for_pregnant}  icon={<HeartPulse className="h-4 w-4" />} />
        <SafetyCell label="Children"  value={intel.safe_for_children}  icon={<Users className="h-4 w-4" />} />
        <SafetyCell label="Elderly"   value={intel.safe_for_elderly}   icon={<UserRound className="h-4 w-4" />} />
        <SafetyCell label="Diabetics" value={intel.safe_for_diabetics} icon={<Activity className="h-4 w-4" />} />
      </div>

      {/* Structured Info - only show if lists are not empty (DB Fallback case) */}
      {!intel.llm_available && (
        <>
          {intel.used_for?.length > 0 && (
            <div className="border border-mv-border p-3">
              <p className="font-mono text-gray-500 text-[10px] uppercase tracking-wider mb-2">Indications</p>
              <div className="flex flex-wrap gap-1">
                {intel.used_for.map((u, i) => <span key={i} className="tag-pill">{u}</span>)}
              </div>
            </div>
          )}
          {/* ... existing side effects etc ... */}
        </>
      )}

      {/* Prescription Required */}
      {intel.requires_prescription !== null && intel.requires_prescription !== undefined && (
        <div className="flex items-center gap-3">
          <span className="font-mono text-gray-500 text-xs uppercase tracking-wider">
            Regulatory Status:
          </span>
          <span
            className="font-mono text-sm font-bold px-3 py-0.5 border"
            style={{
              color: intel.requires_prescription ? '#FF1744' : '#00E676',
              borderColor: intel.requires_prescription ? 'rgba(255,23,68,0.4)' : 'rgba(0,230,118,0.4)',
              background: intel.requires_prescription ? 'rgba(255,23,68,0.06)' : 'rgba(0,230,118,0.06)',
            }}
          >
            {intel.requires_prescription ? 'YES' : 'NO'}
          </span>
        </div>
      )}

      {/* Overdose Warning */}
      {intel.overdose_warning && (
        <div className="border border-mv-amber/30 bg-mv-amber/5 p-3">
          <p className="font-mono text-mv-amber text-xs uppercase tracking-wider mb-1 inline-flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Toxicity / Overdose Caution
          </p>
          <p className="font-sans text-gray-300 text-sm">{intel.overdose_warning}</p>
        </div>
      )}

      {/* Disclaimer — always shown, cannot be hidden */}
      <div className="border-t border-mv-border pt-3 mt-1">
        <p className="font-mono text-mv-amber text-xs leading-relaxed">
          Clinical disclaimer: {intel.disclaimer}
        </p>
        <p className="font-mono text-gray-600 text-xs mt-1">
          Follow-up recommendation: {intel.consult_reminder}
        </p>
      </div>
    </motion.div>
  );
}
