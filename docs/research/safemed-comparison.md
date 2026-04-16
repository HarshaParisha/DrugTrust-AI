s# SafeMed vs MedVerify — Research Comparison (Clean-Room)

Date: 2026-04-13  
Scope: Research-only comparison of external repositories for conceptual learning.  
External repos reviewed:

- `external/SafeMed`
- `external/Fake-Medicine-Detector`

## Compliance and reuse boundary

- Both external repos were reviewed for research only.
- No code, model weights, images, diagrams, or text were copied into MedVerify.
- No third-party files were added to production paths.
- License check result: no explicit `LICENSE` file was found in either external repo at analysis time.
- Therefore, treat external code/assets as **not reusable by default**; use concepts only unless permission/license is granted.

## 1) Architecture comparison

## External: SafeMed ecosystem (high-level)

- Platform: Android app (Java, fragments, local/remote data calls).
- ML concept: Siamese-style embedding comparison for medicine package similarity.
- Inference style: compare reference image vs medicine-under-test (pairwise verification).
- Decision style: Euclidean distance thresholding (README mentions ~0.3 concept; detector script uses 0.2 check).
- Extra module: fake dealer verification using phone/UPI lookup from external community data.

## Current: MedVerify stack

- Platform: Web app (React + Vite frontend, FastAPI backend).
- Backend engines:
  - Vision: EfficientNet-B3 classifier with MC Dropout uncertainty.
  - OCR: EasyOCR + Tesseract fallback + structured field extraction.
  - Fusion: weighted confidence + DB cross-check + safety policy.
  - LLM: optional local Ollama-based clinical guidance.
- Persistence & audit:
  - SQLite scan history.
  - Audit log (`api_audit.jsonl`).
- Policy:
  - explicit multi-tier risk policy (Tier 1–5) with tests for boundary behavior.
  - hard expiry override to highest risk tier.
- UX:
  - landing page → scan flow → result dashboard → history + reporting.

## Core architectural difference

- SafeMed is **pairwise similarity verification** (reference packet vs test packet).
- MedVerify is **single-image multimodal risk fusion** (vision + OCR + policy + optional LLM).

## 2) Non-copyrightable insights we can use

The following are conceptual ideas (safe to reuse in original implementation):

1. **Problem framing**
   - Distinguish counterfeit risk from general medicine misuse risk.
   - Communicate uncertainty clearly instead of binary-only verdicts.

2. **Similarity-oriented verification concept**
   - Embedding-distance style checks can complement classifier confidence.
   - Useful especially when brand-specific packaging references exist.

3. **Threshold governance**
   - Keep threshold(s) explicit, versioned, and testable.
   - Track calibration data before changing threshold values.

4. **One-shot / low-shot mindset**
   - Design for new brand/package onboarding with minimal labeled data.

5. **Operational workflow insight**
   - Separate "medicine authenticity" and "dealer trust" as distinct services.
   - Keep user-facing safety guidance concise and action-oriented.

## 3) Reusable concepts vs what should NOT be copied

## Reusable as concepts (recommended)

- Embedding-distance secondary signal in fusion.
- Explicit threshold registry + calibration notebook/process.
- Brand-package reference onboarding workflow.
- Dealer-risk module as optional, independent feature.
- User messaging that differentiates "inconclusive" from "high risk" outcomes.

## Should NOT be copied (without explicit permission/license)

- Any external source code (Java/Python scripts).
- TFLite model files / model archives.
- Dataset files, reference images, diagrams, or README prose.
- UI assets/flows that are directly cloned from external implementations.

## 4) Clean-room implementation plan for MedVerify (FastAPI + React)

Goal: add similarity-style signal while preserving MedVerify architecture and UI.

### Phase A — Design (no external code reuse)

1. Define a new backend interface in MedVerify:
   - `ReferenceMatcher.encode(image)`
   - `ReferenceMatcher.compare(test_embedding, reference_embedding)`
2. Add fusion input fields:
   - `reference_match_score`
   - `reference_distance`
   - `reference_match_status` (match/weak/no_ref)
3. Add policy knobs in config:
   - `REF_MATCH_BONUS`
   - `REF_MISMATCH_PENALTY`
   - `REF_DISTANCE_THRESHOLD_V1`

### Phase B — Data and calibration

1. Create internal reference set structure:
   - per medicine/brand/package variant foldering
   - metadata JSON with source + approval status
2. Build calibration script:
   - plot same-class vs different-class distance distributions
   - choose threshold using validation curves
3. Save calibration artifact:
   - `backend/checkpoints/reference_thresholds.json`

### Phase C — Backend integration

1. Add matcher module in `backend/core/`.
2. Invoke matcher in verify pipeline after OCR candidate extraction.
3. Extend `FusionEngine` to blend matcher signal with existing score.
4. Add API fields to response schema for traceability.
5. Add tests:
   - threshold boundary tests
   - no-reference fallback tests
   - mismatch penalty behavior tests

### Phase D — Frontend integration (same MedVerify UI language)

1. Result page: add "Reference Match" card with status + confidence impact.
2. Explainability section: include short rationale for distance-based signal.
3. Keep current minimal UX and avoid introducing external visual assets.

### Phase E — Safety and governance

1. Keep expiry override as hard safety rule.
2. Keep in-product disclaimer and consult reminder.
3. Add model/policy version in response for auditability.

## 5) Migration checklist (effort / impact / risk)

| Item                                           | Effort | Impact | Risk | Notes                                  |
| ---------------------------------------------- | -----: | -----: | ---: | -------------------------------------- |
| Define matcher interfaces + config flags       |      S |      M |    L | Pure architecture prep                 |
| Build internal reference dataset format        |      M |      H |    M | Requires data discipline               |
| Distance calibration pipeline                  |      M |      H |    M | Critical for threshold quality         |
| Add matcher to verify pipeline                 |      M |      H |    M | Must preserve latency budget           |
| Fusion policy extension                        |      S |      H |    M | Needs robust tests                     |
| API/schema response extension                  |      S |      M |    L | Backward compatible if optional fields |
| Frontend result card for reference match       |      S |      M |    L | Fits existing UI easily                |
| Add boundary/ablation tests                    |      M |      H |    L | Prevents regression                    |
| Optional dealer-risk module (separate service) |    M-L |      M |    H | External data quality/legal concerns   |

Legend: S=Small, M=Medium, L=Large.

## 6) Practical recommendation for this project

- Short-term: continue with MedVerify’s existing strong multimodal fusion and policy-tested thresholds.
- Near-term: add a **clean-room reference matcher** as an optional signal to improve counterfeit discrimination where package references are available.
- Do not merge external code/assets unless explicit license/permission is obtained.

## Attribution note (research provenance)

This document was informed by conceptual review of:

- `https://github.com/deepak2310gupta/SafeMed`
- `https://github.com/Sauravpandey98/Fake-Medicine-Detector`

Used strictly for high-level research inspiration and comparative architecture analysis.
