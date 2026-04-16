"""
MedVerify — Production Model Training Pipeline
Fine-tunes EfficientNet-B3 for genuine vs counterfeit medicine classification.

The script expects staged data in:
  backend/data/training/{train,val,test}/{genuine,suspected_fake}

Use backend/scripts/download_kaggle_medicine_datasets.py first.
"""

from __future__ import annotations

import argparse
import copy
import json
import logging
import os
import sys
from collections import Counter
from typing import Dict, List, Tuple

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score, precision_score, recall_score
from torch.optim import lr_scheduler
from torch.utils.data import DataLoader, WeightedRandomSampler
from torchvision import datasets, models, transforms
from torchvision.models import EfficientNet_B3_Weights

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("train_production")

# Load configs
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from config import MODEL_PATH, IMAGE_SIZE, IMAGENET_MEAN, IMAGENET_STD, DATA_DIR
except ImportError:
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    MODEL_PATH = os.path.join(BASE_DIR, "checkpoints", "efficientnet_b3_medverify.pth")
    IMAGE_SIZE = 300
    IMAGENET_MEAN = [0.485, 0.456, 0.406]
    IMAGENET_STD = [0.229, 0.224, 0.225]
    DATA_DIR = os.path.join(BASE_DIR, "data")

TRAIN_DATA_DIR = os.path.join(DATA_DIR, "training")
METRICS_DIR = os.path.join(os.path.dirname(MODEL_PATH), "metrics")

DEFAULT_EPOCHS = 10
DEFAULT_BATCH_SIZE = 16
DEFAULT_LR = 1e-4
DEFAULT_WEIGHT_DECAY = 1e-4
DEFAULT_PATIENCE = 3


def resolve_training_root(preferred_root: str) -> str:
    candidates = [
        preferred_root,
        os.path.join(DATA_DIR, "training_v2"),
    ]
    for root in candidates:
        train_dir = os.path.join(root, "train")
        val_dir = os.path.join(root, "val")
        if os.path.isdir(train_dir) and os.path.isdir(val_dir):
            return root
    raise FileNotFoundError(
        f"No staged training dataset found. Expected train/val folders under {preferred_root} or {os.path.join(DATA_DIR, 'training_v2')}"
    )


def build_model(device: torch.device) -> nn.Module:
    logger.info(f"Initializing EfficientNet-B3... (Target Device: {device})")
    try:
        model = models.efficientnet_b3(weights=EfficientNet_B3_Weights.DEFAULT)
    except Exception as e:
        logger.warning(f"Could not load pre-trained weights ({e}). Loading architecture only.")
        model = models.efficientnet_b3(weights=None)

    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.4),
        nn.Linear(in_features, 512),
        nn.SiLU(),
        nn.Dropout(p=0.2),
        nn.Linear(512, 2),
    )
    return model.to(device)


