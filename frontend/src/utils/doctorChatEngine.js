const STOP_WORDS = new Set([
  'i', 'me', 'my', 'am', 'is', 'are', 'the', 'a', 'an', 'to', 'for', 'of', 'and', 'or', 'with', 'without',
  'have', 'has', 'had', 'from', 'in', 'on', 'at', 'by', 'this', 'that', 'it', 'im', 'feeling', 'need', 'want',
  'please', 'help', 'medicine', 'tablet', 'tablets', 'drug', 'disease', 'problem',
]);

const CATEGORY_HINTS = {
  'fever-cold': ['fever', 'cold', 'chills', 'sneezing', 'blocked nose', 'runny nose', 'flu', 'throat pain'],
  'headache-migraine': ['headache', 'migraine', 'head pain', 'sinus headache', 'aura', 'dizziness'],
  'stomach-pain-and-acidity': ['acidity', 'heartburn', 'gas', 'bloating', 'stomach pain', 'ulcer', 'gerd'],
  'diarrhea-and-vomiting': ['diarrhea', 'loose motion', 'vomit', 'vomiting', 'nausea', 'dehydration'],
  diabetes: ['diabetes', 'sugar', 'high glucose', 'blood sugar', 'insulin'],
  'blood-pressure': ['bp', 'blood pressure', 'hypertension', 'high pressure'],
  'antibiotics-and-infection': ['infection', 'bacterial', 'antibiotic', 'pus', 'uti', 'throat infection'],
  'pain-and-inflammation': ['pain', 'inflammation', 'joint pain', 'arthritis', 'sprain', 'muscle pain'],
  'allergy-and-skin': ['allergy', 'rash', 'itching', 'urticaria', 'skin', 'eczema', 'fungal'],
  'vitamins-and-supplements': ['vitamin', 'supplement', 'deficiency', 'weakness', 'nutrition'],
  'cough-and-throat': ['cough', 'throat', 'phlegm', 'dry cough', 'chest congestion'],
  'eye-and-ear-drops': ['eye', 'ear', 'conjunctivitis', 'ear pain', 'dry eyes', 'ear wax'],
  thyroid: ['thyroid', 'tsh', 'hypothyroid', 'hyperthyroid'],
  'heart-and-cholesterol': ['cholesterol', 'heart', 'angina', 'lipid', 'ldl', 'statin'],
  'womens-health': ['period', 'pregnancy', 'women', 'pcos', 'ovulation', 'menstrual'],
};

const CATEGORY_LABELS = {
  general: 'General Consultation',
  'fever-cold': 'Fever & Cold',
  'headache-migraine': 'Headache & Migraine',
  'stomach-pain-and-acidity': 'Stomach Pain & Acidity',
  'diarrhea-and-vomiting': 'Diarrhea & Vomiting',
  diabetes: 'Diabetes',
  'blood-pressure': 'Blood Pressure',
  'antibiotics-and-infection': 'Antibiotics & Infection',
  'pain-and-inflammation': 'Pain & Inflammation',
  'allergy-and-skin': 'Allergy & Skin',
  'vitamins-and-supplements': 'Vitamins & Supplements',
  'cough-and-throat': 'Cough & Throat',
  'eye-and-ear-drops': 'Eye & Ear Drops',
  thyroid: 'Thyroid',
  'heart-and-cholesterol': 'Heart & Cholesterol',
  'womens-health': "Women's Health",
};

const DIAGNOSIS_BY_CATEGORY = {
  'fever-cold': 'Acute viral febrile upper respiratory syndrome (provisional)',
  'headache-migraine': 'Primary headache / migraine spectrum (provisional)',
  'stomach-pain-and-acidity': 'Acid-peptic or functional dyspepsia syndrome (provisional)',
  'diarrhea-and-vomiting': 'Acute gastroenteritis pattern (provisional)',
  diabetes: 'Glycemic symptom profile requiring diabetic control review (provisional)',
  'blood-pressure': 'Hypertensive symptom profile (provisional)',
  'antibiotics-and-infection': 'Likely bacterial/infective presentation requiring clinical confirmation',
  'pain-and-inflammation': 'Acute inflammatory pain syndrome (provisional)',
  'allergy-and-skin': 'Allergic/dermatologic reaction pattern (provisional)',
  'vitamins-and-supplements': 'Nutritional deficiency or support profile (provisional)',
  'cough-and-throat': 'Upper/lower airway irritation syndrome (provisional)',
  'eye-and-ear-drops': 'Localized eye/ear inflammatory-infective presentation (provisional)',
  thyroid: 'Thyroid-related symptom profile (provisional)',
  'heart-and-cholesterol': 'Cardiometabolic risk symptom profile (provisional)',
  'womens-health': "Women's health symptom profile (provisional)",
};

const RESTRICTED_KEYWORDS = [
  'tramadol', 'tapentadol', 'morphine', 'codeine', 'clonazepam', 'pregabalin', 'gabapentin',
  'amitriptyline', 'valproate', 'topiramate',
];

