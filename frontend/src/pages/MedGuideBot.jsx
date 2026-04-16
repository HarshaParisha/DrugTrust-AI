import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bot, RotateCcw, SendHorizonal, Stethoscope, UserRound } from 'lucide-react';
import { allMedicines } from '../data/medicineDatabase';
import {
  detectCategoryFromComplaint,
  recommendMedicines,
} from '../utils/doctorChatEngine';

const INITIAL_QUESTIONS = [
  {
    key: 'fullName',
    prompt: 'Please share your full name.',
    type: 'text',
    placeholder: 'Enter full name',
  },
  {
    key: 'age',
    prompt: 'Please enter your age in years.',
    type: 'number',
    placeholder: 'Enter age (years)',
  },
  {
    key: 'sex',
    prompt: 'Please confirm your sex for clinical reference.',
    type: 'choices',
    options: [
      { label: 'Male', value: 'Male' },
      { label: 'Female', value: 'Female' },
      { label: 'Other', value: 'Other' },
    ],
  },
  {
    key: 'chiefComplaint',
    prompt: 'What brings you in today? Please describe your main problem.',
    type: 'text',
    placeholder: 'Describe your chief complaint',
  },
];

const FOLLOWUPS = {
  'fever-cold': [
    { key: 'fu_fever_days', prompt: 'How many days have you had fever or cold symptoms?' },
    { key: 'fu_temp', prompt: 'Do you have a measured temperature reading? If yes, please share it.' },
    { key: 'fu_fever_pattern', prompt: 'Is the fever continuous, or does it come and go?' },
    { key: 'fu_cold_associated', prompt: 'Any chills, body ache, sore throat, runny nose, cough, or sweating?' },
  ],
  'headache-migraine': [
    { key: 'fu_head_location', prompt: 'Where exactly is the headache — forehead, temples, back, or whole head?' },
    { key: 'fu_head_quality', prompt: 'Is the pain throbbing, pressure-like, or sharp?' },
    { key: 'fu_head_trigger', prompt: 'Do light or noise worsen the headache? Any nausea or vomiting?' },
    { key: 'fu_head_pattern', prompt: 'Is this first-time or recurrent? How long does each episode last?' },
  ],
  'stomach-pain-and-acidity': [
    { key: 'fu_stomach_location', prompt: 'Where is the stomach pain — upper, lower, left, right, or central?' },
    { key: 'fu_stomach_quality', prompt: 'Is it burning, cramping, or sharp pain?' },
    { key: 'fu_stomach_meal', prompt: 'Does it occur before meals, after meals, or both?' },
    { key: 'fu_stomach_associated', prompt: 'Any bloating, gas, nausea, vomiting, constipation, or loose stools?' },
  ],
  'diarrhea-and-vomiting': [
    { key: 'fu_gi_frequency', prompt: 'How many loose stools or vomiting episodes per day?' },
    { key: 'fu_gi_duration', prompt: 'How many days has this been going on?' },
    { key: 'fu_gi_dehydration', prompt: 'Any signs of dehydration like dry mouth, low urine, or dizziness?' },
    { key: 'fu_gi_food', prompt: 'Any suspicious food intake, recent travel, or similar illness in family?' },
  ],
  diabetes: [
    { key: 'fu_dm_readings', prompt: 'Do you monitor blood sugar? Please share recent fasting or post-meal values if available.' },
    { key: 'fu_dm_symptoms', prompt: 'Any increased thirst, frequent urination, fatigue, blurred vision, or weight change?' },
    { key: 'fu_dm_control', prompt: 'Has your sugar recently worsened or stayed stable?' },
  ],
  'blood-pressure': [
    { key: 'fu_bp_reading', prompt: 'Do you monitor BP at home? Please share the latest reading.' },
    { key: 'fu_bp_symptoms', prompt: 'Any dizziness, headache, blurred vision, palpitations, or chest tightness?' },
    { key: 'fu_bp_pattern', prompt: 'Are symptoms worse at any particular time like morning, night, or stress?' },
  ],
  'antibiotics-and-infection': [
    { key: 'fu_inf_site', prompt: 'Where is the infection likely located — throat, chest, urine, skin, ear, etc.?' },
    { key: 'fu_inf_duration', prompt: 'How long have these infective symptoms been present?' },
    { key: 'fu_inf_fever', prompt: 'Any fever, chills, pus discharge, foul smell, or worsening pain?' },
  ],
  'pain-and-inflammation': [
    { key: 'fu_pain_location', prompt: 'Where is the pain located?' },
    { key: 'fu_pain_type', prompt: 'Is it dull, sharp, burning, or throbbing?' },
    { key: 'fu_pain_movement', prompt: 'Does movement worsen pain? Any swelling, stiffness, or redness?' },
  ],
  'allergy-and-skin': [
    { key: 'fu_skin_pattern', prompt: 'What type of reaction do you have — rash, itching, hives, swelling, or peeling?' },
    { key: 'fu_skin_site', prompt: 'Where on the body is it present?' },
    { key: 'fu_skin_trigger', prompt: 'Any known trigger like food, dust, pollen, cosmetics, or medicine?' },
    { key: 'fu_skin_breath', prompt: 'Any breathing difficulty or facial swelling?' },
  ],
  'vitamins-and-supplements': [
    { key: 'fu_vitamin_complaint', prompt: 'What concern is dominant — fatigue, weakness, hair fall, low appetite, or bone pain?' },
    { key: 'fu_vitamin_duration', prompt: 'How long have these symptoms been present?' },
  ],
  'cough-and-throat': [
    { key: 'fu_cough_type', prompt: 'Is the cough dry or with phlegm?' },
    { key: 'fu_cough_phlegm', prompt: 'If phlegm is present, what is the color?' },
    { key: 'fu_cough_duration', prompt: 'How many days has this cough been present?' },
    { key: 'fu_cough_breath', prompt: 'Any fever, breathlessness, wheeze, or chest pain?' },
  ],
  'eye-and-ear-drops': [
    { key: 'fu_eye_ear_site', prompt: 'Is the issue in eye, ear, or both?' },
    { key: 'fu_eye_ear_symptoms', prompt: 'Any redness, pain, discharge, hearing drop, or itching?' },
    { key: 'fu_eye_ear_duration', prompt: 'How many days has this issue been present?' },
  ],
  thyroid: [
    { key: 'fu_thyroid_history', prompt: 'Do you already have diagnosed thyroid disease?' },
    { key: 'fu_thyroid_reports', prompt: 'Any recent TSH/T3/T4 reports available?' },
    { key: 'fu_thyroid_symptoms', prompt: 'Any weight change, palpitations, fatigue, hair fall, heat or cold intolerance?' },
  ],
  'heart-and-cholesterol': [
    { key: 'fu_heart_symptoms', prompt: 'Any chest discomfort, exertional breathlessness, palpitations, or fatigue?' },
    { key: 'fu_heart_lipid', prompt: 'Do you have recent lipid profile values?' },
    { key: 'fu_heart_history', prompt: 'Any prior heart disease, stent, or stroke history?' },
  ],
  'womens-health': [
    { key: 'fu_women_issue', prompt: 'Please specify the main women’s health concern (cycle issue, pain, anemia, etc.).' },
    { key: 'fu_women_duration', prompt: 'How long has this been present?' },
  ],
};

