const OMIT_KEYS = new Set(['heatmap_base64', 'ocr_debug_trace']);

function pruneValue(value, depth = 0) {
  if (value == null) return value;
  if (depth > 4) return undefined;

  if (Array.isArray(value)) {
    return value.map((item) => pruneValue(item, depth + 1)).filter((item) => item !== undefined);
  }

  if (typeof value === 'object') {
    const out = {};
    for (const [key, nested] of Object.entries(value)) {
      if (OMIT_KEYS.has(key)) continue;
      const pruned = pruneValue(nested, depth + 1);
      if (pruned !== undefined) out[key] = pruned;
    }
    return out;
  }

  return value;
}

export function makeScanCacheSnapshot(result) {
  if (!result || typeof result !== 'object') return null;

  const snapshot = pruneValue(result);
  if (!snapshot) return null;

  snapshot.__cache_scope = 'summary';
  snapshot.__cache_version = 1;
  return snapshot;
}

export function safeSessionStorageSet(key, value) {
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch (error) {
    // Quota exceeded or storage unavailable: fail gracefully.
    try {
      if (error && /quota|storage|exceeded/i.test(String(error.message || error))) {
        return false;
      }
    } catch {}
    return false;
  }
}
