# DrugTrust AI

DrugTrust AI is a medicine-safety and verification platform designed to help users, field teams, pharmacists, and healthcare workflows identify suspicious medicines and make safer decisions faster.

It combines image verification, label intelligence, medicine reference matching, and guided consultation support in one experience.

---

## Why DrugTrust AI exists

Counterfeit and mislabelled medicines are a real public-health risk.

DrugTrust AI was built to reduce that risk by:

- improving early detection of suspicious packs,
- supporting faster triage in medicine verification workflows,
- giving structured, understandable safety guidance,
- and encouraging escalation to licensed professionals when risk signals are high.

DrugTrust AI is a **decision-support system**, not a replacement for doctors, pharmacists, regulators, or laboratories.

---

## What the platform does

### 1) Medicine verification workflow

Users can upload or capture medicine images and receive a structured authenticity risk analysis.

The platform checks for consistency across:

- package visuals,
- printed text fields,
- medicine reference records,
- and confidence/risk rules.

### 2) Smart camera capture flow

The camera flow is optimized for practical use:

- guided framing,
- quality-aware capture behavior,
- clear preview and recapture support,
- and a verification-first user journey.

### 3) Medicine knowledge base experience

DrugTrust AI includes a categorized medicine knowledge experience to help users browse medicine groups and basic usage context in a clear format.

### 4) Doctor-style guided consultation

The MedGuide consultation asks a short, structured sequence of questions and then provides:

- a category-aware recommendation view,
- safety-oriented language,
- emergency escalation when danger signs are reported,
- and a downloadable prescription-style summary PDF.

---

## End-to-end user journey

A typical user journey looks like this:

1. Open DrugTrust AI.
2. Capture or upload a medicine image.
3. Review verification output and risk signals.
4. If needed, proceed to guided consultation.
5. Answer concise clinical questions.
6. Receive recommendation summary and safety advice.
7. Escalate to in-person care or pharmacy support when required.

---

## Core capabilities at a glance

- Multimodal medicine authenticity checks
- OCR-assisted label understanding
- Reference-based medicine matching
- Structured risk and safety output
- Guided non-scroll consultation UX
- Category-aware branching in consultations
- Emergency red-flag escalation logic
- Prescription-style PDF summary export

---

## Who can use DrugTrust AI

DrugTrust AI is useful for:

- Patients and caregivers
- Pharmacists and retail pharmacy staff
- Medical representatives and field audit teams
- Health-tech pilot teams
- Medicine quality monitoring initiatives

---

## Safety and responsibility principles

DrugTrust AI follows strict safety intent:

- It does **not** claim definitive clinical diagnosis.
- It does **not** replace emergency or physician care.
- It provides cautionary guidance when confidence is low.
- It promotes professional escalation for high-risk scenarios.
- It avoids unsafe recommendation behavior for red-flag situations.

For formal usage rules, see: `MEDICAL_SAFETY_POLICY.md`.

---

## Data and privacy stance (high-level)

DrugTrust AI is designed with practical privacy awareness:

- minimum necessary data for verification tasks,
- clear task-oriented outputs,
- and traceable workflow behavior for review and improvements.

Teams deploying DrugTrust AI should still apply organization-level policies for retention, consent, access control, and compliance.

---

## Project maturity and current focus

Current focus areas include:

- improving medicine verification reliability,
- strengthening quality checks in camera capture,
- making consultation shorter and more clinically usable,
- and continuously improving output clarity for non-technical users.

---

## Planned improvements

Roadmap priorities include:

- stronger on-device visual quality intelligence,
- better packaging anomaly detection coverage,
- smarter recommendation explainability,
- richer multilingual guidance,
- and deployment tooling for institutional pilots.

---

## Important disclaimer

DrugTrust AI is an assistive tool. All medication and treatment decisions must be validated by a licensed doctor or pharmacist.

If emergency symptoms are present (for example severe breathing difficulty, chest pain, fainting, heavy bleeding, or rapid worsening), seek immediate in-person medical care.

---

## Quick links

- Installation: `INSTALL.md`
- Environment and setup: `SETUP.md`
- Troubleshooting: `TROUBLESHOOTING.md`
- Safety policy: `MEDICAL_SAFETY_POLICY.md`
- Model training notes: `TRAINING_REAL_MODEL.md`

---

## Contribution note

DrugTrust AI is actively evolving. Contributions, improvements, and responsible feedback are welcome to make medicine safety tooling more reliable and more accessible.