const FINAL_TRIAGE_QUESTIONS = [
  { key: 'gen_severity', prompt: 'On a scale of 1 to 10, how severe is your discomfort?', type: 'number', placeholder: 'Enter 1-10' },
  {
    key: 'redflag_emergency',
    prompt: 'Any emergency signs right now (chest pain, breathing difficulty, fainting, heavy bleeding, or very high fever)?',
    type: 'choices',
    options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }],
  },
];

function sanitizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function buildQuestionQueue(answers) {
  const complaint = sanitizeText(answers.chiefComplaint || answers.symptoms || '');
  const category = complaint ? detectCategoryFromComplaint(complaint) : { key: 'general' };
  const categoryQuestions = complaint ? (FOLLOWUPS[category.key] || []).slice(0, 2) : [];
  const triageQuestions = complaint ? FINAL_TRIAGE_QUESTIONS : [];

  return [
    ...INITIAL_QUESTIONS,
    ...categoryQuestions,
    ...triageQuestions,
  ];
}

function ChatBubble({ role, children }) {
  const isBot = role === 'bot';
  return (
    <div className={`w-full flex ${isBot ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[86%] rounded-2xl px-4 py-3 border ${isBot ? 'bg-slate-900/80 border-slate-700 text-slate-100' : 'bg-emerald-500/12 border-emerald-400/35 text-emerald-50'}`}>
        <div className="flex items-start gap-2">
          <span className="mt-0.5 text-slate-400">{isBot ? <Bot className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}</span>
          <div className="text-sm leading-relaxed whitespace-pre-wrap">{children}</div>
        </div>
      </div>
    </div>
  );
}

