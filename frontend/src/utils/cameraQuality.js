export const DEFAULT_QUALITY_THRESHOLDS = {
  minBlurVariance: 120,
  minBrightness: 55,
  maxBrightness: 205,
  maxMotion: 0.12,
  minEdgeDensity: 0.045,
  minStrokeDensity: 0.09,
  minObjectCoverage: 0.18,
  maxObjectCoverage: 0.9,
  minEdgePixelRatio: 0.02,
};

export function rgbToGrayscale(data) {
  const gray = new Uint8Array(data.length / 4);
  for (let i = 0, g = 0; i < data.length; i += 4, g += 1) {
    gray[g] = Math.round((data[i] * 0.299) + (data[i + 1] * 0.587) + (data[i + 2] * 0.114));
  }
  return gray;
}

export function calculateMeanBrightness(gray) {
  if (!gray?.length) return 0;
  let sum = 0;
  for (let i = 0; i < gray.length; i += 1) sum += gray[i];
  return sum / gray.length;
}

export function calculateLaplacianVariance(gray, width, height) {
  if (!gray?.length || width < 3 || height < 3) return 0;
  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const lap = (4 * gray[i]) - gray[i - 1] - gray[i + 1] - gray[i - width] - gray[i + width];
      sum += lap;
      sumSq += lap * lap;
      count += 1;
    }
  }

  if (!count) return 0;
  const mean = sum / count;
  return (sumSq / count) - (mean * mean);
}

export function calculateMotionScore(currentGray, previousGray) {
  if (!currentGray?.length || !previousGray?.length || currentGray.length !== previousGray.length) return 1;
  let diff = 0;
  for (let i = 0; i < currentGray.length; i += 1) {
    diff += Math.abs(currentGray[i] - previousGray[i]);
  }
  return (diff / currentGray.length) / 255;
}

export function calculateEdgeDensity(gray, width, height) {
  if (!gray?.length || width < 3 || height < 3) return 0;
  let edges = 0;
  let pixels = 0;
  const threshold = 42;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const gx = gray[i + 1] - gray[i - 1];
      const gy = gray[i + width] - gray[i - width];
      const mag = Math.abs(gx) + Math.abs(gy);
      if (mag > threshold) edges += 1;
      pixels += 1;
    }
  }

  return pixels ? edges / pixels : 0;
}

export function calculateStrokeDensity(gray, width, height) {
  if (!gray?.length || width < 2 || height < 2) return 0;

  let transitions = 0;
  let total = 0;
  const threshold = 24;

  // Horizontal transitions
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * width;
    for (let x = 1; x < width; x += 1) {
      const a = gray[rowStart + x - 1];
      const b = gray[rowStart + x];
      if (Math.abs(a - b) >= threshold) transitions += 1;
      total += 1;
    }
  }

  // Vertical transitions
  for (let y = 1; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const a = gray[(y - 1) * width + x];
      const b = gray[y * width + x];
      if (Math.abs(a - b) >= threshold) transitions += 1;
      total += 1;
    }
  }

  return total ? transitions / total : 0;
}

export function calculateObjectCoverageFromEdges(gray, width, height) {
  if (!gray?.length || width < 3 || height < 3) {
    return { objectCoverage: 0, edgePixelRatio: 0 };
  }

  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  let edgePixels = 0;
  let total = 0;
  const threshold = 42;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const gx = gray[i + 1] - gray[i - 1];
      const gy = gray[i + width] - gray[i - width];
      const mag = Math.abs(gx) + Math.abs(gy);
      if (mag > threshold) {
        edgePixels += 1;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      total += 1;
    }
  }

  const edgePixelRatio = total ? edgePixels / total : 0;
  if (edgePixels === 0 || maxX < minX || maxY < minY) {
    return { objectCoverage: 0, edgePixelRatio };
  }

  const bboxW = (maxX - minX) + 1;
  const bboxH = (maxY - minY) + 1;
  const objectCoverage = (bboxW * bboxH) / (width * height);

  return { objectCoverage, edgePixelRatio };
}

export function analyzeQualityMetrics(metrics, thresholds = DEFAULT_QUALITY_THRESHOLDS, options = {}) {
  const requireKeywordEvidence = Boolean(options.requireKeywordEvidence);

  const sharpEnough = metrics.blurVariance >= thresholds.minBlurVariance;
  const brightEnough = metrics.brightness >= thresholds.minBrightness;
  const notOverBright = metrics.brightness <= thresholds.maxBrightness;
  const stableEnough = metrics.motion <= thresholds.maxMotion;
  const edgeEnough = metrics.edgeDensity >= thresholds.minEdgeDensity;
  const strokeEnough = (metrics.strokeDensity ?? 0) >= thresholds.minStrokeDensity;
  const coverageEnough =
    (metrics.objectCoverage ?? 0) >= thresholds.minObjectCoverage
    && (metrics.objectCoverage ?? 0) <= thresholds.maxObjectCoverage;
  const edgePixelsEnough = (metrics.edgePixelRatio ?? 0) >= thresholds.minEdgePixelRatio;
  const hasObject = edgeEnough && strokeEnough && coverageEnough && edgePixelsEnough;
  const keywordEnough = !requireKeywordEvidence || Boolean(metrics.keywordHit);

  const ready = sharpEnough && brightEnough && notOverBright && stableEnough && hasObject && keywordEnough;

  let status = 'Hold steady';
  if (!hasObject) status = 'Searching product';
  else if (!keywordEnough) status = 'Searching product';
  else if (!brightEnough || !notOverBright) status = 'Hold steady';
  else if (!sharpEnough || !stableEnough) status = 'Hold steady';

  return {
    ready,
    status,
    checks: {
      sharpEnough,
      brightEnough,
      notOverBright,
      stableEnough,
      edgeEnough,
      strokeEnough,
      coverageEnough,
      edgePixelsEnough,
      keywordEnough,
      hasObject,
    },
  };
}

export function updateAutoCaptureGate(gateState, frameReady, nowMs, holdMs = 1000) {
  const prev = gateState || { startedAt: null };

  if (!frameReady) {
    return {
      startedAt: null,
      shouldCapture: false,
      stableMs: 0,
    };
  }

  const startedAt = prev.startedAt ?? nowMs;
  const stableMs = Math.max(0, nowMs - startedAt);

  return {
    startedAt,
    shouldCapture: stableMs >= holdMs,
    stableMs,
  };
}