function normalize(v) {
  return String(v || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function deriveAgeGroupFromAge(ageValue) {
  const age = Number(ageValue);
  if (!Number.isFinite(age) || age <= 0) return 'adult';
  if (age < 12) return 'child';
  if (age >= 60) return 'senior';
  return 'adult';
}

function tokenize(text) {
  return normalize(text)
    .split(' ')
    .map((t) => t.trim())
    .filter((t) => t && !STOP_WORDS.has(t));
}

function includesAny(haystack, needles) {
  const hay = normalize(haystack);
  return needles.some((n) => hay.includes(normalize(n)));
}

export function detectCategoryFromComplaint(text = '') {
  const input = normalize(text);
  if (!input) {
    return {
      key: 'general',
      label: CATEGORY_LABELS.general,
      confidence: 0,
    };
  }

  let best = { key: 'general', score: 0 };

  Object.entries(CATEGORY_HINTS).forEach(([key, hints]) => {
    let score = 0;
    hints.forEach((hint) => {
      if (input.includes(normalize(hint))) score += 1;
    });
    if (score > best.score) best = { key, score };
  });

  return {
    key: best.score > 0 ? best.key : 'general',
    label: best.score > 0 ? (CATEGORY_LABELS[best.key] || CATEGORY_LABELS.general) : CATEGORY_LABELS.general,
    confidence: best.score,
  };
}

export function getDiagnosisForCategory(categoryKey) {
  return DIAGNOSIS_BY_CATEGORY[categoryKey] || 'General symptomatic condition (provisional)';
}

function isAllowedMedicine(medicine) {
  const text = normalize([
    medicine?.brandName,
    medicine?.genericName,
    medicine?.usedFor,
    medicine?.prescription,
  ].join(' '));

  if (text.includes('schedule h1') || text.includes('schedule x')) return false;
  if (RESTRICTED_KEYWORDS.some((kw) => text.includes(kw))) return false;
  return true;
}

function scoreByCategoryHints(medicine, symptomsText) {
  const hints = CATEGORY_HINTS[medicine.categoryKey] || [];
  if (!hints.length) return 0;
  let score = 0;
  hints.forEach((hint) => {
    if (normalize(symptomsText).includes(normalize(hint))) score += 3;
  });
  return score;
}

function safetyPenalty(medicine, profile) {
  const caution = normalize(medicine.whenNotToUse);
  let penalty = 0;

  const ageGroup = profile.ageGroup || deriveAgeGroupFromAge(profile.age);
  const allergies = normalize(profile.allergies);
  const chronicConditions = normalize(profile.chronicConditions);

  if (ageGroup === 'child' && includesAny(caution, ['children', 'under 12', 'under 6', 'under 2'])) {
    penalty += 5;
  }

  if (ageGroup === 'senior' && includesAny(caution, ['elderly', 'prostate', 'glaucoma', 'kidney disease'])) {
    penalty += 3;
  }

  if (profile.pregnant === 'yes' && includesAny(caution, ['pregnan', 'pregnancy', 'trimester'])) {
    penalty += 6;
  }

  if (profile.diabetic === 'yes' && includesAny(caution, ['diabet', 'sugar'])) {
    penalty += 4;
  }

  if (allergies && includesAny(caution, allergies.split(/[;,]/).map((x) => x.trim()).filter(Boolean))) {
    penalty += 5;
  }

  if (chronicConditions) {
    if (chronicConditions.includes('kidney') && includesAny(caution, ['kidney'])) penalty += 4;
    if (chronicConditions.includes('liver') && includesAny(caution, ['liver'])) penalty += 4;
    if (chronicConditions.includes('heart') && includesAny(caution, ['heart', 'hypertension', 'bp'])) penalty += 4;
    if (chronicConditions.includes('ulcer') && includesAny(caution, ['ulcer', 'peptic'])) penalty += 3;
  }

  return penalty;
}

export function recommendMedicines(medicines, context) {
  const symptomsText = context?.symptoms || '';
  const preferredCategory = context?.categoryKey;
  const tokens = tokenize(symptomsText);

  const ranked = medicines
    .filter((medicine) => isAllowedMedicine(medicine))
    .map((medicine) => {
      const corpus = [
        medicine.brandName,
        medicine.genericName,
        medicine.usedFor,
        medicine.whenToUse,
        medicine.categoryName,
      ]
        .map((x) => normalize(x))
        .join(' ');

      let score = 0;

      tokens.forEach((tk) => {
        if (corpus.includes(tk)) score += 2;
      });

      score += scoreByCategoryHints(medicine, symptomsText);

      if (preferredCategory && medicine.categoryKey === preferredCategory) {
        score += 4;
      }

      if (normalize(context?.severity) === 'severe' && medicine.requiresPrescription) {
        score += 2;
      }

      if (normalize(context?.severity) === 'mild' && !medicine.requiresPrescription) {
        score += 2;
      }

      if (context?.otcPreference === 'otc-only') {
        if (!medicine.requiresPrescription) score += 3;
        else score -= 4;
      }

      if (context?.otcPreference === 'include-prescription' && medicine.requiresPrescription) {
        score += 1;
      }

      score -= safetyPenalty(medicine, context);

      return { medicine, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const unique = [];
  const seen = new Set();
  for (const item of ranked) {
    const key = normalize(item.medicine.brandName);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
    if (unique.length >= 5) break;
  }

  return unique;
}

export function getConsultFlag(context) {
  if (context?.pregnant === 'yes') return 'Pregnancy selected: consult a gynecologist before taking any medicine.';
  if ((context?.ageGroup || deriveAgeGroupFromAge(context?.age)) === 'child') {
    return 'Child profile selected: pediatric consultation is strongly recommended before medication.';
  }
  if (normalize(context?.severity) === 'severe') {
    return 'Severe symptoms reported: seek doctor evaluation promptly, especially if symptoms worsen.';
  }
  return 'Always verify dose, allergies, and interactions with a licensed doctor or pharmacist.';
}
