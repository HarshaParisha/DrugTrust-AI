import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ExternalLink } from 'lucide-react';

export default function SetupGuide() {
  return (
    <motion.div
      className="min-h-screen px-4 py-12 max-w-4xl mx-auto relative z-10"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="mb-8">
        <Link to="/home" className="font-mono text-xs text-mv-teal hover:underline mb-4 inline-flex items-center gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
        </Link>
        <h1 className="font-mono text-2xl font-bold text-white uppercase tracking-widest mt-2">
          Local Deployment Guide
        </h1>
        <p className="font-sans text-gray-400 mt-2">
          Follow these steps to run Drugtrust AI completely local on your machine.
        </p>
      </div>

      <div className="flex flex-col gap-6 font-mono text-sm text-gray-400">
        <div className="border border-mv-border bg-black/40 p-6">
          <p className="text-white font-bold mb-3 uppercase tracking-wider text-xs">1. Install Python Dependencies</p>
          <div className="bg-gray-900 border border-gray-800 p-4 text-emerald-400 rounded-sm">
            pip install -r backend/requirements.txt
          </div>
        </div>

        <div className="border border-mv-border bg-black/40 p-6">
          <p className="text-white font-bold mb-3 uppercase tracking-wider text-xs">2. Install Tesseract OCR</p>
          <p className="mb-3 font-sans text-gray-300">Required for extracting text from medicine packaging.</p>
          <a
            href="https://github.com/UB-Mannheim/tesseract/wiki"
            className="inline-flex items-center gap-1.5 px-4 py-3 bg-gray-900 border border-gray-800 text-emerald-400 rounded-sm hover:brightness-110 transition"
            target="_blank"
            rel="noopener noreferrer"
          >
            Download Tesseract (Windows) <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="border border-mv-border bg-black/40 p-6">
          <p className="text-white font-bold mb-3 uppercase tracking-wider text-xs">3. Doctor Persona LLM (Optional)</p>
          <p className="mb-3 font-sans text-gray-300">Provides clinical briefings safely running offline. Requires Ollama.</p>
          <div className="bg-gray-900 border border-gray-800 p-4 text-emerald-400 rounded-sm">
            ollama pull mistral
          </div>
        </div>

        <div className="border border-mv-border bg-black/40 p-6">
          <p className="text-white font-bold mb-3 uppercase tracking-wider text-xs">4. Run Application</p>
          <div className="bg-gray-900 border border-gray-800 p-4 text-emerald-400 rounded-sm">
            uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
          </div>
          <div className="bg-gray-900 border border-gray-800 p-4 text-emerald-400 rounded-sm mt-3">
            <pre className="m-0 whitespace-pre-wrap">cd frontend{`\nnpm run dev`}</pre>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
