import { describe, expect, it } from 'vitest';
import { analyzeQualityMetrics, updateAutoCaptureGate } from './cameraQuality';

describe('camera quality gating', () => {
  it('marks frame ready when all checks pass', () => {
    const result = analyzeQualityMetrics({
      blurVariance: 180,
      brightness: 120,
      motion: 0.05,
      edgeDensity: 0.08,
      strokeDensity: 0.16,
      objectCoverage: 0.42,
      edgePixelRatio: 0.08,
    });

    expect(result.ready).toBe(true);
    expect(result.checks.hasObject).toBe(true);
  });

  it('returns searching status when object is not detected', () => {
    const result = analyzeQualityMetrics({
      blurVariance: 220,
      brightness: 126,
      motion: 0.03,
      edgeDensity: 0.01,
      strokeDensity: 0.02,
      objectCoverage: 0.96,
      edgePixelRatio: 0.005,
    });

    expect(result.ready).toBe(false);
    expect(result.status).toBe('Searching product');
  });

  it('blocks ready state when keyword evidence is required but missing', () => {
    const result = analyzeQualityMetrics(
      {
        blurVariance: 180,
        brightness: 120,
        motion: 0.05,
        edgeDensity: 0.08,
        strokeDensity: 0.16,
        objectCoverage: 0.42,
        edgePixelRatio: 0.08,
        keywordHit: false,
      },
      undefined,
      { requireKeywordEvidence: true },
    );

    expect(result.ready).toBe(false);
    expect(result.checks.keywordEnough).toBe(false);
  });

  it('allows ready state when keyword evidence is not required', () => {
    const result = analyzeQualityMetrics(
      {
        blurVariance: 180,
        brightness: 120,
        motion: 0.05,
        edgeDensity: 0.08,
        strokeDensity: 0.16,
        objectCoverage: 0.42,
        edgePixelRatio: 0.08,
        keywordHit: false,
      },
      undefined,
      { requireKeywordEvidence: false },
    );

    expect(result.ready).toBe(true);
    expect(result.checks.keywordEnough).toBe(true);
  });

  it('requires continuous hold duration before capture', () => {
    const gate1 = updateAutoCaptureGate({ startedAt: null }, true, 1000, 1000);
    expect(gate1.shouldCapture).toBe(false);
    expect(gate1.stableMs).toBe(0);

    const gate2 = updateAutoCaptureGate(gate1, true, 1700, 1000);
    expect(gate2.shouldCapture).toBe(false);
    expect(gate2.stableMs).toBe(700);

    const gate3 = updateAutoCaptureGate(gate2, true, 2050, 1000);
    expect(gate3.shouldCapture).toBe(true);
    expect(gate3.stableMs).toBe(1050);
  });

  it('resets hold timer when frame quality drops', () => {
    const gate1 = updateAutoCaptureGate({ startedAt: null }, true, 1000, 1000);
    const gate2 = updateAutoCaptureGate(gate1, false, 1200, 1000);
    expect(gate2.shouldCapture).toBe(false);
    expect(gate2.startedAt).toBe(null);
    expect(gate2.stableMs).toBe(0);
  });
});
