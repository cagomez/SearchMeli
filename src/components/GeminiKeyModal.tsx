"use client";

import React, { useState } from "react";
import { KeyRound, Check, ExternalLink, X, ShieldAlert } from "lucide-react";

interface GeminiKeyModalProps {
  apiKey: string;
  onSaveKey: (key: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function GeminiKeyModal({
  apiKey,
  onSaveKey,
  isOpen,
  onClose,
}: GeminiKeyModalProps) {
  const [tempKey, setTempKey] = useState(apiKey);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveKey(tempKey.trim());
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-6 relative shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Mi API Key de Gemini</h3>
              <p className="text-xs text-neutral-400">Reconocimiento visual de productos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-neutral-300 leading-relaxed">
          Cada usuario puede usar su propia clave gratuita de Google Gemini para procesar fotos de productos con inteligencia artificial.
        </p>

        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-1.5 text-xs text-yellow-400 hover:text-yellow-300 underline font-medium"
        >
          <span>Obtén tu API Key gratuita en Google AI Studio</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        <form onSubmit={handleSave} className="space-y-4 pt-1">
          <div>
            <label className="text-xs text-neutral-400 block mb-1.5 font-medium">
              Clave de API (AIzaSy...)
            </label>
            <input
              type="password"
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-neutral-800 border border-neutral-700 text-neutral-100 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-neutral-400 hover:text-neutral-200 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-neutral-950 text-xs font-semibold rounded-xl transition flex items-center space-x-1.5 shadow"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-800" />
                  <span>¡Guardada!</span>
                </>
              ) : (
                <span>Guardar Clave</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
