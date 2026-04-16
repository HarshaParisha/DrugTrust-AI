import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, PlugZap, RefreshCw, ServerCrash } from 'lucide-react';
import { getLLMStatus } from '../api/medverify';

export default function LLMSetup() {
  const [status, setStatus] = useState({ connected: false, model: 'mistral:latest', endpoint: 'http://localhost:11434/api/generate', reason: 'not_checked', available_models: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const checkStatus = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getLLMStatus();
      setStatus(data);
    } catch (e) {
      setError(e.message || 'Could not fetch LLM status');
      setStatus((prev) => ({ ...prev, connected: false }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <div className="min-h-screen px-4 py-6 md:py-8 max-w-4xl mx-auto relative z-10">
      <header className="mb-6">
        <Link to="/home" className="mv-button mv-button-ghost text-mv-teal">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
        </Link>
        <h1 className="font-mono text-xl md:text-2xl font-bold text-white uppercase tracking-wider mt-3">
          Connect LLM Locally
        </h1>
        <p className="font-sans text-gray-400 text-sm mt-2">
          Follow this guide to connect LM Studio (recommended) or Ollama for professional doctor-style prescription briefing.
        </p>
      </header>

      <section className="clinical-card mb-5" aria-live="polite">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-gray-500 mb-1">Connection Status</p>
            <p className={`font-mono text-sm inline-flex items-center gap-1.5 ${status.connected ? 'text-emerald-300' : 'text-amber-300'}`}>
              {status.connected ? <CheckCircle2 className="h-4 w-4" /> : <ServerCrash className="h-4 w-4" />}
              {status.connected ? 'Connected' : 'Not Connected'}
            </p>
            <p className="font-mono text-[11px] text-gray-500 mt-2 break-all">Model: {status.model || 'mistral:latest'}</p>
            <p className="font-mono text-[11px] text-gray-500 break-all">Endpoint: {status.endpoint || 'http://localhost:11434/api/generate'}</p>
            <p className="font-mono text-[11px] text-gray-500 break-all">Provider: {status.provider || 'ollama'}</p>
            {!status.connected && status.reason && (
              <p className="font-mono text-[11px] text-amber-300/80 mt-1">Reason: {status.reason}</p>
            )}
          </div>

          <button
            onClick={checkStatus}
            disabled={loading}
            className="mv-button mv-button-secondary disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Checking...' : 'Check Again'}
          </button>
        </div>

        {error && <p className="font-mono text-xs text-mv-danger mt-3">{error}</p>}
        {!error && Array.isArray(status.available_models) && status.available_models.length > 0 && (
          <p className="font-mono text-xs text-gray-500 mt-3 break-words">
            Available models: {status.available_models.join(', ')}
          </p>
        )}
      </section>

      <section className="clinical-card space-y-5">
        <div>
          <h2 className="font-mono text-xs uppercase tracking-widest text-mv-teal mb-2 inline-flex items-center gap-1.5">
            <PlugZap className="h-3.5 w-3.5" /> Setup Steps
          </h2>
          <ol className="list-decimal list-inside space-y-2 font-sans text-sm text-gray-300">
            <li>Install <span className="font-mono">LM Studio</span> on your system (Windows/macOS/Linux).</li>
            <li>Open LM Studio → download any chat model that matches your hardware (7B for mid-range systems, larger models for high-RAM/GPU systems).</li>
            <li>Go to LM Studio local server settings and start the OpenAI-compatible server (default: <span className="font-mono">http://127.0.0.1:1234/v1</span>).</li>
            <li>Set these in your <span className="font-mono">.env</span>: <span className="font-mono">LLM_PROVIDER=lmstudio</span>, <span className="font-mono">LLM_BASE_URL=http://127.0.0.1:1234/v1</span>, <span className="font-mono">LLM_MODEL=&lt;your_model_id&gt;</span>.</li>
            <li>Restart backend and click <span className="font-mono">Check Again</span>. Once connected, Drugtrust AI will generate doctor-style prescription guidance and fill available medicine fields.</li>
          </ol>
        </div>

        <div className="border border-mv-border p-3 bg-black/20">
          <p className="font-mono text-xs text-gray-400 mb-2 uppercase tracking-wider">Common Issues</p>
          <ul className="list-disc list-inside space-y-1 font-sans text-sm text-gray-300">
            <li>LM Studio local server not started.</li>
            <li>Model downloaded but not loaded in local server.</li>
            <li>Wrong model id in <span className="font-mono">LLM_MODEL</span>.</li>
            <li>Firewall blocking localhost communication.</li>
            <li>You can still use Ollama by setting <span className="font-mono">LLM_PROVIDER=ollama</span>.</li>
          </ul>
        </div>

        <p className="font-mono text-xs text-gray-500">
          Tip: you can continue scanning without LLM, but guidance quality improves when connected.
        </p>
      </section>
    </div>
  );
}
