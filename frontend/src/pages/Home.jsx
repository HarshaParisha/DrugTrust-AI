import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShieldCheck, FileText, Brain, AlertTriangle, ExternalLink, ArrowRight, ShieldAlert, Stethoscope } from 'lucide-react';
import UploadZone from '../components/UploadZone';
import ScanProgress from '../components/ScanProgress';
import { verifyImage } from '../api/medverify';

const PILLS = [
  { label: 'Visual Counterfeit Detection', icon: ShieldCheck },
  { label: 'OCR Field Extraction', icon: FileText },
  { label: 'AI Prescription Intelligence', icon: Brain },
];

export default function Home({ setScanResult }) {
  const navigate    = useNavigate();
  const [stage, setStage]       = useState(null);
  const [completed, setCompleted] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError]       = useState('');
  const requestAbortRef = useRef(null);

  const advance = (stageId) => {
    setStage(stageId);
    setCompleted(prev => [...prev, stageId].slice(0, -1));
  };

  const handleFile = async (file, options = {}) => {
    if (requestAbortRef.current) {
      requestAbortRef.current.abort();
      requestAbortRef.current = null;
    }

    const controller = new AbortController();
    requestAbortRef.current = controller;

    setError('');
    setScanning(true);
    setCompleted([]);

    setStage('upload');
    await new Promise(r => setTimeout(r, 800));
    setCompleted(['upload']);

    setStage('vision');
    await new Promise(r => setTimeout(r, 600));
    setCompleted(prev => [...prev, 'vision'].filter((v,i,a) => a.indexOf(v) === i));

    setStage('ocr');
    await new Promise(r => setTimeout(r, 400));
    setCompleted(prev => [...prev, 'ocr'].filter((v,i,a) => a.indexOf(v) === i));

    setStage('llm');

    try {
      const includeHeatmap = options?.includeHeatmap ?? true;
      const source = options?.source || 'manual_upload';
      const result = await verifyImage(file, {
        includeHeatmap,
        source,
        signal: controller.signal,
      });
      setCompleted(['upload','vision','ocr','llm']);
      setStage(null);
      setScanResult && setScanResult(result);
      // Cache in sessionStorage
      sessionStorage.setItem(`scan_${result.scan_id}`, JSON.stringify(result));
      navigate(`/result/${result.scan_id}`);
    } catch (e) {
      if (e?.name === 'AbortError') {
        setError('Scan cancelled. Capture another image to continue.');
      } else {
        setError(`Scan failed: ${e.message}`);
      }
      setScanning(false);
      setStage(null);
    } finally {
      requestAbortRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (requestAbortRef.current) requestAbortRef.current.abort();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 pt-12 pb-16 relative z-10">
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-12">
        <div>
          <span className="font-mono text-mv-teal font-bold text-xl tracking-widest uppercase">
            Drugtrust AI
          </span>
          <span className="font-mono text-gray-600 text-xs ml-3 uppercase tracking-wider hidden sm:inline">
            v1.0 · Medicine AI
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/med-guide"
            className="mv-button mv-button-secondary"
          >
            <Stethoscope className="h-3.5 w-3.5" />
            MedGuide Pro
          </Link>
          <Link
            to="/search"
            className="mv-button mv-button-primary"
          >
            <Search className="h-3.5 w-3.5" />
            Search Medicines
          </Link>
          <Link 
            to="/setup"
            className="mv-button mv-button-secondary"
          >
            Setup Guide <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Hero */}
      <motion.div
        className="w-full max-w-2xl text-center mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="font-mono text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">
          Medicine Authenticity<br />
          <span className="text-mv-teal">Verification System</span>
        </h1>
        <p className="font-sans text-gray-400 text-base max-w-lg mx-auto">
          Upload a photo of any medicine strip, bottle, or packaging. AI will verify authenticity and extract prescription intelligence.
        </p>
      </motion.div>

      {/* Upload zone */}
      <div className="w-full max-w-xl mb-6">
        <UploadZone onFile={handleFile} disabled={scanning} />
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.p
            className="font-mono text-mv-danger text-sm mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <span className="inline-flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </span>
          </motion.p>
        )}
      </AnimatePresence>

      {/* Progress */}
      <AnimatePresence>
        {scanning && (
          <motion.div
            className="w-full max-w-xl mb-8"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <ScanProgress activeStage={stage} completedStages={completed} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Capability pills */}
      {!scanning && (
        <>
          <motion.div
            className="flex flex-wrap gap-3 justify-center mt-4 mb-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {PILLS.map((p) => (
              <div
                key={p.label}
                className="flex items-center gap-2 px-4 py-2 border border-mv-border font-mono text-xs text-gray-400 uppercase tracking-wider"
              >
                <p.icon className="h-4 w-4" /> {p.label}
              </div>
            ))}
          </motion.div>

          {/* How it Works Section */}
          <motion.div 
            className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-8 py-12 border-t border-mv-border"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex flex-col items-center group">
              <div className="w-12 h-12 rounded-full border border-mv-teal/30 flex items-center justify-center mb-4 group-hover:bg-mv-teal/10 transition-colors">
                <span className="font-mono text-mv-teal font-bold">01</span>
              </div>
              <h3 className="font-mono text-xs text-white uppercase tracking-widest mb-2">Upload Image</h3>
              <p className="font-sans text-xs text-gray-500 leading-relaxed text-center">
                Capture the medicine strip or bottle clearly. High resolution helps OCR accuracy.
              </p>
            </div>

            <div className="flex flex-col items-center group">
              <div className="w-12 h-12 rounded-full border border-mv-teal/30 flex items-center justify-center mb-4 group-hover:bg-mv-teal/10 transition-colors">
                <span className="font-mono text-mv-teal font-bold">02</span>
              </div>
              <h3 className="font-mono text-xs text-white uppercase tracking-widest mb-2">AI Analysis</h3>
              <p className="font-sans text-xs text-gray-500 leading-relaxed text-center">
                EfficientNet-B3 scans visual patterns while Tesseract extracts clinical data.
              </p>
            </div>

            <div className="flex flex-col items-center group">
              <div className="w-12 h-12 rounded-full border border-mv-teal/30 flex items-center justify-center mb-4 group-hover:bg-mv-teal/10 transition-colors">
                <span className="font-mono text-mv-teal font-bold">03</span>
              </div>
              <h3 className="font-mono text-xs text-white uppercase tracking-widest mb-2">Doctor Briefing</h3>
              <p className="font-sans text-xs text-gray-500 leading-relaxed text-center">
                Receive an AI-generated clinical briefing on dosage, safety, and authenticity.
              </p>
            </div>
          </motion.div>

          {/* (Setup guide moved to header) */}
        </>
      )}

      {/* Footer nav */}
      <div className="mt-auto pt-16 flex flex-col items-center gap-4">
        <div className="flex items-center gap-8">
          <a href="/history" className="mv-button mv-button-ghost text-gray-500 hover:text-mv-teal">
            <span className="inline-flex items-center gap-1.5">View Scan History <ArrowRight className="h-3.5 w-3.5" /></span>
          </a>
          <Link to="/fake-medicine-guide" className="mv-button mv-button-ghost text-gray-500 hover:text-mv-teal">
            <span className="inline-flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5" /> Anti-Fake Guide</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
