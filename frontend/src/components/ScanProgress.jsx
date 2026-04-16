import React from 'react';
import { motion } from 'framer-motion';

const STAGES = [
  { id: 'upload',   label: 'Image Upload & Preprocessing' },
  { id: 'vision',   label: 'Visual Authentication Scan' },
  { id: 'ocr',      label: 'OCR Text Extraction' },
  { id: 'llm',      label: 'AI Prescription Analysis' },
];

export default function ScanProgress({ activeStage, completedStages = [], llmTokens = 0 }) {
  // activeStage: 'upload' | 'vision' | 'ocr' | 'llm' | null
  return (
    <div className="w-full clinical-card">
      <p className="font-mono text-mv-teal text-xs uppercase tracking-widest mb-4">Pipeline Status</p>
      <div className="flex flex-col gap-4">
        {STAGES.map((stage, idx) => {
          const isComplete = completedStages.includes(stage.id);
          const isActive   = activeStage === stage.id;
          const isPending  = !isComplete && !isActive;

          return (
            <div key={stage.id} className="flex items-center gap-4">
              {/* Stage indicator */}
              <div className="w-6 flex items-center justify-center flex-shrink-0">
                {isComplete ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-4 h-4 rounded-full bg-mv-teal flex items-center justify-center"
                  >
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="#0A0E17" strokeWidth="1.5" strokeLinecap="square"/>
                    </svg>
                  </motion.div>
                ) : isActive ? (
                  <div className="w-4 h-4 rounded-full bg-mv-teal pulse-dot" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-gray-600" />
                )}
              </div>

              {/* Label + extra info */}
              <div className="flex-1 min-w-0">
                <p className={`font-mono text-sm ${
                  isComplete ? 'text-mv-teal' :
                  isActive   ? 'text-white' :
                               'text-gray-600'
                }`}>
                  {stage.label}
                </p>
                {isActive && stage.id === 'llm' && (
                  <p className="font-mono text-xs text-gray-400 mt-0.5">
                    Analyzing... {llmTokens} tokens
                  </p>
                )}
                {isActive && stage.id !== 'llm' && (
                  <motion.p
                    className="font-mono text-xs text-mv-teal/60 mt-0.5"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    Processing...
                  </motion.p>
                )}
              </div>

              {/* Stage number */}
              <span className={`font-mono text-xs ${isComplete ? 'text-mv-teal' : 'text-gray-700'}`}>
                0{idx + 1}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
