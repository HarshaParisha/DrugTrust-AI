import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, ArrowLeft } from 'lucide-react';
import { getHistory, clearHistory } from '../api/medverify';
import ScanHistory from '../components/ScanHistory';

export default function History() {
  return (
    <motion.div
      className="min-h-screen px-4 py-8 max-w-4xl mx-auto relative z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <span className="font-mono text-mv-teal font-bold text-lg tracking-widest uppercase">Drugtrust AI</span>
          <span className="font-mono text-gray-600 text-xs ml-3 uppercase tracking-wider">Scan History</span>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/search" className="mv-button mv-button-primary">
            <Search className="h-3.5 w-3.5" /> Search DB
          </Link>
          <Link to="/home" className="mv-button mv-button-secondary text-gray-500 hover:text-mv-teal">
            <ArrowLeft className="h-3.5 w-3.5" /> New Scan
          </Link>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <p className="font-mono text-gray-500 text-[10px] uppercase tracking-widest">
          All scans are retained for auditing purposes.
        </p>
        <button 
          onClick={async () => {
            if (window.confirm("Permanently clear all scan history?")) {
              await clearHistory();
              window.location.reload();
            }
          }}
          className="mv-button mv-button-danger"
        >
          Clear All History
        </button>
      </div>

      <ScanHistory />
    </motion.div>
  );
}
