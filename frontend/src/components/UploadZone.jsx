import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Camera, CheckCircle2, RotateCcw, Upload } from 'lucide-react';
import CameraScanner from './CameraScanner';

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

export default function UploadZone({ onFile, disabled }) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const stopCamera = useCallback(() => {
    setCameraOpen(false);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const validate = (file) => {
    if (!ALLOWED.includes(file.type)) {
      setError('Unsupported format. Use JPG, PNG, or WEBP.');
      return false;
    }
    if (file.size > MAX_SIZE) {
      setError('File too large. Maximum 10MB.');
      return false;
    }
    return true;
  };

  const handleFile = useCallback((file) => {
    setError('');
    if (!validate(file)) return;
    if (preview) URL.revokeObjectURL(preview);
    const url = URL.createObjectURL(file);
    setPreview(url);
    setPendingFile(file);
    setShowConfirm(true);
  }, [preview]);

  const confirmSelection = () => {
    if (!pendingFile) return;
    setShowConfirm(false);
    onFile(pendingFile);
  };

  const resetSelection = () => {
    if (preview) URL.revokeObjectURL(preview);
    setShowConfirm(false);
    setPendingFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const openCamera = async () => {
    setCameraError('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported on this browser.');
      }
      // CameraScanner requests stream. This check keeps fallback behavior aligned.
      setCameraOpen(true);
    } catch (err) {
      setCameraError(err.message || 'Unable to open camera. Falling back to device image picker.');
      cameraInputRef.current?.click();
    }
  };

  const handleCameraCapture = async (file, options = {}) => {
    setCameraOpen(false);
    setError('');
    if (!validate(file)) return;
    if (preview) URL.revokeObjectURL(preview);
    const url = URL.createObjectURL(file);
    setPreview(url);
    setPendingFile(file);
    setShowConfirm(false);
    await Promise.resolve(onFile(file, options));
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onInputChange = (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="w-full">
      <motion.div
        className={`drop-zone flex flex-col items-center justify-center min-h-64 cursor-pointer relative overflow-hidden
          ${dragOver ? 'drag-over' : ''} ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        whileHover={{ scale: 1.005 }}
      >
        <AnimatePresence mode="wait">
          {preview ? (
            <motion.div
              key="preview"
              className="w-full flex flex-col items-center gap-4 py-6 px-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <img
                src={preview}
                alt="Selected medicine"
                className="max-h-48 max-w-full object-contain border border-mv-border"
              />
              {showConfirm && !disabled ? (
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    className="mv-button mv-button-primary"
                    onClick={confirmSelection}
                    disabled={disabled}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Confirm & Scan
                  </button>
                  <button
                    type="button"
                    className="mv-button mv-button-secondary"
                    onClick={resetSelection}
                    disabled={disabled}
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Retake
                  </button>
                </div>
              ) : (
                disabled && (
                  <p className="font-mono text-xs text-mv-teal uppercase tracking-wider">
                    Scanning in progress...
                  </p>
                )
              )}
              {showConfirm && (
                <p className="font-mono text-xs text-gray-400 uppercase tracking-wider">
                  Confirm this image before starting scan
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              className="flex flex-col items-center gap-4 py-12 px-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {/* Camera SVG */}
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="14" width="48" height="36" stroke="#00E5CC" strokeWidth="2"/>
                <circle cx="28" cy="32" r="10" stroke="#00E5CC" strokeWidth="2"/>
                <circle cx="28" cy="32" r="5" fill="none" stroke="#00E5CC" strokeWidth="1.5"/>
                <rect x="20" y="8" width="16" height="8" stroke="#00E5CC" strokeWidth="2"/>
                <rect x="40" y="20" width="6" height="4" fill="#00E5CC" fillOpacity="0.4"/>
              </svg>
              <div className="text-center">
                <p className="font-mono text-mv-teal text-sm uppercase tracking-widest mb-1">
                  Drop medicine image here
                </p>
                <p className="font-sans text-gray-500 text-xs">
                  or click to browse — JPG, PNG, WEBP · Max 10MB
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  className="mv-button mv-button-secondary"
                  onClick={(e) => {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }}
                  disabled={disabled}
                >
                  <Upload className="h-3.5 w-3.5" /> Upload Photo
                </button>
                <button
                  type="button"
                  className="mv-button mv-button-primary"
                  onClick={(e) => {
                    e.preventDefault();
                    openCamera();
                  }}
                  disabled={disabled}
                >
                  <Camera className="h-3.5 w-3.5" /> Open Camera
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {dragOver && (
          <motion.div
            className="absolute inset-0 bg-mv-teal/5 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="font-mono text-mv-teal uppercase tracking-widest text-sm">Release to scan</span>
          </motion.div>
        )}
      </motion.div>

      <input
        id="file-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onInputChange}
        disabled={disabled}
        ref={fileInputRef}
      />

      <input
        id="camera-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={onInputChange}
        disabled={disabled}
        ref={cameraInputRef}
      />

      <CameraScanner
        open={cameraOpen}
        onClose={stopCamera}
        onCapture={handleCameraCapture}
        disabled={disabled}
      />

      <AnimatePresence>
        {error && (
          <motion.p
            className="mt-2 font-mono text-mv-danger text-xs"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <span className="inline-flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> {error}
            </span>
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cameraError && (
          <motion.p
            className="mt-2 font-mono text-amber-300 text-xs"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <span className="inline-flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> {cameraError}
            </span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
