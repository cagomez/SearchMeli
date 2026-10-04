"use client";

import React, { useRef, useState } from "react";
import { Camera, RefreshCw, X, Check } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (base64Image: string) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = async (facing: "environment" | "user") => {
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      setCameraError(null);
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err: unknown) {
      console.error("Error abriendo cámara:", err);
      setCameraError(
        "No se pudo acceder a la cámara. Por favor verifica los permisos del navegador o adjunta una foto desde tus archivos."
      );
    }
  };

  React.useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setCapturedPhoto(dataUrl);
    }
  };

  const confirmPhoto = () => {
    if (capturedPhoto) {
      onCapture(capturedPhoto);
      onClose();
    }
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 text-white">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-yellow-400" />
            <h3 className="font-semibold text-sm sm:text-base">Capturar Producto</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport de Cámara o Vista Previa */}
        <div className="relative w-full aspect-video sm:aspect-square bg-black flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center text-red-400 text-sm">
              <p>{cameraError}</p>
            </div>
          ) : capturedPhoto ? (
            <img
              src={capturedPhoto}
              alt="Foto capturada"
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}

          {/* Guía visual de enfoque para el producto */}
          {!capturedPhoto && !cameraError && (
            <div className="absolute inset-8 border-2 border-dashed border-yellow-400/60 rounded-xl pointer-events-none flex items-center justify-center">
              <span className="bg-black/60 text-yellow-300 text-xs px-2.5 py-1 rounded-full backdrop-blur-sm">
                Enfoca el producto aquí
              </span>
            </div>
          )}
        </div>

        {/* Controles */}
        <div className="p-4 bg-neutral-950 flex items-center justify-around">
          {capturedPhoto ? (
            <>
              <button
                onClick={retakePhoto}
                className="flex items-center space-x-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-medium rounded-xl transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Tomar de nuevo</span>
              </button>
              <button
                onClick={confirmPhoto}
                className="flex items-center space-x-2 px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-neutral-900 font-semibold text-sm rounded-xl transition shadow-lg shadow-yellow-400/20"
              >
                <Check className="w-4 h-4" />
                <span>Usar esta foto</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={toggleCamera}
                disabled={Boolean(cameraError)}
                className="p-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-full transition disabled:opacity-50"
                title="Cambiar cámara"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={takePhoto}
                disabled={Boolean(cameraError)}
                className="w-16 h-16 rounded-full border-4 border-yellow-400 bg-white hover:bg-neutral-200 transition flex items-center justify-center shadow-lg active:scale-95 disabled:opacity-50"
              >
                <div className="w-12 h-12 rounded-full bg-yellow-400" />
              </button>
              <div className="w-10" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
