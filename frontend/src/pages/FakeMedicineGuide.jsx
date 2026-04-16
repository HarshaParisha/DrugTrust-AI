import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldAlert, CheckCircle2 } from 'lucide-react';

const GUIDELINES = [
  {
    title: 'Look for Spelling Mistakes',
    description:
      "Check the label for misspellings in the medicine name, ingredients, or manufacturer. Simple errors can signal a counterfeit product.",
  },
  {
    title: 'Check Medication Appearance',
    description:
      'If pills suddenly look different in size, shape, or color, be cautious and ask your doctor or pharmacist before use.',
  },
  {
    title: 'Inspect Packaging Quality',
    description:
      'Compare with previous purchases. Font quality, print alignment, colors, and sealing defects are common counterfeit indicators.',
  },
  {
    title: 'Double-Check Expiry Dates',
    description:
      'Expired or near-expiry medicines sold unexpectedly can indicate poor quality control or counterfeit circulation.',
  },
  {
    title: 'Verify Batch / Lot Number',
    description:
      'Ensure the batch number is clearly printed and matches across outer packaging, strip, and invoice whenever possible.',
  },
  {
    title: 'Avoid Loose Unlabeled Medicines',
    description:
      'Prefer sealed strips or bottles with printed details. Loose or repacked pills increase tampering risk.',
  },
  {
    title: 'Use QR / Digital Verification',
    description:
      'When available, scan official QR codes. If details do not match or do not appear, do not consume the medicine.',
  },
];

export default function FakeMedicineGuide() {
  return (
    <motion.div
      className="min-h-screen px-4 py-12 max-w-5xl mx-auto relative z-10"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="mb-12">
        <Link to="/home" className="font-mono text-xs text-mv-teal hover:underline mb-6 inline-flex items-center gap-1.5 block">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
        </Link>
        <div className="flex items-center gap-3 mb-4">
          <ShieldAlert className="h-7 w-7 text-mv-danger flex-shrink-0" />
          <h1 className="font-mono text-3xl font-bold text-white uppercase tracking-widest">
            Fake Medicine Safety Guide
          </h1>
        </div>
        <p className="font-sans text-gray-400 mt-3 max-w-3xl leading-relaxed">
          Quick checks every patient can do before consuming medicines. This is an awareness guide and does not replace professional medical advice.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {GUIDELINES.map((item, index) => (
          <motion.div
            key={item.title}
            className="clinical-card clinical-card-left"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * index }}
          >
            <h2 className="font-mono text-xs uppercase tracking-widest text-white mb-2 inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-mv-teal" />
              {item.title}
            </h2>
            <p className="font-sans text-sm text-gray-400 leading-relaxed">{item.description}</p>
          </motion.div>
        ))}
      </div>

      <div className="clinical-card mt-6 border-mv-border/70">
        <p className="font-mono text-[11px] uppercase tracking-widest text-mv-warning mb-2">Important</p>
        <p className="font-sans text-sm text-gray-400 leading-relaxed">
          If a medicine seems suspicious, avoid self-medication, keep the strip/package, and report it to a licensed pharmacist or local drug safety authority.
        </p>
      </div>
    </motion.div>
  );
}