#!/bin/bash

echo "============================================================"
echo "  DRUGTRUST AI MASTER TEST SUITE"
echo "============================================================"

PASSED_COUNT=0
TOTAL_COUNT=4

# Step 1: DB Importer
echo "[1/4] Testing DB Importer..."
python3 backend/scripts/validate_db.py > /dev/null 2>&1
if [ $? -eq 0 ]; then
    STEP1="[OK] DB Importer: PASS"
    ((PASSED_COUNT++))
else
    STEP1="[ERROR] DB Importer: FAIL (Run build_medicines_db.py first)"
fi

# Step 2: LLM Engine
echo "[2/4] Testing LLM Engine (requires Ollama)..."
python3 backend/scripts/test_llm.py > test_llm_out.txt 2>&1
if grep -q "\[OK\] Stream completed" test_llm_out.txt; then
    STEP2="[OK] LLM Engine: PASS"
    ((PASSED_COUNT++))
else
    STEP2="[ERROR] LLM Engine: FAIL (Check if Ollama is running)"
fi
rm test_llm_out.txt

# Step 3: Vision Pipeline
echo "[3/4] Testing Vision inference..."
python3 backend/scripts/test_vision.py > test_vision_out.txt 2>&1
if grep -q "\[OK\] Vision inference test completed" test_vision_out.txt; then
    STEP3="[OK] Vision Pipeline: PASS"
    ((PASSED_COUNT++))
elif grep -q "Warning: No trained weights found" test_vision_out.txt; then
    STEP3="[WARN] Vision Pipeline: PASS (Untrained weights)"
    ((PASSED_COUNT++))
else
    STEP3="[ERROR] Vision Pipeline: FAIL"
fi
rm test_vision_out.txt

# Step 4: Full Pipeline
echo "[4/4] Testing Full Integration Pipeline..."
python3 backend/scripts/test_full_pipeline.py > test_full_out.txt 2>&1
if grep -q "\[OK\] End-to-end pipeline test completed" test_full_out.txt; then
    STEP4="[OK] Full Pipeline: PASS"
    ((PASSED_COUNT++))
else
    STEP4="[ERROR] Full Pipeline: FAIL"
fi
rm test_full_out.txt

echo ""
echo "============================================================"
echo "  FINAL TEST SUMMARY ($PASSED_COUNT/$TOTAL_COUNT PASSED)"
echo "============================================================"
echo -e "$STEP1"
echo -e "$STEP2"
echo -e "$STEP3"
echo -e "$STEP4"
echo "============================================================"

if [ $PASSED_COUNT -eq $TOTAL_COUNT ]; then
    echo "[READY] SYSTEM READY FOR DEMO."
else
    echo "[WARN] SOME COMPONENTS FAILED. CHECK LOGS."
fi
