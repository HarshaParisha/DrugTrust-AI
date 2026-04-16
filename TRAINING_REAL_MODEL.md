# Real-Data Training Guide

This pipeline now trains a real counterfeit detector from staged image datasets and writes actual validation/test metrics.

## 1) Install backend dependencies

Make sure backend dependencies are installed, including:

- `kagglehub`
- `torch`
- `torchvision`
- `scikit-learn`

## 2) Configure Kaggle credentials

Use one of these methods:

- `~/.kaggle/kaggle.json`
- `~/.kaggle/access_token`
- `KAGGLE_API_TOKEN` environment variable

## 3) Download and stage datasets

Run:

- `python backend/scripts/download_kaggle_medicine_datasets.py`

By default, this downloads only the **fake-vs-real medicine dataset** used for the classifier and reference matcher.

Optional:

- `python backend/scripts/download_kaggle_medicine_datasets.py --include-mobile`

Use this only if you specifically want the 6GB mobile-captured dataset for extra OCR robustness experiments.

This downloads and prepares:

- `surajkumarjha1/fake-vs-real-medicine-datasets-images`
  - staged into `backend/data/training/{train,val,test}/{genuine,suspected_fake}`
- Mobile dataset is optional and not required for the main Drugtrust AI training pipeline.

## 4) Train the classifier

Run:

- `python backend/scripts/train_production.py`

Optional flags:

- `--epochs 10`
- `--batch-size 16`
- `--patience 3`
- `--data-root backend/data/training`

The script will:

- fine-tune EfficientNet-B3
- use class balancing during training
- save the best checkpoint to `backend/checkpoints/efficientnet_b3_medverify.pth`
- export metrics to:
  - `backend/checkpoints/metrics/training_history.json`
  - `backend/checkpoints/metrics/training_summary.json`

## 4.5) Build reference package embeddings (distance-based counterfeit check)

This adds a second counterfeit signal inspired by pairwise package matching:

- use the staged genuine folder from the fake-vs-real dataset:
  - `backend/data/training/train/genuine/*.jpg|png|webp`
- run:
  - `python backend/scripts/build_reference_embeddings.py`

Output:

- `backend/checkpoints/reference_embeddings.json`

If you later want per-package labels, you can still create `backend/data/reference_packages/<label>/...` and rerun the same script.

## 4.6) Calibrate reference threshold on validation split

Do not guess thresholds manually. Calibrate on your validation data:

- `python backend/scripts/calibrate_reference_threshold.py --eval-root backend/data/training/val`

Output:

- `backend/checkpoints/reference_threshold_calibration.json`

Then set `.env` with calibrated value:

- `REFERENCE_MATCH_THRESHOLD=<recommended_threshold_from_report>`

## 5) Verify the app

Check:

- `/health` for `model_finetuned`
- `/verify/llm-status` for strict LLM connectivity and model presence

## 6) (New) Train reference-matching signal

Drugtrust AI now supports a clean-room distance-based reference matcher (conceptually similar to pairwise package comparison), built from your own internal reference images.

Prepare reference folders:

- `backend/data/reference_packages/<label_name>/*.jpg|png|webp`

Example:

- `backend/data/reference_packages/crocin_500_genuine/pack1.jpg`
- `backend/data/reference_packages/crocin_500_genuine/pack2.jpg`
- `backend/data/reference_packages/dolo_650_genuine/pack1.jpg`

Build embeddings:

- `python backend/scripts/build_reference_embeddings.py`

Output:

- `backend/checkpoints/reference_embeddings.json`

At runtime, Drugtrust AI compares uploaded package embeddings against these references and adds optional fusion signals:

- `REFERENCE_MATCH` (confidence bonus)
- `REFERENCE_MISMATCH` (confidence penalty)

Tune via environment variables in `.env`:

- `REFERENCE_MATCH_THRESHOLD` (default `0.28`)
- `REFERENCE_MATCH_BONUS` (default `4.0`)
- `REFERENCE_MISMATCH_PENALTY` (default `6.0`)

## Notes

- The training script no longer writes a dummy checkpoint on failure.
- The result page now depends on real inference only.
- LLM status is strict: Ollama must be reachable and the configured model must be available.
