import React, { useId } from 'react';

function getPrescriptionMeta(prescription, requiresPrescription) {
  const value = String(prescription || '').trim();
  const normalized = value.toLowerCase();

  if (!value || normalized === 'otc') {
    return {
      title: 'OTC (Over-the-counter)',
      description:
        'Usually available without a prescription. Use only as directed and follow safety warnings.',
    };
  }

  if (normalized.includes('schedule h1')) {
    return {
      title: 'Schedule H1',
      description:
        'Prescription-only medicine with tighter dispensing controls. Use strictly under medical supervision.',
    };
  }

  if (normalized.includes('schedule x')) {
    return {
      title: 'Schedule X',
      description:
        'Highly controlled prescription medicine. Dispensing and refill rules are strictly regulated.',
    };
  }

  if (normalized.includes('schedule h')) {
    return {
      title: 'Schedule H',
      description:
        'Prescription-only medicine. A licensed doctor\'s prescription is required before use.',
    };
  }

  return {
    title: requiresPrescription ? 'Prescription required' : 'General safety guidance',
    description: requiresPrescription
      ? 'Use only after consulting a doctor or pharmacist.'
      : 'Use responsibly and follow the recommended dosage and timing.',
  };
}

export default function PrescriptionBadge({ prescription, requiresPrescription }) {
  const tooltipId = useId();
  const meta = getPrescriptionMeta(prescription, requiresPrescription);

  return (
    <div className="relative group inline-flex items-center">
      <span
        tabIndex={0}
        aria-describedby={tooltipId}
        className={`px-2 py-1 text-[10px] rounded-md border cursor-help transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${
          requiresPrescription
            ? 'border-amber-500/30 text-amber-300 bg-amber-500/10'
            : 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10'
        }`}
      >
        {prescription}
      </span>

      <div
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none absolute right-0 top-[calc(100%+8px)] z-30 w-72 rounded-xl border border-slate-700/70 bg-slate-900/95 p-3 text-left text-xs text-slate-200 shadow-2xl backdrop-blur-sm opacity-0 translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0"
      >
        <p className="font-semibold text-slate-100 mb-1">{meta.title}</p>
        <p className="leading-relaxed text-slate-300">{meta.description}</p>
        <span className="absolute -top-1.5 right-4 h-3 w-3 rotate-45 border-l border-t border-slate-700/70 bg-slate-900/95" />
      </div>
    </div>
  );
}
