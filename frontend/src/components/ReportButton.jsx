import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Flag, Check } from 'lucide-react';
import { reportScan } from '../api/medverify';

export default function ReportButton({ scanId }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, loading]);

  const submit = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      await reportScan(scanId, note);
      setSubmitted(true);
      setSuccess(true);
      window.setTimeout(() => {
        setOpen(false);
        setSuccess(false);
      }, 700);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    if (loading) return;
    setOpen(false);
    setError('');
  };

  const modal = (
    <AnimatePresence mode="wait" initial={false}>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1200] bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-label="Report suspicious medicine"
        >
          <motion.div
            className="clinical-card w-full max-w-md shadow-2xl"
            initial={{ y: 12, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 8, scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-mono text-mv-danger text-sm uppercase tracking-widest mb-4">
              <span className="inline-flex items-center gap-1.5">
                <Flag className="h-4 w-4" /> Report Suspicious Medicine
              </span>
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Describe your concern (optional)..."
              rows={4}
              disabled={loading || success}
              className="w-full bg-[color:var(--card-bg)] border border-mv-border text-gray-300 font-sans text-sm p-3 resize-none outline-none focus:border-mv-teal disabled:opacity-70"
            />
            {error && <p className="font-mono text-mv-danger text-xs mt-2">{error}</p>}
            {success && <p className="font-mono text-emerald-400 text-xs mt-2">Report submitted successfully.</p>}
            <div className="flex gap-3 mt-4">
              <button
                onClick={closeModal}
                disabled={loading}
                className="flex-1 mv-button mv-button-secondary disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={loading || success}
                className="flex-1 mv-button mv-button-danger disabled:opacity-40"
              >
                {loading ? 'Submitting...' : success ? 'Submitted' : 'Submit Report'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div>
      <button
        onClick={() => !submitted && setOpen(true)}
        disabled={submitted}
        className={`w-full mv-button ${submitted ? 'mv-button-secondary text-emerald-400 cursor-default' : 'mv-button-ghost text-gray-400 hover:text-mv-teal'}`}
      >
        {submitted ? (
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5" /> Report Submitted
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <Flag className="h-3.5 w-3.5" /> Issue with scan? Flag for review
          </span>
        )}
      </button>
      {createPortal(modal, document.body)}
    </div>
  );
}
