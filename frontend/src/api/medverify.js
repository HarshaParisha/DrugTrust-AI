/**
 * Drugtrust AI — All API calls centralized here.
 * Base URL: VITE_API_URL env var or http://localhost:8000
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function handleResponse(res) {
  if (!res.ok) {
    let errBody;
    try { errBody = await res.json(); } catch { errBody = null; }
    const msg = errBody?.detail || errBody?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
}

/**
 * POST /verify/image — submit image for full verification
 * @param {File} file
 * @param {boolean | { includeHeatmap?: boolean, source?: string, signal?: AbortSignal }} options
 */
export async function verifyImage(file, options = false) {
  const normalized = typeof options === 'boolean'
    ? { includeHeatmap: options }
    : (options || {});

  const includeHeatmap = Boolean(normalized.includeHeatmap);
  const form = new FormData();
  form.append('image', file);
  form.append('include_heatmap', includeHeatmap ? 'true' : 'false');
  if (normalized.source) {
    form.append('scan_source', String(normalized.source));
  }

  const res = await fetch(`${BASE_URL}/verify/image`, {
    method: 'POST',
    body: form,
    signal: normalized.signal,
  });
  return handleResponse(res);
}

/**
 * POST /verify/stream — SSE streaming verification
 * @param {File} file
 * @param {(token: string) => void} onToken - called for each LLM token
 * @param {(result: object) => void} onComplete - called with final result
 * @param {(stages: object) => void} onVisionOCR - called when vision+OCR complete
 */
export async function verifyStream(file, onToken, onComplete, onVisionOCR) {
  const form = new FormData();
  form.append('image', file);

  const res = await fetch(`${BASE_URL}/verify/stream`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') { onComplete && onComplete(null); return; }
      try {
        const data = JSON.parse(payload);
        if (data.stage === 'vision_ocr_complete') {
          onVisionOCR && onVisionOCR(data);
        } else if (data.stage === 'llm_token') {
          onToken && onToken(data.token);
        } else if (data.scan_id) {
          onComplete && onComplete(data);
        }
      } catch { /* skip malformed */ }
    }
  }
}

/**
 * GET /verify/{scanId}
 */
export async function getScan(scanId) {
  const res = await fetch(`${BASE_URL}/verify/${scanId}`);
  return handleResponse(res);
}

/**
 * POST /verify/report/{scanId}
 */
export async function reportScan(scanId, note) {
  const res = await fetch(`${BASE_URL}/verify/report/${scanId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_note: note || '' }),
  });
  return handleResponse(res);
}

/**
 * GET /history/
 */
export async function getHistory(limit = 20, offset = 0) {
  const res = await fetch(`${BASE_URL}/history/?limit=${limit}&offset=${offset}`);
  return handleResponse(res);
}

/**
 * DELETE /history/
 */
export async function clearHistory() {
  const res = await fetch(`${BASE_URL}/history/`, { method: 'DELETE' });
  return handleResponse(res);
}

/**
 * GET /risk-policy
 */
export async function getRiskPolicy() {
  const res = await fetch(`${BASE_URL}/verify/risk-policy`);
  return handleResponse(res);
}

/**
 * GET /health
 */
export async function getHealth() {
  const res = await fetch(`${BASE_URL}/health`);
  return handleResponse(res);
}

/**
 * GET /medicine/?search=
 */
export async function searchMedicine(query = '') {
  const res = await fetch(`${BASE_URL}/medicine/?search=${encodeURIComponent(query)}&limit=10`);
  return handleResponse(res);
}

/**
 * GET /verify/llm-status
 */
export async function getLLMStatus() {
  const res = await fetch(`${BASE_URL}/verify/llm-status`);
  return handleResponse(res);
}

/**
 * POST /verify/analyze-medicine — Advanced AI analysis of medicine image
 * Uses Google Gemini API for detailed medicine information extraction
 * @param {File} file - Medicine image file
 * @returns {Promise<{status: string, data: object}>}
 */
export async function analyzeMedicineImage(file) {
  const form = new FormData();
  form.append('image', file);
  const res = await fetch(`${BASE_URL}/verify/analyze-medicine`, {
    method: 'POST',
    body: form,
  });
  return handleResponse(res);
}

/**
 * POST /verify/analyze-medicine/{scanId}
 * Runs analysis directly from server-stored scan image.
 * @param {string} scanId
 */
export async function analyzeMedicineByScan(scanId) {
  const res = await fetch(`${BASE_URL}/verify/analyze-medicine/${encodeURIComponent(scanId)}`, {
    method: 'POST',
  });
  return handleResponse(res);
}
