"""
MedVerify — Gemini Medicine Analysis Engine
Analyzes medicine images and extracts detailed information with confidence scoring.
"""

import logging
import json
import os
from typing import Dict, Any
from dotenv import load_dotenv

load_dotenv()

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

logger = logging.getLogger("medverify.gemini_engine")

class MedicineAnalysisEngine:
    """Analyze medicine images using Google Gemini API."""
    
    def __init__(self):
        if not GEMINI_AVAILABLE:
            logger.warning("google.generativeai not installed. Install with: pip install google-generativeai")
            self.api_key = None
            self.model = None
            return
        
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            logger.error("GEMINI_API_KEY not found in environment")
            self.model = None
            return
        
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel(
            "gemini-2.0-flash",
            generation_config={"response_mime_type": "application/json"},
        )
        logger.info("MedicineAnalysisEngine initialized with Gemini API")
    
    def analyze_medicine_image(self, image_bytes: bytes, image_media_type: str = "image/jpeg") -> Dict[str, Any]:
        """
        Analyze a medicine image and extract detailed information.
        
        Args:
            image_bytes: Raw image bytes
            image_media_type: MIME type of image (e.g., 'image/jpeg')
        
        Returns:
            Dictionary with medicine information and confidence score
        """
        if not self.model:
            return self._error_response("Gemini API not available")
        
        try:
            # Determine media type
            media_type_map = {
                "image/jpeg": "image/jpeg",
                "image/jpg": "image/jpeg",
                "image/png": "image/png",
                "image/gif": "image/gif",
                "image/webp": "image/webp",
            }
            media_type = media_type_map.get(image_media_type.lower(), "image/jpeg")
            
            # Create the prompt for medicine analysis
            analysis_prompt = """You are a pharmaceutical expert analyzing a medicine image. Extract and analyze:

1. **Medicine Name** (Brand & Generic if visible)
2. **Dosage** (Strength/mg)
3. **Manufacturer** (Company name)
4. **Ingredients/Composition** (Active & inactive)
5. **Batch/Lot Number** (If visible)
6. **Expiry Date** (If visible)
7. **Instructions** (How to take - dosage frequency)
8. **Precautions** (Warnings & contraindications)
9. **Side Effects** (Common adverse effects)
10. **Storage** (Temperature & conditions)

AUTHENTICITY ASSESSMENT:
- Examine: Print quality, font clarity, color consistency, packaging integrity
- Identify: Spelling errors, blur, fading, misalignment
- Rate AUTHENTICITY as: AUTHENTIC (95-99%), POSSIBLY_AUTHENTIC (85-94%), SUSPICIOUS (70-84%), COUNTERFEIT (40-69%), FAKE (<40%)

Respond in JSON format with these exact fields:
{
  "medicine_name": "Brand name (Generic name)",
  "dosage": "Strength in mg/ml",
  "manufacturer": "Company name",
  "ingredients": ["Active ingredient 1", "Active ingredient 2"],
  "batch_number": "Batch/Lot if visible",
  "expiry_date": "DD/MM/YYYY or Not visible",
  "instructions": "How to use, dosage frequency",
  "precautions": ["Precaution 1", "Precaution 2"],
  "side_effects": ["Side effects 1", "Side effects 2"],
  "storage": "Storage conditions",
  "authenticity_assessment": "AUTHENTIC|POSSIBLY_AUTHENTIC|SUSPICIOUS|COUNTERFEIT|FAKE",
  "confidence_score": 95,
  "analysis_notes": "Brief analysis of packaging quality and authenticity indicators"
}

If image is not a medicine, indicate that clearly."""
            
            # Call Gemini API with vision
            response = self.model.generate_content([
                {"mime_type": media_type, "data": image_bytes},
                analysis_prompt
            ])
            
            # Parse response
            response_text = response.text
            
            # Try to extract JSON from response
            try:
                # Find JSON in response (might be wrapped in markdown code blocks)
                json_str = response_text
                if "```json" in json_str:
                    json_str = json_str.split("```json")[1].split("```")[0]
                elif "```" in json_str:
                    json_str = json_str.split("```")[1].split("```")[0]
                
                medicine_data = json.loads(json_str.strip())
                
                # Validate and enhance confidence score based on assessment
                medicine_data = self._enhance_medicine_data(medicine_data)
                
                return {
                    "status": "success",
                    "data": medicine_data,
                    "raw_analysis": response_text
                }
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse Gemini response as JSON: {e}")
                return self._error_response(f"Failed to parse medicine data: {str(e)}")
            
        except Exception as e:
            logger.error(f"Error analyzing medicine image: {str(e)}")
            return self._error_response(f"Analysis failed: {str(e)}")
    
    def _enhance_medicine_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enhance medicine data with intelligent confidence scoring.
        
        Confidence scoring logic:
        - AUTHENTIC: 97-99% (excellent packaging, clear printing, all details present)
        - POSSIBLY_AUTHENTIC: 90-96% (good packaging, minor issues)
        - SUSPICIOUS: 70-89% (packaging quality concerns, some details unclear)
        - COUNTERFEIT: 50-69% (significant red flags)
        - FAKE: 20-49% (clearly counterfeit)
        """
        authenticity = data.get("authenticity_assessment", "SUSPICIOUS").upper()
        
        # Smart confidence scoring based on authenticity
        confidence_map = {
            "AUTHENTIC": (97, 99),           # 97-99%
            "POSSIBLY_AUTHENTIC": (90, 96), # 90-96%
            "SUSPICIOUS": (70, 89),         # 70-89%
            "COUNTERFEIT": (50, 69),        # 50-69%
            "FAKE": (20, 49)                # 20-49%
        }
        
        min_conf, max_conf = confidence_map.get(authenticity, (50, 70))
        
        # If confidence already provided, clamp it within appropriate range
        current_conf = data.get("confidence_score", 0)
        if current_conf == 0 or current_conf > 100:
            data["confidence_score"] = min(max_conf, max(min_conf, current_conf or min_conf + 2))
        else:
            # Ensure it's within the right range for this authenticity level
            data["confidence_score"] = min(max_conf, max(min_conf, current_conf))
        
        # Add risk tier based on confidence
        conf = data["confidence_score"]
        if conf >= 95:
            data["risk_tier"] = "VERY_LOW"
            data["risk_label"] = "✓ Authentic"
            data["recommendation"] = "Safe to use - Authentic medicine detected"
        elif conf >= 85:
            data["risk_tier"] = "LOW"
            data["risk_label"] = "⚠ Likely Authentic"
            data["recommendation"] = "Likely safe - Verify with pharmacist if concerned"
        elif conf >= 70:
            data["risk_tier"] = "MEDIUM"
            data["risk_label"] = "⚠ Questionable"
            data["recommendation"] = "Consult pharmacist before use"
        elif conf >= 50:
            data["risk_tier"] = "HIGH"
            data["risk_label"] = "✗ Likely Counterfeit"
            data["recommendation"] = "DO NOT USE - Report to pharmacist/authorities"
        else:
            data["risk_tier"] = "CRITICAL"
            data["risk_label"] = "✗ Counterfeit"
            data["recommendation"] = "DO NOT USE - Report to drug authorities immediately"
        
        return data
    
    def _error_response(self, message: str) -> Dict[str, Any]:
        """Return standardized error response."""
        return {
            "status": "error",
            "message": message,
            "data": None
        }


# Initialize global engine
medicine_engine = MedicineAnalysisEngine()

def get_medicine_analysis_engine() -> MedicineAnalysisEngine:
    """Get the global medicine analysis engine."""
    return medicine_engine
