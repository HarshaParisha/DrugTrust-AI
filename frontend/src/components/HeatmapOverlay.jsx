import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export default function HeatmapOverlay({ originalSrc, heatmapBase64 }) {
  const [showHeatmap, setShowHeatmap] = useState(false);

  if (!originalSrc && !heatmapBase64) return null;

  return (
    <div className="clinical-card">
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-mv-teal text-xs uppercase tracking-widest">
          Image Analysis
        </p>
        {heatmapBase64 && (
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`mv-button ${showHeatmap ? 'mv-button-primary' : 'mv-button-secondary'}`}
          >
            {showHeatmap ? '◉ Hide AI Focus Map' : '◎ Show AI Focus Map'}
          </button>
        )}
      </div>

      {/* Image area */}
      <div className="relative border border-mv-border overflow-hidden flex items-center justify-center min-h-32 bg-black/20">
        {originalSrc && !showHeatmap && (
          <motion.img
            src={originalSrc}
            alt="Uploaded medicine"
            className="max-h-64 max-w-full object-contain"
            key="original"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
        )}

        <AnimatePresence>
          {showHeatmap && heatmapBase64 && (
            <motion.div
              className="relative"
              key="heatmap"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <img
                src={originalSrc}
                alt="Original"
                className="max-h-64 max-w-full object-contain"
              />
              <img
                src={`data:image/png;base64,${heatmapBase64}`}
                alt="AI Heatmap"
                className="absolute inset-0 w-full h-full object-contain"
                style={{ opacity: 0.6, mixBlendMode: 'multiply' }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {!originalSrc && !showHeatmap && (
          <p className="font-mono text-gray-600 text-xs">No preview available</p>
        )}
      </div>

      {/* Legend */}
      {showHeatmap && (
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          <p className="font-mono text-gray-500 text-xs">AI Attention Map:</p>
          <div className="flex items-center gap-1">
            <div className="w-6 h-2" style={{ background: 'linear-gradient(to right, #00f, #0ff, #ff0, #f00)' }} />
            <span className="font-mono text-xs text-gray-500 inline-flex items-center gap-1">Low <ArrowRight className="h-3 w-3" /> High</span>
          </div>
          <p className="font-mono text-gray-600 text-xs">
            Regions the AI focused on during verification.
          </p>
        </div>
      )}
    </div>
  );
}