function TabletSuggestions({ items }) {
  return (
    <section
      className="border border-slate-800 rounded-2xl p-4 md:p-5 bg-slate-900/65 mt-4"
      style={{
        backgroundImage:
          'linear-gradient(180deg, rgba(0,229,204,0.05) 0%, transparent 22%), repeating-linear-gradient(180deg, rgba(148,163,184,0.14) 0px, rgba(148,163,184,0.14) 1px, transparent 1px, transparent 31px)',
      }}
    >
      <div className="border-b border-dashed border-slate-700 pb-3 mb-3">
        <p className="font-mono text-xs text-mv-teal uppercase tracking-[0.14em]">Suggested Tablets (Knowledge Base)</p>
        <p className="text-[11px] text-slate-400 mt-1">Top matches from your selected category and symptoms</p>
      </div>

      <div className="mt-3 border-t border-slate-800 pt-3 space-y-3">
        {items.map((med, idx) => (
          <div key={`${med.brandName || med.genericName || 'med'}-${idx}`} className="border border-slate-800 rounded-xl p-3 bg-slate-900/85">
            <div className="flex items-start gap-3">
              <div>
                <p className="text-sm text-white font-semibold">{idx + 1}. {med.brandName || med.genericName || 'Medicine suggestion'}</p>
                {med.genericName && <p className="text-xs text-slate-300 mt-1">Generic: {med.genericName}</p>}
                {med.usedFor && <p className="text-xs text-slate-300">Used for: {med.usedFor}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function MedGuideBot() {
  const [answers, setAnswers] = useState({});
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hello. I am DrugTrust virtual doctor assistant. I will guide you step by step in a professional consultation.' },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [validationError, setValidationError] = useState('');
  const [emergencyAlert, setEmergencyAlert] = useState(false);

  const category = useMemo(() => detectCategoryFromComplaint(answers.chiefComplaint || answers.symptoms || ''), [answers.chiefComplaint, answers.symptoms]);
  const queue = useMemo(() => buildQuestionQueue(answers), [answers]);
  const activeQuestion = useMemo(() => queue.find((q) => answers[q.key] === undefined) || null, [queue, answers]);
  const consultComplete = !activeQuestion && queue.length > 0 && !emergencyAlert;

  const recommendationContext = useMemo(() => {
    const followupText = Object.entries(answers)
      .filter(([key]) => key.startsWith('fu_') || key.startsWith('gen_'))
      .map(([, value]) => String(value || ''))
      .join(' ');

    return {
      complaint: answers.chiefComplaint || answers.symptoms || '',
      symptoms: `${answers.chiefComplaint || ''} ${followupText}`.trim(),
      severity: answers.gen_severity,
      diabetic: /diabet/i.test(String(answers.existingConditions || '')) ? 'yes' : 'unknown',
      chronicConditions: answers.existingConditions || '',
      allergies: answers.allergies || '',
      otcPreference: answers.otcPreference,
      categoryKey: category.key,
    };
  }, [answers, category.key]);

  const recommendations = useMemo(() => {
    if (!consultComplete || emergencyAlert) return [];
    return recommendMedicines(allMedicines, recommendationContext);
  }, [consultComplete, emergencyAlert, recommendationContext]);

  const suggestedTablets = useMemo(() => {
    if (!consultComplete || emergencyAlert) return [];
    return recommendations.map((item) => item.medicine).filter(Boolean).slice(0, 5);
  }, [consultComplete, emergencyAlert, recommendations, answers, category]);

  const completionPct = Math.min(100, Math.round((Object.keys(answers).length / Math.max(queue.length, 1)) * 100));
  const visibleMessages = messages.slice(-4);
  const hiddenMessageCount = Math.max(0, messages.length - visibleMessages.length);

  const pushBot = (text) => setMessages((prev) => [...prev, { role: 'bot', text }]);
  const pushUser = (text) => setMessages((prev) => [...prev, { role: 'user', text }]);

  const resetConsultation = () => {
    setAnswers({});
    setMessages([
      { role: 'bot', text: 'Hello. I am DrugTrust virtual doctor assistant. I will guide you step by step in a professional consultation.' },
    ]);
    setInputValue('');
    setValidationError('');
    setEmergencyAlert(false);
  };

  const handleAnswer = (rawValue, displayLabel) => {
    if (!activeQuestion) return;

    const value = sanitizeText(rawValue);
    if (!value && !activeQuestion.optional) {
      setValidationError('Please provide a response to continue.');
      return;
    }

    if (activeQuestion.key === 'age') {
      const age = Number(value);
      if (!Number.isFinite(age) || age < 1 || age > 110) {
        setValidationError('Please enter a valid age between 1 and 110 years.');
        return;
      }
    }

    if (activeQuestion.key === 'gen_severity') {
      const scale = Number(value);
      if (!Number.isFinite(scale) || scale < 1 || scale > 10) {
        setValidationError('Please enter severity on a 1 to 10 scale.');
        return;
      }
    }

    setValidationError('');

    const shownValue = sanitizeText(displayLabel || value) || 'Skipped';
    pushUser(shownValue);

    const updatedAnswers = { ...answers, [activeQuestion.key]: value || 'Not provided' };
    setAnswers(updatedAnswers);

    if (activeQuestion.key === 'redflag_emergency' && String(value).toLowerCase() === 'yes') {
      setEmergencyAlert(true);
      pushBot('Based on what you described, I strongly recommend you visit an emergency room or a physician immediately. This could be serious and needs in-person evaluation right away.');
      return;
    }

    const nextQueue = buildQuestionQueue(updatedAnswers);
    const nextQuestion = nextQueue.find((q) => updatedAnswers[q.key] === undefined) || null;

    if (!nextQuestion) {
      if (recommendMedicines(allMedicines, {
        ...recommendationContext,
        ...updatedAnswers,
        symptoms: `${updatedAnswers.chiefComplaint || ''} ${Object.entries(updatedAnswers)
          .filter(([k]) => k.startsWith('fu_') || k.startsWith('gen_'))
          .map(([, v]) => String(v || ''))
          .join(' ')}`,
      }).length === 0) {
        pushBot('I understand your concern. This seems beyond what I can safely advise on within my medicine scope. Please consult a specialist.');
      } else {
        pushBot('Based on your details and symptoms, here are tablet suggestions from our medicine knowledge base.');
      }
    }
  };

  const onSubmitInput = () => {
    if (!activeQuestion) return;
    handleAnswer(inputValue, inputValue);
    setInputValue('');
  };

  const renderedMessages = visibleMessages;

  return (
    <div className="min-h-screen overflow-hidden bg-slate-950 text-slate-100 p-3 md:p-4">
      <div className="max-w-6xl mx-auto h-[calc(100vh-1.5rem)] flex flex-col gap-3">
        <header className="flex flex-wrap items-center justify-between gap-3 shrink-0">
          <Link to="/home" className="mv-button mv-button-secondary inline-flex">
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Home
          </Link>
          <button type="button" onClick={resetConsultation} className="mv-button mv-button-secondary inline-flex">
            <RotateCcw className="h-3.5 w-3.5" /> Restart Chat
          </button>
        </header>

        <section className="clinical-card border border-mv-border rounded-3xl p-4 md:p-5 bg-gradient-to-b from-slate-900/95 to-slate-950/80 flex-1 overflow-hidden flex flex-col">
          <div className="border-b border-dashed border-mv-border/70 pb-4 mb-4 shrink-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white inline-flex items-center gap-2">
                  <Stethoscope className="h-7 w-7 text-mv-teal" />
                  DrugTrust AI Doctor Chat
                </h1>
                <p className="text-slate-300 mt-2 text-sm max-w-3xl">
                  Structured, empathetic consultation in a single page. Answers stay compact, the next question appears below, and the final prescription can be downloaded as PDF.
                </p>
              </div>

              <div className="min-w-[240px]">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1.5">
                  <span>Consultation Progress</span>
                  <span>{completionPct}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-mv-teal/70 to-emerald-400/70 transition-all duration-300" style={{ width: `${completionPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 shrink-0 mb-3">
            <div className="border border-slate-800 bg-slate-900/70 rounded-lg px-3 py-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Name</p>
              <p className="text-xs text-slate-200 mt-1 truncate">{answers.fullName || '—'}</p>
            </div>
            <div className="border border-slate-800 bg-slate-900/70 rounded-lg px-3 py-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Age / Sex</p>
              <p className="text-xs text-slate-200 mt-1 truncate">{answers.age || '—'} / {answers.sex || '—'}</p>
            </div>
            <div className="border border-slate-800 bg-slate-900/70 rounded-lg px-3 py-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Category</p>
              <p className="text-xs text-slate-200 mt-1 truncate">{category.label}</p>
            </div>
            <div className="border border-slate-800 bg-slate-900/70 rounded-lg px-3 py-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Status</p>
              <p className="text-xs text-slate-200 mt-1 truncate">{emergencyAlert ? 'Emergency review' : consultComplete ? 'Prescription ready' : 'Consultation running'}</p>
            </div>
          </div>

          <div className="flex-1 grid grid-rows-[minmax(0,1fr),auto] gap-3 overflow-hidden">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/75 p-3 md:p-4 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">Conversation</p>
                {hiddenMessageCount > 0 && (
                  <p className="text-[10px] text-slate-500">{hiddenMessageCount} earlier response{hiddenMessageCount > 1 ? 's' : ''} recorded</p>
                )}
              </div>

              <div className="flex-1 overflow-hidden flex flex-col gap-2">
                {renderedMessages.map((msg, idx) => (
                  <ChatBubble key={`${msg.role}-${idx}`} role={msg.role}>
                    {msg.text}
                  </ChatBubble>
                ))}

                {!consultComplete && activeQuestion && <ChatBubble role="bot">{activeQuestion.prompt}</ChatBubble>}
              </div>
            </div>

            {!emergencyAlert && !consultComplete && activeQuestion && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 md:p-4 shrink-0">
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 mb-1">Answer this question</p>
                    <p className="text-sm text-slate-100 leading-relaxed">{activeQuestion.prompt}</p>
                  </div>

                  {((!activeQuestion.type) || activeQuestion.type === 'text' || activeQuestion.type === 'number') ? (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type={activeQuestion.type === 'number' ? 'number' : 'text'}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onSubmitInput();
                        }}
                        placeholder={activeQuestion.placeholder || 'Type your answer'}
                        className="w-full rounded-xl border border-slate-700 bg-slate-900/95 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-mv-teal/50"
                      />
                      <div className="flex gap-2 shrink-0">
                        <button type="button" onClick={onSubmitInput} className="mv-button mv-button-primary">
                          <SendHorizonal className="h-3.5 w-3.5" /> Send
                        </button>
                        {activeQuestion.optional && (
                          <button
                            type="button"
                            onClick={() => {
                              handleAnswer('Not provided', 'Skip');
                              setInputValue('');
                            }}
                            className="mv-button mv-button-secondary"
                          >
                            Skip
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {activeQuestion.options?.map((opt) => (
                        <button key={opt.value} type="button" className="mv-button mv-button-secondary" onClick={() => handleAnswer(opt.value, opt.label)}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {validationError && <p className="text-xs text-red-300">{validationError}</p>}
                </div>
              </div>
            )}

            {emergencyAlert && (
              <section className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 shrink-0">
                <p className="text-sm text-red-200 font-semibold">Emergency advisory issued.</p>
                <p className="text-xs text-red-100 mt-1">
                  Please seek immediate in-person medical care. No medicine recommendation is generated for red-flag scenarios.
                </p>
              </section>
            )}

            {!emergencyAlert && consultComplete && suggestedTablets.length > 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 md:p-4 shrink-0">
                <TabletSuggestions items={suggestedTablets} />
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
