import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck, ScanLine, FileSearch } from 'lucide-react';

const HIGHLIGHTS = [
  {
    icon: ShieldCheck,
    title: 'Counterfeit Risk Detection',
    text: 'AI checks visual patterns on medicine packaging to detect suspicious signals.',
  },
  {
    icon: ScanLine,
    title: 'OCR-Based Label Validation',
    text: 'Reads batch, expiry, manufacturer, and medicine name from uploaded images.',
  },
  {
    icon: FileSearch,
    title: 'Clinical Safety Summary',
    text: 'Returns a safety-focused result with confidence and actionable next steps.',
  },
];

export default function Landing() {
  useEffect(() => {
    document.body.classList.add('landing-clean');
    return () => document.body.classList.remove('landing-clean');
  }, []);

  return (
    <motion.div
      className="min-h-screen px-4 py-10 md:py-14 max-w-6xl mx-auto relative z-10"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <header className="flex flex-wrap items-center justify-between gap-4 mb-14">
        <div>
          <span className="font-mono text-mv-teal font-bold text-xl tracking-widest uppercase">Drugtrust AI</span>
          <span className="font-mono text-gray-500 text-xs ml-3 uppercase tracking-wider">Medicine Authenticity AI</span>
        </div>
      </header>

      <section className="text-center max-w-3xl mx-auto mb-14">
        <h1 className="font-mono text-3xl md:text-5xl font-bold text-white leading-tight mb-4">
          Stop Fake Medicines Before
          <span className="text-mv-teal"> They Reach Patients.</span>
        </h1>
        <p className="font-sans text-gray-400 text-base md:text-lg leading-relaxed">
          Drugtrust AI helps detect suspicious medicines from a single packaging photo using vision + OCR + safety policy checks.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/home" className="mv-button mv-button-primary">
            Get Verified Now <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link to="/fake-medicine-guide" className="mv-button mv-button-secondary">
            Anti-Fake Guide
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-14">
        {HIGHLIGHTS.map((item, idx) => (
          <motion.article
            key={item.title}
            className="bg-black/25 p-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * idx }}
          >
            <item.icon className="h-5 w-5 text-mv-teal mb-3" />
            <h2 className="font-mono text-xs uppercase tracking-widest text-white mb-2">{item.title}</h2>
            <p className="font-sans text-sm text-gray-400 leading-relaxed">{item.text}</p>
          </motion.article>
        ))}
      </section>

      <section className="bg-black/30 p-6 md:p-8 text-center max-w-4xl mx-auto">
        <p className="font-mono text-[11px] uppercase tracking-widest text-gray-500 mb-3">How it works</p>
        <p className="font-sans text-gray-300 text-sm md:text-base leading-relaxed">
          Upload medicine image → AI validates package and text details → receive risk label and guidance.
        </p>
        <Link to="/home" className="mv-button mv-button-primary mt-6">
          Start a Scan <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>
    </motion.div>
  );
}