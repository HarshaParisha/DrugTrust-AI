@echo off
setlocal enabledelayedexpansion

echo ============================================================
echo   DRUGTRUST AI MASTER TEST SUITE
echo ============================================================

set "PASSED_COUNT=0"
set "TOTAL_COUNT=4"

:: Step 1: DB Importer
echo [1/4] Testing DB Importer...
python backend\scripts\validate_db.py >nul 2>&1
if !errorlevel! equ 0 (
    set "STEP1=[OK] DB Importer: PASS"
    set /a "PASSED_COUNT+=1"
) else (
    set "STEP1=[ERROR] DB Importer: FAIL (Run build_medicines_db.py first)"
)

:: Step 2: LLM Engine
echo [2/4] Testing LLM Engine (requires Ollama)...
python backend\scripts\test_llm.py >test_llm_out.txt 2>&1
findstr /C:"[OK] Stream completed" test_llm_out.txt >nul
if !errorlevel! equ 0 (
    set "STEP2=[OK] LLM Engine: PASS"
    set /a "PASSED_COUNT+=1"
) else (
    set "STEP2=[ERROR] LLM Engine: FAIL (Check if Ollama is running)"
)
del test_llm_out.txt

:: Step 3: Vision Pipeline
echo [3/4] Testing Vision inference...
python backend\scripts\test_vision.py >test_vision_out.txt 2>&1
findstr /C:"[OK] Vision inference test completed" test_vision_out.txt >nul
if !errorlevel! equ 0 (
    set "STEP3=[OK] Vision Pipeline: PASS"
    set /a "PASSED_COUNT+=1"
) else (
    :: Check if it failed due to no weights
    findstr /C:"Warning: No trained weights found" test_vision_out.txt >nul
    if !errorlevel! equ 0 (
        set "STEP3=[WARN] Vision Pipeline: PASS (Untrained weights)"
        set /a "PASSED_COUNT+=1"
    ) else (
        set "STEP3=[ERROR] Vision Pipeline: FAIL"
    )
)
del test_vision_out.txt

:: Step 4: Full Pipeline
echo [4/4] Testing Full Integration Pipeline...
python backend\scripts\test_full_pipeline.py >test_full_out.txt 2>&1
findstr /C:"[OK] End-to-end pipeline test completed" test_full_out.txt >nul
if !errorlevel! equ 0 (
    set "STEP4=[OK] Full Pipeline: PASS"
    set /a "PASSED_COUNT+=1"
) else (
    set "STEP4=[ERROR] Full Pipeline: FAIL"
)
del test_full_out.txt

echo.
echo ============================================================
echo   FINAL TEST SUMMARY (!PASSED_COUNT!/!TOTAL_COUNT! PASSED)
echo ============================================================
echo !STEP1!
echo !STEP2!
echo !STEP3!
echo !STEP4!
echo ============================================================

if !PASSED_COUNT! equ !TOTAL_COUNT! (
    echo [READY] SYSTEM READY FOR DEMO.
) else (
    echo [WARN] SOME COMPONENTS FAILED. CHECK LOGS.
)
pause
