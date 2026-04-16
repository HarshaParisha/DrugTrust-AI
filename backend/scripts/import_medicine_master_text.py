"""
Import medicine knowledge base from a plain-text master list.

Expected input format:
  CATEGORY 1 — FEVER & COLD (50 medicines)
  Crocin 500 | Paracetamol 500mg | Fever and mild pain | 1 tablet every 6 hours | After food | ... | ... | ... | OTC

Rules:
- Dedupe by normalized (brand_name + generic_name + salt_composition)
- Keep existing richer records if duplicate already exists in medicines.json
- Add only new medicines from parsed source text
- No synthetic/fake medicine generation
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any, Dict, List, Tuple


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
DEFAULT_INPUT = DATA_DIR / "raw" / "medicine_master_15x50.txt"
DEFAULT_OUTPUT = DATA_DIR / "medicines.json"


CATEGORY_HEADER_RE = re.compile(
    r"^\s*CATEGORY\s+(\d+)\s+[—-]\s+(.+?)\s*\((\d+)\s+medicines\)\s*$",
    re.IGNORECASE,
)


def normalize_text(v: str) -> str:
    return re.sub(r"\s+", " ", (v or "").strip().lower())


def to_list_from_csvish(v: str) -> List[str]:
    if not v:
        return []
    parts = [p.strip() for p in re.split(r",|/", v) if p.strip()]
    # De-dup but preserve order
    seen = set()
    out = []
    for p in parts:
        k = normalize_text(p)
        if k and k not in seen:
            seen.add(k)
            out.append(p)
    return out


def schedule_to_rx(schedule: str) -> bool:
    s = normalize_text(schedule)
    if "otc" in s:
        return False
    # schedule h/h1/x/etc considered prescription
    return True if s else True


def category_normalized(name: str) -> str:
    # Keep user category names intact but normalized spacing/case style.
    cleaned = re.sub(r"\s+", " ", name or "").strip()
    if not cleaned:
        return "General"

    # Title-case words while preserving apostrophes and fixing common acronyms.
    cleaned = cleaned.lower()
    cleaned = re.sub(
        r"\b([a-z])([a-z']*)\b",
        lambda m: m.group(1).upper() + m.group(2),
        cleaned,
    )
    cleaned = cleaned.replace("Women'S", "Women's")
    cleaned = cleaned.replace("Ppi", "PPI")
    cleaned = cleaned.replace("H.pylori", "H. pylori")
    return cleaned


def parse_master_text(text: str) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
    entries: List[Dict[str, Any]] = []
    expected_by_category: Dict[str, int] = {}
    current_category = "General"

    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        if line.startswith("#"):
            continue

        m = CATEGORY_HEADER_RE.match(line)
        if m:
            _cat_num, cat_name, cat_count = m.groups()
            current_category = category_normalized(cat_name)
            expected_by_category[current_category] = int(cat_count)
            continue

        # Skip conversational/control lines
        if line.lower().startswith("say \"continue\""):
            continue
        if line.lower().startswith("continue"):
            continue
        if line.lower().startswith("that completes all"):
            continue

        # Medicine row must be pipe-delimited
        if "|" not in line:
            continue

        cols = [c.strip() for c in line.split("|")]
        # We expect at least:
        # brand | generic/salt | use | dose | timing | indications | cautions | side effects | schedule
        if len(cols) < 9:
            continue

        brand_name = cols[0]
        generic_or_salt = cols[1]
        used_for = cols[2]
        how_to_take = cols[3]
        timing = cols[4]
        indications = cols[5]
        contraindications = cols[6]
        side_effects = cols[7]
        schedule = cols[8]

        # Heuristic split for generic/salt
        generic_name = generic_or_salt
        salt_composition = generic_or_salt

        entry = {
            "brand_name": brand_name,
            "generic_name": generic_name,
            "salt_composition": salt_composition,
            "category": current_category,
            "manufacturer": "",
            "requires_prescription": schedule_to_rx(schedule),
            "used_for": to_list_from_csvish(indications) or to_list_from_csvish(used_for),
            "how_to_take": f"{how_to_take}. {timing}".strip(". "),
            "common_side_effects": to_list_from_csvish(side_effects),
            "serious_side_effects": [],
            "interactions": [],
            "safe_for_pregnant": "Consult doctor",
            "safe_for_children": "Consult doctor",
            "safe_for_elderly": "Consult doctor",
            "safe_for_diabetics": "Consult doctor",
            "overdose_warning": contraindications or "Seek urgent medical advice in case of overdose.",
            "storage": "Store in a cool, dry place below 30°C.",
            "schedule": schedule,
        }
        entries.append(entry)

    return entries, expected_by_category


def dedupe_key(item: Dict[str, Any]) -> Tuple[str, str, str]:
    return (
        normalize_text(str(item.get("brand_name", ""))),
        normalize_text(str(item.get("generic_name", ""))),
        normalize_text(str(item.get("salt_composition", ""))),
    )


def merge(existing: List[Dict[str, Any]], incoming: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], int]:
    index = {dedupe_key(x): x for x in existing}
    added = 0
    for row in incoming:
        k = dedupe_key(row)
        if not any(k):
            continue
        if k in index:
            # Keep existing richer record.
            continue
        existing.append(row)
        index[k] = row
        added += 1

    # Reassign numeric IDs safely
    for i, row in enumerate(existing, start=1):
        row["id"] = i

    return existing, added


def sanitize_existing(existing: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    cleaned: List[Dict[str, Any]] = []
    for row in existing:
        brand = str(row.get("brand_name", "")).strip()
        if not brand or brand.startswith("#"):
            continue
        row["category"] = category_normalized(str(row.get("category") or "General"))
        cleaned.append(row)
    return cleaned


def category_counts(items: List[Dict[str, Any]]) -> Dict[str, int]:
    out: Dict[str, int] = {}
    for it in items:
        c = str(it.get("category") or "General").strip()
        out[c] = out.get(c, 0) + 1
    return dict(sorted(out.items(), key=lambda kv: kv[0]))


def main() -> None:
    ap = argparse.ArgumentParser(description="Import medicine master text into medicines.json")
    ap.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    ap.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = ap.parse_args()

    if not args.input.exists():
        raise SystemExit(
            f"Input file not found: {args.input}\n"
            f"Create this file and paste your CATEGORY/pipe-delimited medicine list, then rerun."
        )

    raw_text = args.input.read_text(encoding="utf-8", errors="ignore")
    incoming, expected = parse_master_text(raw_text)

    if not incoming:
        raise SystemExit("No medicine rows were parsed from input. Please check file format.")

    if args.output.exists():
        existing = json.loads(args.output.read_text(encoding="utf-8"))
        if not isinstance(existing, list):
            raise SystemExit("Existing medicines.json is not a JSON list.")
        existing = sanitize_existing(existing)
    else:
        existing = []

    merged, added = merge(existing, incoming)
    args.output.write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding="utf-8")

    parsed_counts = category_counts(incoming)
    merged_counts = category_counts(merged)

    print(f"Parsed rows: {len(incoming)}")
    print(f"Added new rows: {added}")
    print("\nParsed category counts:")
    for c, n in parsed_counts.items():
        exp = expected.get(c)
        if exp is not None:
            print(f"- {c}: {n}/{exp}")
        else:
            print(f"- {c}: {n}")

    print("\nMerged category counts:")
    for c, n in merged_counts.items():
        print(f"- {c}: {n}")


if __name__ == "__main__":
    main()
