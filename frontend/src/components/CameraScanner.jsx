import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Camera, CheckCircle2, RotateCcw, X, Zap, ZapOff } from 'lucide-react';

const ROI = { x: 0.2, y: 0.22, w: 0.6, h: 0.56 };

export default function CameraScanner({
  open,
  onClose,
  onCapture,
  disabled = false,
}) {
  const [streamReady, setStreamReady] = useState(false);
  const [error, setError] = useState('');
  const [statusText, setStatusText] = useState('Align medicine in box');
  const [capturedPreview, setCapturedPreview] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const previewUrlRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const mountedRef = useRef(false);

  const canInteract = !disabled && !isSubmitting;

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStreamReady(false);
    setTorchEnabled(false);
    setTorchSupported(false);
  }, []);

  const cleanupPreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setCapturedPreview(null);
    setCapturedBlob(null);
  }, []);

  const closeScanner = useCallback(() => {
    stopStream();
    cleanupPreview();
    setError('');
    setStatusText('Align medicine in box');
    setIsSubmitting(false);
    onClose?.();
  }, [cleanupPreview, onClose, stopStream]);

  const startStream = useCallback(async () => {
    setError('');
    setStatusText('Align medicine in box');
    cleanupPreview();

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera not supported in this browser. Please upload an image instead.');
      return;
    }

    try {
      stopStream();
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      if (!mountedRef.current) {
        mediaStream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = mediaStream;
      setStreamReady(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }

      const track = mediaStream.getVideoTracks()[0];
      const caps = track?.getCapabilities?.() || {};
      setTorchSupported(Boolean(caps.torch));
    } catch (err) {
      setError(err?.message || 'Camera access failed. Allow permission and try again.');
    }
  }, [cleanupPreview, stopStream]);

  const toBlob = useCallback((canvas, mime = 'image/jpeg', quality = 0.92) => {
    return new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
  }, []);

  const captureFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas || !streamReady) return;
    if (video.readyState < 2) {
      setError('Camera is still warming up. Please try capture again.');
      return;
    }

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    // Export only the visible guide-box region so background is excluded.
    const sx = Math.round(width * ROI.x);
    const sy = Math.round(height * ROI.y);
    const sw = Math.max(1, Math.round(width * ROI.w));
    const sh = Math.max(1, Math.round(height * ROI.h));

    canvas.width = sw;
    canvas.height = sh;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);

    const blob = await toBlob(canvas, 'image/jpeg', 0.92);
    if (!blob) {
      setError('Could not capture image from camera. Please try again.');
      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    const previewUrl = URL.createObjectURL(blob);
    previewUrlRef.current = previewUrl;
    setCapturedPreview(previewUrl);
    setCapturedBlob(blob);
    setStatusText('Review capture');
  }, [streamReady, toBlob]);

  const handleRetake = useCallback(() => {
    cleanupPreview();
    setError('');
    setStatusText('Align medicine in box');
  }, [cleanupPreview]);

  const handleConfirm = useCallback(async () => {
    if (!capturedBlob || !onCapture) return;

    setIsSubmitting(true);
    setStatusText('Analyzing');

    const file = new File([capturedBlob], `camera_scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
    try {
      await onCapture(file, { source: 'manual_capture', includeHeatmap: false });
      closeScanner();
    } catch (err) {
      setError(err?.message || 'Failed to analyze captured image. Please retake and try again.');
      setIsSubmitting(false);
      setStatusText('Review capture');
    }
  }, [capturedBlob, closeScanner, onCapture]);

  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track?.applyConstraints) return;

    try {
      const next = !torchEnabled;
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorchEnabled(next);
    } catch {
      setError('Torch is not available on this device/camera.');
    }
  }, [torchEnabled]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!open) {
      stopStream();
      return undefined;
    }
    startStream();
    return undefined;
  }, [open, startStream, stopStream]);

  useEffect(() => {
    if (!open || !streamReady || !videoRef.current || !streamRef.current) return undefined;

    const video = videoRef.current;
    video.srcObject = streamRef.current;
    video.play().catch(() => {});

    return undefined;
  }, [open, streamReady]);

  useEffect(() => {
    if (!open || capturedBlob) return undefined;
    setStatusText('Align medicine in box');
    return undefined;
  }, [capturedBlob, open]);

  useEffect(() => {
    return () => {
      cleanupPreview();
      stopStream();
    };
  }, [cleanupPreview, stopStream]);

  const badgeTone = useMemo(() => {
    if (statusText === 'Analyzing') {
      return 'text-amber-300 border-amber-500/40 bg-amber-500/10';
    }
    if (statusText === 'Review capture') {
      return 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10';
    }
    return 'text-mv-teal border-mv-teal/40 bg-mv-teal/10';
  }, [statusText]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1300] bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="relative w-full h-full overflow-hidden">
            <video
              ref={videoRef}
              className="camera-live-video absolute inset-0 w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />

            <div className="absolute inset-0 camera-overlay-pointer">
              <div className="absolute inset-0 bg-black/35" />
              <div
                className="absolute border-2 border-mv-teal/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
                style={{
                  left: `${ROI.x * 100}%`,
                  top: `${ROI.y * 100}%`,
                  width: `${ROI.w * 100}%`,
                  height: `${ROI.h * 100}%`,
                }}
              />
            </div>

            <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-3">
              <button type="button" className="mv-button mv-button-secondary" onClick={closeScanner} disabled={!canInteract}>
                <X className="h-3.5 w-3.5" /> Close
              </button>
              <span className={`font-mono text-[10px] uppercase tracking-wider border px-2 py-1 ${badgeTone}`}>
                {statusText}
              </span>
              {torchSupported ? (
                <button
                  type="button"
                  className="mv-button mv-button-secondary"
                  onClick={toggleTorch}
                  disabled={!canInteract || Boolean(capturedBlob)}
                >
                  {torchEnabled ? <ZapOff className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
                  Torch
                </button>
              ) : <span className="w-[108px]" />}
            </div>

            {capturedPreview && (
              <div className="absolute inset-0 z-20 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
                <div className="clinical-card w-full max-w-3xl">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-gray-400 mb-2">Preview captured frame</p>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-amber-300 mb-2">
                    Cropped to guide box only · confirm this medicine image or retake
                  </p>
                  <img src={capturedPreview} alt="Captured medicine" className="w-full max-h-[62vh] object-contain border border-mv-border" />
                  <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
                    <button type="button" className="mv-button mv-button-secondary" onClick={handleRetake} disabled={!canInteract}>
                      <RotateCcw className="h-3.5 w-3.5" /> Retake
                    </button>
                    <button type="button" className="mv-button mv-button-primary" onClick={handleConfirm} disabled={!canInteract}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Confirm & Scan
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!capturedPreview && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-wrap items-center justify-center gap-3 px-3">
                <button
                  type="button"
                  className="mv-button mv-button-primary"
                  onClick={captureFrame}
                  disabled={!canInteract || !streamReady}
                >
                  <Camera className="h-3.5 w-3.5" /> Capture
                </button>
              </div>
            )}

            <div className="absolute bottom-20 left-3 right-3 z-30">
              <p className="font-sans text-[11px] md:text-xs text-gray-200 text-center bg-black/55 border border-white/10 px-3 py-2">
                Drugtrust AI is an assistive screening tool. Always confirm medicine authenticity and usage with a licensed pharmacist or doctor.
              </p>
            </div>

            {error && (
              <div className="absolute left-3 right-3 bottom-36 z-30">
                <p className="font-mono text-xs text-red-300 bg-black/70 border border-red-500/40 px-3 py-2 inline-flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {error}
                </p>
              </div>
            )}

            <canvas ref={captureCanvasRef} className="hidden" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
