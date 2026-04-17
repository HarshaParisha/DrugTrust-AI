import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { analyzeMedicineByScan } from '../api/medverify';
import { safeSessionStorageSet } from '../utils/scanCache';
import {
  Pill,
  Package,
  AlertTriangle,
  Clock,
  Droplet,
  Eye,
  Zap,
  Thermometer,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function MedicineDetailsPanel({ scanId, imageHash, onAnalyze, baseData }) {
  const [medicineData, setMedicineData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(true);

  const buildProfessionalFallbackData = () => ({
    medicine_name: baseData?.medicine_name || 'Not clearly visible — verify medicine name on physical pack',
    dosage: baseData?.dosage || 'Dose not clearly visible — follow doctor prescription only',
    manufacturer: baseData?.manufacturer || 'Manufacturer details not clearly visible',
    ingredients: ['Use only if active ingredient matches the prescribed medicine.'],
    batch_number: baseData?.batch_number || 'Not visible — verify batch/lot before use',
    expiry_date: baseData?.expiry_date || 'Not visible — verify expiry date before use',
    instructions: 'Take strictly as prescribed. Do not increase dose frequency without clinician advice.',
    precautions: [
      'Verify medicine name, strength, and expiry from original strip/carton before administration.',
      'Do not consume tampered or poorly printed packaging.',
      'Keep invoice and package for traceability in case of adverse events.',
      'Consult a licensed doctor/pharmacist if any mismatch is observed.',
    ],
    side_effects: [
      'Seek urgent medical care for breathing difficulty, facial swelling, or severe rash.',
      'Stop use and consult doctor if severe dizziness, vomiting, or unusual reactions occur.',
    ],
    storage: 'Store in a cool, dry place away from direct sunlight unless label states otherwise.',
    authenticity_assessment: 'CLINICAL REVIEW REQUIRED',
    confidence_score: 0,
    analysis_notes: 'Advanced AI analysis unavailable; showing professional safety fallback guidance.',
    risk_tier: 'MEDIUM',
    risk_label: baseData?.risk_label || '⚠ Manual verification advised',
    recommendation: 'Use only after pharmacist/doctor verification if pack details are unclear.',
    source: 'professional_fallback',
  });

  const normalizeMedicineData = (raw) => {
    const fallback = buildProfessionalFallbackData();
    const merged = { ...fallback, ...(raw || {}) };
    return {
      ...merged,
      medicine_name: merged.medicine_name || fallback.medicine_name,
      dosage: merged.dosage || fallback.dosage,
      manufacturer: merged.manufacturer || fallback.manufacturer,
      ingredients: Array.isArray(merged.ingredients) && merged.ingredients.length > 0 ? merged.ingredients : fallback.ingredients,
      batch_number: (!merged.batch_number || merged.batch_number === 'Not visible') ? fallback.batch_number : merged.batch_number,
      expiry_date: (!merged.expiry_date || merged.expiry_date === 'Not visible') ? fallback.expiry_date : merged.expiry_date,
      instructions: merged.instructions || fallback.instructions,
      precautions: Array.isArray(merged.precautions) && merged.precautions.length > 0 ? merged.precautions : fallback.precautions,
      side_effects: Array.isArray(merged.side_effects) && merged.side_effects.length > 0 ? merged.side_effects : fallback.side_effects,
      storage: merged.storage || fallback.storage,
      recommendation: merged.recommendation || fallback.recommendation,
      confidence_score: typeof merged.confidence_score === 'number' ? merged.confidence_score : fallback.confidence_score,
      risk_label: merged.risk_label || fallback.risk_label,
      risk_tier: merged.risk_tier || fallback.risk_tier,
    };
  };

  const runAnalysis = async ({ hash, scan }) => {
    if (!hash && !scan) {
      setError('No image available for AI analysis.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      let result = null;

      // Preferred path: analyze directly from server-side stored scan image
      if (scan) {
        try {
          const scanResult = await analyzeMedicineByScan(scan);
          if (scanResult?.data) {
            result = scanResult;
          }
        } catch (scanErr) {
          const msg = String(scanErr?.message || '').toLowerCase();
          const scanMissing = msg.includes('not found') || msg.includes('404');
          if (!scanMissing) {
            throw scanErr;
          }
          // Continue to hash-based fallback when scan lookup misses.
        }
      }

      // Fallback path: fetch uploaded image and re-submit
      if (!result) {
        const imageResponse = await fetch(`${API_URL}/uploads/${hash}.jpg`);
        if (!imageResponse.ok) {
          throw new Error('Could not fetch uploaded image for analysis.');
        }

        const imageBlob = await imageResponse.blob();
        const imageFile = new File([imageBlob], `medicine_${hash}.jpg`, { type: 'image/jpeg' });

        const formData = new FormData();
        formData.append('image', imageFile);

        const analysisResponse = await fetch(`${API_URL}/verify/analyze-medicine`, {
          method: 'POST',
          body: formData,
        });

        if (!analysisResponse.ok) {
          const errData = await analysisResponse.json().catch(() => ({}));
          throw new Error(errData.detail || `Analysis failed (${analysisResponse.status})`);
        }

        result = await analysisResponse.json();
      }

      if (result?.data) {
        const normalized = normalizeMedicineData(result.data);
        setMedicineData(normalized);
        safeSessionStorageSet(`medicine_${scanId}`, JSON.stringify(normalized));
        setExpanded(true);
        if (onAnalyze) onAnalyze(normalized);
      } else {
        throw new Error('AI returned no medicine details.');
      }
    } catch (err) {
      const raw = (err && err.message) ? String(err.message) : '';
      const normalized = raw.toLowerCase();
      if (normalized.includes('failed to fetch') || normalized.includes('networkerror')) {
        setError(`Cannot reach AI analysis service at ${API_URL}. Ensure backend is running and VITE_API_URL points to the correct server.`);
        const fallback = normalizeMedicineData(null);
        setMedicineData(fallback);
        if (onAnalyze) onAnalyze(fallback);
      } else {
        setError(raw || 'Medicine analysis failed.');
        const fallback = normalizeMedicineData(null);
        setMedicineData(fallback);
        if (onAnalyze) onAnalyze(fallback);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Try to load cached medicine data
    const cached = sessionStorage.getItem(`medicine_${scanId}`);
    if (cached) {
      try {
        setMedicineData(normalizeMedicineData(JSON.parse(cached)));
        setExpanded(true);
      } catch {}
    }
  }, [scanId]);

  // Auto-analyze image when component mounts (unless already cached)
  useEffect(() => {
    if (!imageHash || medicineData || loading) return;
    runAnalysis({ hash: imageHash, scan: scanId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageHash, medicineData]);

  const getRiskColor = (apiKey) => {
    if (!apiKey) return 'text-gray-400';
    const tier = apiKey.risk_tier || '';
    if (tier === 'VERY_LOW') return 'text-emerald-300';
    if (tier === 'LOW') return 'text-emerald-200';
    if (tier === 'MEDIUM') return 'text-amber-300';
    if (tier === 'HIGH') return 'text-orange-300';
    if (tier === 'CRITICAL') return 'text-red-300';
    return 'text-gray-400';
  };

  const getConfidenceColor = (score) => {
    if (!score) return 'text-gray-400';
    if (score >= 95) return 'text-emerald-400';
    if (score >= 85) return 'text-lime-400';
    if (score >= 70) return 'text-amber-400';
    if (score >= 50) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <motion.section
      className="clinical-card mb-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-3 py-2 hover:opacity-75 transition-opacity"
      >
        <div className="flex items-center gap-2">
          <Pill className="h-5 w-5 text-mv-teal flex-shrink-0" />
          <h2 className="font-mono text-sm uppercase tracking-widest text-mv-teal">
            Advanced Medicine Analysis
          </h2>
        </div>
        <div className={`transition-transform ${expanded ? 'rotate-180' : ''}`}>
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </div>
      </button>

      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="border-t border-slate-700 pt-4 mt-4">
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block">
                <div className="animate-spin mb-2">
                  <Zap className="h-5 w-5 text-mv-teal" />
                </div>
                <p className="font-mono text-xs text-gray-400 uppercase tracking-wider">
                  Analyzing medicine with AI...
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/40 rounded p-3 mb-4">
              <p className="font-mono text-xs text-red-300">{error}</p>
              <button
                type="button"
                onClick={() => runAnalysis({ hash: imageHash, scan: scanId })}
                className="mt-2 mv-button mv-button-secondary"
              >
                Retry AI Analysis
              </button>
            </div>
          )}

          {!medicineData && !loading && !error && (
            <div className="bg-slate-900/40 border border-slate-700 rounded p-3 mb-4">
              <p className="font-sans text-sm text-gray-300">
                No AI medicine details yet. Click below to analyze this image and fill missing medicine fields.
              </p>
              <button
                type="button"
                onClick={() => runAnalysis({ hash: imageHash, scan: scanId })}
                className="mt-2 mv-button mv-button-primary"
              >
                Analyze Medicine Details
              </button>
            </div>
          )}

          {medicineData && !loading && (
            <div className="space-y-4">
              {/* Confidence Score */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-900/50 rounded p-3 border border-slate-800">
                  <p className="font-mono text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                    Confidence Score
                  </p>
                  <p className={`font-mono text-2xl font-bold ${getConfidenceColor(medicineData.confidence_score)}`}>
                    {medicineData.confidence_score?.toFixed(1) || '--'}%
                  </p>
                </div>
                <div className="bg-slate-900/50 rounded p-3 border border-slate-800">
                  <p className="font-mono text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                    Assessment
                  </p>
                  <p className={`font-mono text-xs font-bold ${getRiskColor(medicineData)}`}>
                    {medicineData.authenticity_assessment || '--'}
                  </p>
                  <p className={`font-mono text-xs mt-1 ${getRiskColor(medicineData)}`}>
                    {medicineData.risk_label || ''}
                  </p>
                </div>
              </div>

              {/* Recommendation Box */}
              {medicineData.recommendation && (
                <div
                  className={`border rounded p-3 mb-4 ${
                    medicineData.confidence_score >= 95
                      ? 'bg-emerald-500/10 border-emerald-500/40'
                      : medicineData.confidence_score >= 85
                      ? 'bg-lime-500/10 border-lime-500/40'
                      : medicineData.confidence_score >= 70
                      ? 'bg-amber-500/10 border-amber-500/40'
                      : 'bg-red-500/10 border-red-500/40'
                  }`}
                >
                  <p className="font-mono text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                    Recommendation
                  </p>
                  <p className="font-sans text-sm text-gray-200">
                    {medicineData.recommendation}
                  </p>
                </div>
              )}

              {/* Medicine Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Medicine Name */}
                {medicineData.medicine_name && (
                  <div className="clinical-card-left border-l-4 border-l-mv-teal">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500 mb-1 inline-flex items-center gap-1.5">
                      <Pill className="h-3 w-3" /> Medicine Name
                    </p>
                    <p className="font-sans text-sm text-white break-words">
                      {medicineData.medicine_name}
                    </p>
                  </div>
                )}

                {/* Dosage */}
                {medicineData.dosage && (
                  <div className="clinical-card-left border-l-4 border-l-mv-amber">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500 mb-1 inline-flex items-center gap-1.5">
                      <Droplet className="h-3 w-3" /> Dosage
                    </p>
                    <p className="font-sans text-sm text-white">{medicineData.dosage}</p>
                  </div>
                )}

                {/* Manufacturer */}
                {medicineData.manufacturer && (
                  <div className="clinical-card-left border-l-4 border-l-mv-teal">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500 mb-1 inline-flex items-center gap-1.5">
                      <Package className="h-3 w-3" /> Manufacturer
                    </p>
                    <p className="font-sans text-sm text-white">{medicineData.manufacturer}</p>
                  </div>
                )}

                {/* Batch Number */}
                {medicineData.batch_number && medicineData.batch_number !== 'Not visible' && (
                  <div className="clinical-card-left border-l-4 border-l-mv-amber">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                      Batch / Lot Number
                    </p>
                    <p className="font-mono text-sm text-mv-amber font-bold">{medicineData.batch_number}</p>
                  </div>
                )}

                {/* Expiry Date */}
                {medicineData.expiry_date && medicineData.expiry_date !== 'Not visible' && (
                  <div className="clinical-card-left border-l-4 border-l-mv-danger">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500 mb-1 inline-flex items-center gap-1.5">
                      <Clock className="h-3 w-3" /> Expiry Date
                    </p>
                    <p className="font-sans text-sm text-white">{medicineData.expiry_date}</p>
                  </div>
                )}

                {/* Storage */}
                {medicineData.storage && (
                  <div className="clinical-card-left border-l-4 border-l-mv-amber">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500 mb-1 inline-flex items-center gap-1.5">
                      <Thermometer className="h-3 w-3" /> Storage
                    </p>
                    <p className="font-sans text-sm text-white break-words">{medicineData.storage}</p>
                  </div>
                )}
              </div>

              {/* Instructions */}
              {medicineData.instructions && (
                <div className="clinical-card bg-blue-500/10 border-blue-500/40">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-blue-300 mb-2 inline-flex items-center gap-1.5">
                    <Eye className="h-3 w-3" /> How to Use
                  </p>
                  <p className="font-sans text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                    {medicineData.instructions}
                  </p>
                </div>
              )}

              {/* Ingredients */}
              {medicineData.ingredients && medicineData.ingredients.length > 0 && (
                <div className="clinical-card">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-gray-400 mb-2">
                    Active Ingredients
                  </p>
                  <ul className="space-y-1">
                    {medicineData.ingredients.map((ing, idx) => (
                      <li key={idx} className="font-sans text-sm text-gray-300 flex items-start gap-2">
                        <span className="text-mv-teal mt-1">•</span>
                        <span>{ing}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Precautions */}
              {medicineData.precautions && medicineData.precautions.length > 0 && (
                <div className="clinical-card bg-amber-500/10 border-amber-500/40">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-amber-300 mb-2 inline-flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3" /> Precautions & Warnings
                  </p>
                  <ul className="space-y-1.5">
                    {medicineData.precautions.map((prec, idx) => (
                      <li key={idx} className="font-sans text-sm text-gray-200 flex items-start gap-2">
                        <span className="text-amber-400 mt-1">✓</span>
                        <span>{prec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Side Effects */}
              {medicineData.side_effects && medicineData.side_effects.length > 0 && (
                <div className="clinical-card bg-orange-500/10 border-orange-500/40">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-orange-300 mb-2 inline-flex items-center gap-1.5">
                    <AlertCircle className="h-3 w-3" /> Possible Side Effects
                  </p>
                  <ul className="space-y-1.5">
                    {medicineData.side_effects.map((effect, idx) => (
                      <li key={idx} className="font-sans text-sm text-gray-300 flex items-start gap-2">
                        <span className="text-orange-400 mt-1">⚠</span>
                        <span>{effect}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            </div>
          )}
        </div>
      </motion.div>
    </motion.section>
  );
}
