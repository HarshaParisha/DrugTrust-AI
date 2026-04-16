import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  ArrowLeft,
  History,
  ShieldCheck,
  Pill,
  CalendarClock,
  FileCheck2,
  AlertTriangle,
  ChevronDown,
  PlugZap,
  Wifi,
  WifiOff,
  Fingerprint,
} from 'lucide-react';
import { getScan, getLLMStatus } from '../api/medverify';
import OCRPanel from '../components/OCRPanel';
import HeatmapOverlay from '../components/HeatmapOverlay';
import ReportButton from '../components/ReportButton';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Result({ cachedResult }) {
  const { scanId }   = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [llmStatus, setLlmStatus] = useState({ connected: false, model: 'mistral:latest' });
  const [llmLoading, setLlmLoading] = useState(true);

  useEffect(() => {
    // Try sessionStorage first
    const cached = sessionStorage.getItem(`scan_${scanId}`);
    if (cached) {
      try { setResult(JSON.parse(cached)); setLoading(false); return; } catch {}
    }
    // Fetch from API
    getScan(scanId)
      .then(setResult)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [scanId]);

  useEffect(() => {
    let active = true;

    const poll = async () => {
      try {
        const status = await getLLMStatus();
        if (active) {
          setLlmStatus({ connected: Boolean(status.connected), model: status.model || 'mistral:latest' });
          setLlmLoading(false);
        }
      } catch {
        if (active) {
          setLlmStatus({ connected: false, model: 'mistral:latest' });
          setLlmLoading(false);
        }
      }
    };

    poll();
    const timer = setInterval(poll, 10000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="font-mono text-mv-teal animate-pulse tracking-widest">
        Loading scan results...
      </p>
    </div>
  );
  if (error || !result) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="clinical-card text-center max-w-md">
        <p className="font-mono text-mv-danger mb-2">Scan not found</p>
        <p className="font-sans text-gray-500 text-sm">{error || 'The scan result could not be loaded.'}</p>
        <Link to="/home" className="mv-button mv-button-primary mt-4"><ArrowLeft className="h-3.5 w-3.5" /> Run new scan</Link>
      </div>
    </div>
  );

  const imageURL = result.image_hash
    ? `${API_URL}/uploads/${result.image_hash}.jpg`
    : null;

  const ocr = result.ocr || {};
  const intel = result.prescription_intel || {};
  const vision = result.vision || {};
  const reference = result.reference_match || {};
  const hasReference = Boolean(reference?.available);
  const refMatched = reference?.is_match === true;
  const refMismatched = reference?.is_match === false;
  const riskTone =
    result.risk_tier >= 5
      ? 'text-red-400 border-red-500/40 bg-red-500/10'
      : result.risk_tier >= 4
        ? 'text-orange-300 border-orange-500/40 bg-orange-500/10'
        : 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10';

  const topAlerts = [
    ocr.expiry_status === 'EXPIRED' ? 'Immediate hold advised: pack appears expired. Do not administer.' : null,
    result.flags?.length ? `Verification concerns documented: ${result.flags.join(', ')}` : null,
    intel.overdose_warning || null,
    refMismatched ? 'Reference review suggests visual mismatch versus known genuine pack set.' : null,
    ocr.ocr_confidence_score < 60 ? 'Text extraction confidence is limited; manual label confirmation is recommended.' : null,
    vision.uncertainty_level === 'HIGH' ? 'Model uncertainty remains high; clinician/pharmacist review advised before use.' : null,
  ].filter(Boolean);

  const shortBrief = intel.how_to_take
    ? String(intel.how_to_take).split('\n').filter(Boolean).slice(0, 2).join(' ')
    : 'No model-generated dosing brief is available for this scan. Use the prescribed label directions and verify with a licensed clinician.';

  const displayMedicineName = ocr.medicine_name || 'Not clearly visible — confirm from physical label';
  const displayExpiry = ocr.expiry_date || 'Not clearly visible — verify before use';
  const displayDosage = ocr.dosage_strength || 'Dose not clearly visible — follow doctor prescription only';
  const displayManufacturer = ocr.manufacturer_name || 'Manufacturer not clearly visible on pack';
  const displayBatch = ocr.batch_number || 'Batch/lot not clearly visible';

  const professionalPoints = [
    `Confirm medicine identity (${displayMedicineName}) and strength (${displayDosage}) against the written prescription before administration.`,
    displayExpiry?.toLowerCase().includes('not clearly') || displayExpiry?.toLowerCase().includes('not visible')
      ? 'Expiry is not reliably extracted; check printed month/year on strip or carton before use.'
      : `Expiry observed: ${displayExpiry}. Do not use if date has passed or label appears altered.`,
    displayBatch?.toLowerCase().includes('not')
      ? 'Batch/lot is unclear; retain purchase invoice and verify pack traceability with pharmacist.'
      : `Record batch/lot ${displayBatch} for traceability and adverse-event reporting if needed.`,
    refMismatched
      ? 'Packaging mismatch against reference set: hold use and obtain pharmacist verification prior to dosing.'
      : 'If packaging condition appears intact, continue only as per prescribed regimen.',
    'Monitor for allergy signs (rash, swelling, breathing difficulty). Seek urgent care immediately if these occur.',
    'Avoid self-adjusting dose frequency or quantity without clinician advice.',
  ];

  return (
    <motion.div
      className="min-h-screen px-4 py-6 md:py-8 max-w-6xl mx-auto relative z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <header className="mb-6 md:mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-mv-teal font-bold text-lg tracking-widest uppercase">Drugtrust AI</span>
            <span className="font-mono text-gray-500 text-xs">Scan: {result.scan_id?.slice(0, 8)}</span>
          </div>
          <span className="font-mono text-gray-500 text-xs">
            {result.timestamp?.slice(0, 19).replace('T', ' ')} UTC
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link to="/home" className="tap-target mv-button mv-button-secondary">
            <ArrowLeft className="h-3.5 w-3.5" /> New Scan
          </Link>
          <Link to="/history" className="tap-target mv-button mv-button-secondary">
            <History className="h-3.5 w-3.5" /> History
          </Link>
          <Link to="/search" className="tap-target mv-button mv-button-primary">
            <Search className="h-3.5 w-3.5" /> Search Medicines
          </Link>
        </div>
      </header>

      <section className="clinical-card clinical-card-hover mb-5" aria-labelledby="result-summary-heading">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 id="result-summary-heading" className="font-mono text-sm md:text-base uppercase tracking-widest text-mv-teal mb-3">
              Clinical Verification Note
            </h1>
            <div className="mb-3">
              <span
                className={`font-mono text-[10px] uppercase tracking-wider inline-flex items-center gap-1.5 px-2.5 py-1 border rounded ${
                  llmStatus.connected
                    ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10'
                    : 'text-amber-300 border-amber-500/40 bg-amber-500/10'
                }`}
                aria-live="polite"
              >
                {llmLoading ? (
                  <Wifi className="h-3 w-3 animate-pulse" />
                ) : llmStatus.connected ? (
                  <Wifi className="h-3 w-3" />
                ) : (
                  <WifiOff className="h-3 w-3" />
                )}
                LLM {llmLoading ? 'Checking...' : llmStatus.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`font-mono text-xs uppercase tracking-wider px-3 py-1 border rounded ${riskTone}`}>
                {result.risk_label}
              </span>
              <span className="font-mono text-xs text-gray-400">Tier {result.risk_tier}</span>
            </div>
            <p className="font-sans text-gray-300 text-sm md:text-[15px] leading-relaxed max-w-2xl">
              {result.action_required || 'Review this scan carefully before using the medicine.'}
            </p>
            {!llmLoading && !llmStatus.connected && (
              <div className="mt-3">
                <Link
                  to="/llm-setup"
                  className="mv-button mv-button-secondary text-amber-300 border-amber-500/40"
                >
                  <PlugZap className="h-3.5 w-3.5" /> Connect LLM on this device
                </Link>
              </div>
            )}
          </div>

          <div className="text-left md:text-right">
            <p className="font-mono text-gray-500 text-[10px] uppercase tracking-wider">Confidence</p>
            <p className="font-mono text-3xl font-bold text-white">
              {typeof result.final_confidence === 'number' ? result.final_confidence.toFixed(1) : '--'}%
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-5" aria-label="Key scan details">
        <article className="clinical-card clinical-card-hover py-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500 mb-2 inline-flex items-center gap-1.5">
            <Pill className="h-3.5 w-3.5" /> Medicine
          </p>
          <p className="font-sans text-white text-sm break-words">{displayMedicineName}</p>
        </article>

        <article className="clinical-card clinical-card-hover py-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500 mb-2 inline-flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" /> Expiry
          </p>
          <p className="font-sans text-white text-sm">{displayExpiry}</p>
          <p className="font-mono text-[10px] text-gray-500 mt-1">Status: {ocr.expiry_status || 'UNKNOWN'}</p>
        </article>

        <article className="clinical-card clinical-card-hover py-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500 mb-2 inline-flex items-center gap-1.5">
            <FileCheck2 className="h-3.5 w-3.5" /> Prescription
          </p>
          <p className="font-sans text-white text-sm">
            {intel.requires_prescription === true
              ? 'Required'
              : intel.requires_prescription === false
                ? 'Not required'
                : 'Not available'}
          </p>
        </article>

        <article className="clinical-card clinical-card-hover py-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500 mb-2 inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Authenticity
          </p>
          <p className="font-sans text-white text-sm">{result.risk_label || 'Unknown'}</p>
        </article>

        <article className="clinical-card clinical-card-hover py-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500 mb-2 inline-flex items-center gap-1.5">
            <Fingerprint className="h-3.5 w-3.5" /> Package Match
          </p>
          {!hasReference ? (
            <>
              <p className="font-sans text-white text-sm">Not configured</p>
              <p className="font-mono text-[10px] text-gray-500 mt-1">No internal references loaded</p>
            </>
          ) : reference?.is_match == null ? (
            <>
              <p className="font-sans text-white text-sm">Inconclusive</p>
              <p className="font-mono text-[10px] text-gray-500 mt-1">Distance unavailable</p>
            </>
          ) : (
            <>
              <p className={`font-sans text-sm ${refMatched ? 'text-emerald-300' : 'text-orange-300'}`}>
                {refMatched ? 'Reference Match' : 'Reference Mismatch'}
              </p>
              <p className="font-mono text-[10px] text-gray-500 mt-1">
                d={typeof reference.best_distance === 'number' ? reference.best_distance.toFixed(4) : '--'} | thr={typeof reference.threshold === 'number' ? reference.threshold.toFixed(4) : '--'}
              </p>
            </>
          )}
        </article>
      </section>

      {topAlerts.length > 0 && (
        <section className="clinical-card clinical-card-hover mb-5" aria-live="polite" aria-label="Important alerts">
          <h2 className="font-mono text-xs uppercase tracking-widest text-mv-amber mb-3 inline-flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Priority Safety Notes
          </h2>
          <ul className="space-y-2 list-disc list-inside">
            {topAlerts.map((msg, idx) => (
              <li key={idx} className="font-sans text-sm text-gray-300">
                {msg}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
        <article className="clinical-card clinical-card-hover xl:col-span-2" aria-labelledby="clinical-guidance-title">
          <h2 id="clinical-guidance-title" className="font-mono text-xs uppercase tracking-widest text-mv-teal mb-3">
            Attending Physician Impression
          </h2>
          <p className="font-sans text-gray-300 text-sm leading-relaxed mb-3">
            {shortBrief}
          </p>
          <ul className="space-y-2 list-disc list-inside mb-3">
            {professionalPoints.map((point, idx) => (
              <li key={idx} className="font-sans text-sm text-gray-300 leading-relaxed">
                {point}
              </li>
            ))}
          </ul>
          {hasReference && (
            <p className="font-sans text-sm leading-relaxed mb-3 text-gray-400">
              Reference assessment: {refMatched ? 'Packaging is visually consistent with your genuine reference library.' : refMismatched ? 'Packaging differs from your genuine reference library; pharmacist verification is strongly advised.' : 'Reference evidence is presently insufficient for a definitive packaging conclusion.'}
            </p>
          )}
          <p className="font-mono text-[11px] text-gray-500">
            Clinical recommendation: {intel.consult_reminder || result.consult_reminder || 'Always consult a licensed doctor or pharmacist before taking medicine.'}
          </p>
        </article>

        <article className="clinical-card clinical-card-hover" aria-labelledby="scan-preview-title">
          <h2 id="scan-preview-title" className="font-mono text-xs uppercase tracking-widest text-mv-teal mb-3">
            Scan Preview
          </h2>
          <div className="border border-mv-border bg-black/20 min-h-40 flex items-center justify-center overflow-hidden">
            {imageURL ? (
              <img src={imageURL} alt="Uploaded medicine scan" className="max-h-48 w-full object-contain" />
            ) : (
              <p className="font-mono text-xs text-gray-600">No image preview available</p>
            )}
          </div>
        </article>
      </section>

      <section className="clinical-card clinical-card-hover mb-5" aria-labelledby="critical-fields-title">
        <h2 id="critical-fields-title" className="font-mono text-xs uppercase tracking-widest text-mv-teal mb-3">
          Critical Extracted Fields
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="border border-mv-border p-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500">Dosage</p>
            <p className="font-sans text-sm text-white mt-1">{displayDosage}</p>
          </div>
          <div className="border border-mv-border p-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500">Manufacturer</p>
            <p className="font-sans text-sm text-white mt-1">{displayManufacturer}</p>
          </div>
          <div className="border border-mv-border p-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500">Batch Number</p>
            <p className="font-sans text-sm text-white mt-1">{displayBatch}</p>
          </div>
        </div>
      </section>

      <section className="clinical-card clinical-card-hover mb-5" aria-labelledby="heatmap-evidence-title">
        <h2 id="heatmap-evidence-title" className="font-mono text-xs uppercase tracking-widest text-mv-teal mb-3">
          AI Focus Heatmap
        </h2>
        {result.heatmap_base64 ? (
          <HeatmapOverlay originalSrc={imageURL} heatmapBase64={result.heatmap_base64} />
        ) : (
          <p className="font-sans text-sm text-gray-400">
            Heatmap evidence is unavailable for this scan. Re-scan once with AI focus map enabled.
          </p>
        )}
      </section>

      <details className="clinical-card clinical-card-hover group mb-4">
        <summary className="cursor-pointer list-none font-mono text-xs uppercase tracking-wider text-mv-teal inline-flex items-center gap-2">
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
          OCR Extracted Fields (clinician view)
        </summary>
        <div className="mt-4 border border-mv-border bg-black/20 p-3">
          <OCRPanel ocr={ocr} />
        </div>
      </details>

      <section className="clinical-card clinical-card-hover">
        <ReportButton scanId={result.scan_id} />
      </section>
    </motion.div>
  );
}
