"""
MedVerify — LLM Engine
Connects to Ollama (Mistral 7B) for clinical Doctor-Persona streaming.
Falls back to medicines.json if LLM is unavailable.
"""

import os
import json
import logging
import difflib
import re
import requests
from typing import Optional, Dict, Any, Generator

# Import config for OLLAMA_URL
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from config import (
        OLLAMA_URL,
        OLLAMA_MODEL,
        LLM_DISCLAIMER,
        CONSULT_REMINDER,
        LLM_PROVIDER,
        LLM_BASE_URL,
        LLM_MODEL,
    )
except ImportError:
    OLLAMA_URL = "http://localhost:11434/api/generate"
    OLLAMA_MODEL = "mistral:latest"
    LLM_DISCLAIMER = "Warning: AI-generated reference only."
    CONSULT_REMINDER = "Always consult a doctor."
    LLM_PROVIDER = "ollama"
    LLM_BASE_URL = "http://127.0.0.1:1234/v1"
    LLM_MODEL = OLLAMA_MODEL

logger = logging.getLogger("medverify.llm")

class LLMEngine:
    def __init__(self):
        self.available = False
        self.available_models = []
        self.status_reason = "not_checked"
        self._check_ollama()

    def get_status(self, refresh: bool = True) -> Dict[str, Any]:
        """Return current LLM connectivity status. Optionally refresh before returning."""
        if refresh:
            self._check_provider()
        return {
            "connected": bool(self.available),
            "provider": LLM_PROVIDER,
            "model": LLM_MODEL,
            "endpoint": OLLAMA_URL if LLM_PROVIDER == "ollama" else LLM_BASE_URL,
            "reason": self.status_reason,
            "available_models": self.available_models,
        }

    def _check_provider(self):
        if LLM_PROVIDER == "lmstudio":
            self._check_lmstudio()
        else:
            self._check_ollama()

    def _check_ollama(self):
        """Check if Ollama is running and accessible"""
        try:
            # Note: The tags endpoint is typically /api/tags
            tags_url = OLLAMA_URL.replace("/generate", "/tags")
            res = requests.get(tags_url, timeout=3)
            if res.status_code == 200:
                models = [m["name"] for m in res.json().get("models", [])]
                self.available_models = models
                logger.info(f"[LLM] Ollama running. Available models: {models}")

                target = (OLLAMA_MODEL or "").strip().lower()
                model_available = any(
                    m.lower() == target
                    or m.lower().startswith(f"{target}:")
                    or target.startswith(m.lower().split(":")[0])
                    for m in models
                )

                if model_available:
                    self.available = True
                    self.status_reason = "connected"
                else:
                    self.available = False
                    self.status_reason = "model_not_pulled"
                return
            self.status_reason = "service_unreachable"
        except Exception as e:
            logger.warning(f"[LLM] Ollama not detected at {OLLAMA_URL}. Fallback mode active. ({e})")
            self.status_reason = "service_unreachable"
            self.available_models = []
        self.available = False

    def _check_lmstudio(self):
        """Check if LM Studio OpenAI-compatible server is running."""
        try:
            models_url = f"{LLM_BASE_URL.rstrip('/')}/models"
            res = requests.get(models_url, timeout=3)
            if res.status_code == 200:
                data = res.json()
                models = [m.get("id") for m in data.get("data", []) if m.get("id")]
                self.available_models = models
                logger.info(f"[LLM] LM Studio running. Available models: {models}")

                target = (LLM_MODEL or "").strip().lower()
                if not models:
                    self.available = False
                    self.status_reason = "no_model_loaded"
                    return

                if target and any(m.lower() == target for m in models):
                    self.available = True
                    self.status_reason = "connected"
                elif target and target not in [m.lower() for m in models]:
                    self.available = False
                    self.status_reason = "model_not_loaded"
                else:
                    self.available = True
                    self.status_reason = "connected"
                return
            self.status_reason = "service_unreachable"
        except Exception as e:
            logger.warning(f"[LLM] LM Studio not detected at {LLM_BASE_URL}. Fallback mode active. ({e})")
            self.status_reason = "service_unreachable"
            self.available_models = []
        self.available = False

    def get_db_fallback(self, medicine_name: str, medicines_json_path: str = "data/medicines.json") -> Optional[Dict[str, Any]]:
        if not medicine_name:
            return None

        clean_name = re.sub(
            r'\b(IP|USP|BP|I\.P\.|U\.S\.P\.|(?:(\d+\.?\d*)\s*(?:mg|mcg|ml|g|IU)))\b',
            '', medicine_name, flags=re.IGNORECASE
        ).strip()

        db_full_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), medicines_json_path)
        try:
            with open(db_full_path, "r", encoding="utf-8") as f:
                db = json.load(f)
        except Exception:
            return None

        corpus = []
        for med in db:
            corpus.append(med.get("generic_name", "").lower())
            corpus.append(med.get("brand_name", "").lower())

        matches = difflib.get_close_matches(clean_name.lower(), corpus, n=1, cutoff=0.45)
        if not matches:
            return None

        matched_med = next((m for m in db if m.get("generic_name", "").lower() == matches[0] or m.get("brand_name", "").lower() == matches[0]), None)

        if not matched_med:
            return None

        # Build fallback structured intel
        intel = {
            "medicine_name": matched_med.get("brand_name") or matched_med.get("generic_name"),
            "category": matched_med.get("category", ""),
            "used_for": matched_med.get("used_for", []),
            "how_to_take": matched_med.get("how_to_take", "As directed by physician."),
            "common_side_effects": matched_med.get("common_side_effects", []),
            "serious_side_effects": matched_med.get("serious_side_effects", []),
            "do_not_combine_with": matched_med.get("interactions", []),
            "requires_prescription": matched_med.get("requires_prescription", True),
            "safe_for_pregnant": matched_med.get("safe_for_pregnant", "Consult doctor"),
            "safe_for_children": matched_med.get("safe_for_children", "Consult doctor"),
            "safe_for_elderly": matched_med.get("safe_for_elderly", "Consult doctor"),
            "safe_for_diabetics": matched_med.get("safe_for_diabetics", "Consult doctor"),
            "overdose_warning": matched_med.get("overdose_warning", "Do not exceed prescribed dose."),
            "storage_reminder": matched_med.get("storage", "Store in a cool, dry place."),
            "llm_available": False,
            "disclaimer": "Note: AI model is unavailable. Showing static database fallback information.",
            "consult_reminder": CONSULT_REMINDER
        }
        return intel

    def build_doctor_prompt(self, fields: dict, verdict: str = "UNKNOWN") -> str:
        name = fields.get("medicine_name") or fields.get("brand_name") or "the medicine"
        dosage = fields.get("dosage_strength", "")
        composition = fields.get("salt_composition", "")
        manufacturer = fields.get("manufacturer_name", "")

        db_ref = self.get_db_fallback(name) or {}
        db_context = f"\nDatabase Reference Data:\nCategory: {db_ref.get('category')}\nUses: {', '.join(db_ref.get('used_for', []))}\nSide Effects: {', '.join(db_ref.get('common_side_effects', []))}" if db_ref else ""

        verdict_context = {
            "VERIFIED GENUINE": "The medicine has been verified as GENUINE by our system.",
            "LIKELY GENUINE":   "The medicine appears likely genuine but pharmacist confirmation is recommended.",
            "INCONCLUSIVE":     "Authenticity could not be confirmed. Proceed with caution.",
            "SUSPECTED COUNTERFEIT": "WARNING: This medicine is suspected to be counterfeit. Do NOT consume.",
            "HIGH RISK — COUNTERFEIT": "DANGER: High risk of counterfeit. Do NOT consume under any circumstances.",
        }.get(verdict, "Authenticity status is unknown.")

        system = """You are Dr. Drugtrust AI, a senior clinical pharmacist with 25 years of experience.
Always respond in a warm, empathetic, and highly professional clinical tone.
Provide complete prescription guidance using clear formatting (bullet points, bold headers).
Important: If the Authenticity Status is COUNTERFEIT or DANGER, you MUST loudly prioritize warning the user upfront before giving any other details.
Do NOT use JSON formatting. Output natural language ONLY."""

        user = f"""Patient has presented a medicine with the following details:

**Medicine:** {name} {dosage}
**Composition:** {composition}
**Manufacturer:** {manufacturer}
**Authenticity Status:** {verdict_context}
{db_context}

Please provide a complete clinical briefing. Group your response clearly into these sections:
1. Executive Summary & Authenticity Note (Emphasize safety based on status)
2. Indications (What it's for)
3. Dosage Administration (How to take it correctly, food interaction)
4. Side Effects & Warnings (Common vs Serious)
5. Contraindications (Who should NOT take it)
6. Major Drug Interactions

Keep the tone professional yet accessible to a patient."""

        return f"<|system|>\n{system}\n<|user|>\n{user}\n<|assistant|>\n"

    def generate(self, parsed_fields: dict) -> dict:
        """Non-streaming generation used for API calls that don't want streaming."""
        name = parsed_fields.get("medicine_name") or ""
        
        # Always prioritize DB structure first if we just need raw fields for schemas
        db_intel = self.get_db_fallback(name)
        
        if not self.available:
            if db_intel:
                return db_intel
            return {
                "llm_available": False,
                "disclaimer": "AI Unavailable and medicine not found in database.",
                "consult_reminder": CONSULT_REMINDER
            }

        # If available, we can override a field with LLM text
        prompt = self.build_doctor_prompt(parsed_fields)
        try:
            if LLM_PROVIDER == "lmstudio":
                model_name = LLM_MODEL or (self.available_models[0] if self.available_models else "")
                chat_url = f"{LLM_BASE_URL.rstrip('/')}/chat/completions"
                res = requests.post(chat_url, json={
                    "model": model_name,
                    "messages": [
                        {"role": "system", "content": "You are Dr. Drugtrust AI, a senior clinical pharmacist. Respond in a professional doctor style with clear sections."},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.1,
                    "max_tokens": 900,
                }, timeout=60)
                res.raise_for_status()
                body = res.json()
                text = (((body.get("choices") or [{}])[0].get("message") or {}).get("content") or "").strip()
            else:
                res = requests.post(OLLAMA_URL, json={
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.1,
                        "num_predict": 700
                    }
                }, timeout=60)
                res.raise_for_status()
                text = res.json().get("response", "")
            
            # Since schemas.py expects structured fields, we embed the writeup in 'how_to_take' or 'disclaimer'
            # OR better, if we are using the new doctor persona, we should let the frontend render it.
            # But the backend Pydantic schema (PrescriptionIntel) expects specific lists.
            # To support both, we inject the LLM text into 'how_to_take' and leave the rest empty.
            intel = {
                "medicine_name": name,
                "llm_available": True,
                "how_to_take": text,  # Hijack this property for the full markdown writeup
                "disclaimer": LLM_DISCLAIMER,
                "consult_reminder": CONSULT_REMINDER,
                "used_for": [], "common_side_effects": [], "serious_side_effects": [], "do_not_combine_with": []
            }
            return intel
        except Exception as e:
            logger.error(f"[LLM] Local generation failed ({LLM_PROVIDER}): {e}")
            return db_intel or {"llm_available": False, "disclaimer": "AI generation failed."}

    def _parse_llm_json(self, raw_text: str) -> dict:
        """
        Adapts the raw LLM text stream into the PrescriptionIntel structure.
        Crucial for compatibility with routes_verify.py
        """
        # If it's already JSON-like, try to load it (rare in doctor persona)
        if raw_text.strip().startswith("{"):
            try:
                data = json.loads(raw_text)
                data["llm_available"] = True
                return data
            except:
                pass

        # Otherwise, treat the entire text as the briefing
        return {
            "llm_available": True,
            "how_to_take": raw_text.strip(),
            "disclaimer": LLM_DISCLAIMER,
            "consult_reminder": CONSULT_REMINDER,
            "used_for": [],
            "common_side_effects": [],
            "serious_side_effects": [],
            "do_not_combine_with": []
        }

    def generate_stream(self, parsed_fields: dict, verdict_label: str = "UNKNOWN") -> Generator[str, None, None]:
        """Streaming generation for SSE."""
        name = parsed_fields.get("medicine_name") or ""
        
        if not self.available:
            db_intel = self.get_db_fallback(name)
            # Yield full object as one JSON dump
            if db_intel:
                yield json.dumps(db_intel)
            else:
                yield json.dumps({"llm_available": False, "error": "LLM_UNAVAILABLE"})
            return

        prompt = self.build_doctor_prompt(parsed_fields, verdict_label)
        try:
            if LLM_PROVIDER == "lmstudio":
                # LM Studio: simple non-stream fallback over SSE path
                model_name = LLM_MODEL or (self.available_models[0] if self.available_models else "")
                chat_url = f"{LLM_BASE_URL.rstrip('/')}/chat/completions"
                response = requests.post(chat_url, json={
                    "model": model_name,
                    "messages": [
                        {"role": "system", "content": "You are Dr. Drugtrust AI, a senior clinical pharmacist."},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.1,
                    "max_tokens": 900,
                }, timeout=60)
                response.raise_for_status()
                body = response.json()
                text = (((body.get("choices") or [{}])[0].get("message") or {}).get("content") or "").strip()
                yield text
                return

            with requests.post(OLLAMA_URL, json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": True,
                "options": {
                    "temperature": 0.1,
                    "num_predict": 700
                }
            }, stream=True, timeout=10) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    if line:
                        chunk = json.loads(line)
                        if "response" in chunk:
                            yield chunk["response"]
        except Exception as e:
            logger.error(f"[LLM] Ollama stream failed: {e}")
            db_intel = self.get_db_fallback(name)
            if db_intel:
                yield json.dumps(db_intel)
