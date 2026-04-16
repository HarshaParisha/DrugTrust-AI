import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flag } from 'lucide-react';
import { getHistory } from '../api/medverify';

const TIER_COLORS = { 1:'#00C853', 2:'#69F0AE', 3:'#FFD600', 4:'#FF6D00', 5:'#D50000' };

export default function ScanHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    getHistory(20, 0)
      .then(setHistory)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="clinical-card text-center py-8">
      <p className="font-mono text-gray-500 text-sm animate-pulse">Loading scan history...</p>
    </div>
  );
  if (error)   return (
    <div className="clinical-card">
      <p className="font-mono text-mv-danger text-sm">Error: {error}</p>
    </div>
  );
  if (!history.length) return (
    <div className="clinical-card text-center py-8">
      <p className="font-mono text-gray-600 text-sm">No scans yet. Upload a medicine image to begin.</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {history.map((entry, i) => {
        const color = TIER_COLORS[entry.risk_tier] || '#888';
        return (
          <motion.div
            key={entry.scan_id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Link
              to={`/result/${entry.scan_id}`}
              className="block clinical-card clinical-card-left hover:bg-mv-border/20 transition-colors"
              style={{ borderLeftColor: color, textDecoration: 'none' }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm" style={{ color }}>
                    {entry.risk_label}
                  </p>
                  <p className="font-sans text-gray-400 text-xs truncate mt-0.5">
                    {entry.medicine_name || 'Unknown Medicine'}
                  </p>
                  <p className="font-mono text-gray-600 text-xs mt-0.5">
                    {entry.timestamp?.slice(0, 19).replace('T', ' ')} UTC
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-mono font-bold text-lg" style={{ color }}>
                    {typeof entry.final_confidence === 'number' ? entry.final_confidence.toFixed(1) : '--'}%
                  </p>
                  <p className="font-mono text-gray-600 text-xs">Tier {entry.risk_tier}</p>
                </div>
              </div>
              {entry.flags?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {entry.flags.slice(0, 2).map((f, fi) => (
                    <span key={fi} className="font-mono text-xs text-mv-amber/70 inline-flex items-center gap-1">
                      <Flag className="h-3 w-3" /> {f.split(' — ')[0]}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
