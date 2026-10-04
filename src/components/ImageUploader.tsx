"use client";

import React, { useRef, useState } from "react";
import { UploadCloud, Camera, Image as ImageIcon } from "lucide-react";
import { CameraCapture } from "./CameraCapture";

interface ImageUploaderProps {
  onImageSelected: (base64Image: string, previewUrl: string) => void;
  isLoading?: boolean;
}

export function ImageUploader({ onImageSelected, isLoading }: ImageUploaderProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Por favor selecciona un archivo de imagen válido (JPG, PNG, WEBP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        onImageSelected(result, result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all duration-200 cursor-pointer ${
          isDragging
            ? "border-yellow-400 bg-yellow-400/10 scale-[1.01]"
            : "border-neutral-700 bg-neutral-900/60 hover:border-yellow-400/70 hover:bg-neutral-900"
        } ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-yellow-500/20 to-yellow-300/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400 shadow-inner">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white">
              Arrastra una imagen del producto o haz clic para subir
            </h3>
            <p className="text-sm text-neutral-400 mt-1 max-w-sm mx-auto">
              Sube una foto de empaque, etiqueta o el producto directamente para identificarlo y analizar su competencia en Mercado Libre.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="flex items-center space-x-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-medium rounded-xl border border-neutral-700 transition"
            >
              <ImageIcon className="w-4 h-4 text-yellow-400" />
              <span>Explorar Archivos</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowCamera(true);
              }}
              className="flex items-center space-x-2 px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-neutral-950 text-sm font-semibold rounded-xl shadow-lg shadow-yellow-400/10 transition active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>Tomar Foto con Cámara</span>
            </button>
          </div>
        </div>
      </div>

      {showCamera && (
        <CameraCapture
          onCapture={(img) => onImageSelected(img, img)}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}
