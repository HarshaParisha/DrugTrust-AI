# Drugtrust AI — Medical Safety & Ethical AI Policy

## 1. Safety Thresholds

Drugtrust AI enforces strict confidence-based gating to ensure patient safety:

- **SAFE (Green):** Minimum 95% confidence across Vision + OCR fusion.
- **WARNING (Amber):** 90% - 94.9% confidence. Indicates inconclusive features.
- **DANGER (Red):** Below 90% confidence. Immediate counterfeit alert.

## 2. Model Accuracy & Uncertainty

The system uses **MCDropout (Monte Carlo Dropout)** to estimate model uncertainty. For every scan, 20 forward passes are performed. If the standard deviation of these passes is high (Uncertainty: HIGH), the system automatically penalizes the confidence score to prevent overconfident false positives.

## 3. Human-in-the-Loop

- Drugtrust AI is a **decision support tool**, not a replacement for medical professionals.
- Every result page contains a mandatory **Pharmacist Consultation Reminder**.
- Users are encouraged to report suspicious results via the integrated **Flagging system**.

## 4. Data Privacy

- No personally identifiable information (PII) is extracted or stored from images.
- OCR focus is strictly on medicine packaging text (Brand, Dosage, Batch, Expiry).

## 5. Offline Resilience

- All core verification engines (Vision, OCR, LLM) run **on-device** to ensure functionality in low-connectivity areas (e.g., rural pharmacies).
- No clinical data is stored in the cloud; SQLite is used for local audit trails.