def build_transforms() -> Dict[str, transforms.Compose]:
    train_transform = transforms.Compose([
        transforms.RandomResizedCrop(IMAGE_SIZE, scale=(0.72, 1.0), ratio=(0.85, 1.15)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(10),
        transforms.ColorJitter(brightness=0.18, contrast=0.18, saturation=0.12, hue=0.02),
        transforms.RandomPerspective(distortion_scale=0.12, p=0.25),
        transforms.ToTensor(),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
    ])

    eval_transform = transforms.Compose([
        transforms.Resize((IMAGE_SIZE + 24, IMAGE_SIZE + 24)),
        transforms.CenterCrop((IMAGE_SIZE, IMAGE_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
    ])

    return {"train": train_transform, "val": eval_transform, "test": eval_transform}


def create_sampler(targets: List[int]) -> WeightedRandomSampler:
    class_counts = Counter(targets)
    class_weights = {label: 1.0 / count for label, count in class_counts.items() if count > 0}
    sample_weights = [class_weights[target] for target in targets]
    return WeightedRandomSampler(weights=sample_weights, num_samples=len(sample_weights), replacement=True)


def build_loaders(data_root: str, batch_size: int, num_workers: int = 0) -> Tuple[Dict[str, DataLoader], Dict[str, int], Dict[str, datasets.ImageFolder]]:
    transforms_map = build_transforms()
    splits = {}
    for split in ["train", "val", "test"]:
        split_dir = os.path.join(data_root, split)
        if os.path.isdir(split_dir):
            splits[split] = datasets.ImageFolder(split_dir, transforms_map[split])

    if "train" not in splits or "val" not in splits:
        raise FileNotFoundError(f"Training and validation splits are required under {data_root}.")

    samplers = {"train": create_sampler(splits["train"].targets)}

    loaders = {
        "train": DataLoader(splits["train"], batch_size=batch_size, sampler=samplers["train"], num_workers=num_workers, pin_memory=torch.cuda.is_available()),
        "val": DataLoader(splits["val"], batch_size=batch_size, shuffle=False, num_workers=num_workers, pin_memory=torch.cuda.is_available()),
    }

    if "test" in splits:
        loaders["test"] = DataLoader(splits["test"], batch_size=batch_size, shuffle=False, num_workers=num_workers, pin_memory=torch.cuda.is_available())

    sizes = {split: len(dataset) for split, dataset in splits.items()}
    return loaders, sizes, splits


def compute_class_weights(dataset: datasets.ImageFolder) -> torch.Tensor:
    counts = Counter(dataset.targets)
    total = sum(counts.values())
    weights = []
    for class_index in range(len(dataset.classes)):
        count = counts.get(class_index, 1)
        weights.append(total / (len(dataset.classes) * count))
    return torch.tensor(weights, dtype=torch.float32)


def split_metrics(y_true: List[int], y_pred: List[int]) -> Dict[str, object]:
    return {
        "accuracy": accuracy_score(y_true, y_pred),
        "precision": precision_score(y_true, y_pred, average="binary", zero_division=0),
        "recall": recall_score(y_true, y_pred, average="binary", zero_division=0),
        "f1": f1_score(y_true, y_pred, average="binary", zero_division=0),
        "confusion_matrix": confusion_matrix(y_true, y_pred).tolist(),
        "classification_report": classification_report(y_true, y_pred, zero_division=0, output_dict=True),
    }


def run_epoch(model, loader, criterion, device, train: bool, scaler=None):
    phase = "train" if train else "eval"
    model.train(mode=train)

    running_loss = 0.0
    y_true: List[int] = []
    y_pred: List[int] = []

    for inputs, labels in loader:
        inputs = inputs.to(device, non_blocking=True)
        labels = labels.to(device, non_blocking=True)

        if train:
            assert scaler is not None
            run_epoch.optimizer.zero_grad(set_to_none=True)
            with torch.cuda.amp.autocast(enabled=device.type == "cuda"):
                outputs = model(inputs)
                loss = criterion(outputs, labels)
            scaler.scale(loss).backward()
            scaler.step(run_epoch.optimizer)
            scaler.update()
        else:
            with torch.no_grad():
                outputs = model(inputs)
                loss = criterion(outputs, labels)

        running_loss += loss.item() * inputs.size(0)
        preds = torch.argmax(outputs, dim=1)
        y_true.extend(labels.detach().cpu().tolist())
        y_pred.extend(preds.detach().cpu().tolist())

    epoch_loss = running_loss / max(1, len(loader.dataset))
    metrics = split_metrics(y_true, y_pred) if y_true else {"accuracy": 0.0, "precision": 0.0, "recall": 0.0, "f1": 0.0, "confusion_matrix": [], "classification_report": {}}
    metrics["loss"] = epoch_loss
    metrics["phase"] = phase
    return metrics


def train_model(model, loaders, device, epochs: int, patience: int, class_weights: torch.Tensor):
    criterion = nn.CrossEntropyLoss(weight=class_weights.to(device), label_smoothing=0.03)
    optimizer = optim.AdamW([
        {"params": model.features.parameters(), "lr": DEFAULT_LR * 0.2},
        {"params": model.classifier.parameters(), "lr": DEFAULT_LR},
    ], weight_decay=DEFAULT_WEIGHT_DECAY)
    scheduler = lr_scheduler.ReduceLROnPlateau(optimizer, mode="max", factor=0.5, patience=1)
    scaler = torch.cuda.amp.GradScaler(enabled=device.type == "cuda")

    run_epoch.optimizer = optimizer  # type: ignore[attr-defined]

    best_state = copy.deepcopy(model.state_dict())
    best_val_f1 = -1.0
    best_val_loss = float("inf")
    stale_epochs = 0
    history = []

    for epoch in range(1, epochs + 1):
        logger.info(f"Epoch {epoch}/{epochs}")

        train_metrics = run_epoch(model, loaders["train"], criterion, device, train=True, scaler=scaler)
        val_metrics = run_epoch(model, loaders["val"], criterion, device, train=False)
        scheduler.step(val_metrics["f1"])

        history.append({"epoch": epoch, "train": train_metrics, "val": val_metrics})

        logger.info(
            "Train loss %.4f acc %.4f | Val loss %.4f acc %.4f f1 %.4f",
            train_metrics["loss"], train_metrics["accuracy"], val_metrics["loss"], val_metrics["accuracy"], val_metrics["f1"],
        )

        improved = val_metrics["f1"] > best_val_f1 or (
            np.isclose(val_metrics["f1"], best_val_f1) and val_metrics["loss"] < best_val_loss
        )
        if improved:
            best_val_f1 = val_metrics["f1"]
            best_val_loss = val_metrics["loss"]
            best_state = copy.deepcopy(model.state_dict())
            stale_epochs = 0
        else:
            stale_epochs += 1
            if stale_epochs >= patience:
                logger.info("Early stopping triggered after %s stale epochs.", patience)
                break

    model.load_state_dict(best_state)
    return model, history


def evaluate(model, loader, device):
    criterion = nn.CrossEntropyLoss()
    metrics = run_epoch(model, loader, criterion, device, train=False)
    return metrics


def save_json(path: str, payload: dict):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)


def parse_args():
    parser = argparse.ArgumentParser(description="Train MedVerify counterfeit medicine classifier")
    parser.add_argument("--data-root", default=TRAIN_DATA_DIR, help="Path to staged dataset root containing train/val/test")
    parser.add_argument("--epochs", type=int, default=DEFAULT_EPOCHS)
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE)
    parser.add_argument("--patience", type=int, default=DEFAULT_PATIENCE)
    parser.add_argument("--num-workers", type=int, default=0)
    return parser.parse_args()


def main():
    args = parse_args()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    if device.type == "cpu":
        logger.warning("CUDA not detected. Training on CPU will be slow.")
    else:
        torch.backends.cudnn.benchmark = True

    data_root = resolve_training_root(args.data_root)
    logger.info(f"Using dataset root: {data_root}")

    loaders, sizes, datasets_map = build_loaders(data_root, args.batch_size, args.num_workers)
    logger.info("Dataset sizes: %s", sizes)
    logger.info("Classes: %s", datasets_map["train"].classes)

    class_weights = compute_class_weights(datasets_map["train"])
    logger.info("Class weights: %s", class_weights.tolist())

    model = build_model(device)
    model, history = train_model(model, loaders, device, args.epochs, args.patience, class_weights)

    test_metrics = evaluate(model, loaders["test"], device) if "test" in loaders else None

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    torch.save(model.state_dict(), MODEL_PATH)
    logger.info(f"[OK] Saved model to {MODEL_PATH}")

    os.makedirs(METRICS_DIR, exist_ok=True)
    save_json(os.path.join(METRICS_DIR, "training_history.json"), {"history": history, "data_root": data_root, "sizes": sizes})
    if test_metrics is not None:
        save_json(os.path.join(METRICS_DIR, "training_summary.json"), {"test_metrics": test_metrics, "classes": datasets_map["train"].classes, "model_path": MODEL_PATH})

    if test_metrics is not None:
        logger.info(
            "Test metrics: loss %.4f acc %.4f precision %.4f recall %.4f f1 %.4f",
            test_metrics["loss"], test_metrics["accuracy"], test_metrics["precision"], test_metrics["recall"], test_metrics["f1"],
        )


if __name__ == "__main__":
    main()
