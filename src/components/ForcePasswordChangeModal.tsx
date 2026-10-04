"use client";

import React, { useState } from "react";
import { Lock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ForcePasswordChangeModalProps {
  isOpen: boolean;
  onPasswordChanged: (geminiKey?: string, siteId?: string) => void;
}

export function ForcePasswordChangeModal({
  isOpen,
  onPasswordChanged,
}: ForcePasswordChangeModalProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [preferredSite, setPreferredSite] = useState("MCO");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 6) {
      setErrorMessage("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      if (!supabase) throw new Error("Supabase no está inicializado.");

      // 1. Actualizar contraseña, gemini_api_key y preferred_site en Supabase Auth
      const updateData: any = {
        must_change_password: false,
      };

      if (geminiKey.trim()) {
        updateData.gemini_api_key = geminiKey.trim();
      }
      if (preferredSite) {
        updateData.preferred_site = preferredSite;
      }

      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword,
        data: updateData,
      });

      if (authError) throw authError;

      onPasswordChanged(geminiKey.trim(), preferredSite);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Error al actualizar la contraseña.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="bg-neutral-900 border border-yellow-400/40 rounded-3xl w-full max-w-md p-6 sm:p-8 relative shadow-2xl space-y-4">
        <div className="flex items-center space-x-3 text-yellow-400">
          <div className="w-10 h-10 rounded-2xl bg-yellow-400/20 border border-yellow-400/30 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Primer Inicio de Sesión</h3>
            <p className="text-xs text-yellow-300">Cambio obligatorio de contraseña temporal</p>
          </div>
        </div>

        <p className="text-xs text-neutral-300 leading-relaxed">
          Has iniciado sesión con una clave temporal asignada por el administrador. Por seguridad de tu cuenta, debes definir tu contraseña definitiva para continuar.
        </p>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="text-xs text-neutral-400 block mb-1">Nueva Contraseña</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full bg-neutral-800 border border-neutral-700 text-neutral-100 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div>
            <label className="text-xs text-neutral-400 block mb-1">Confirmar Contraseña</label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite tu nueva contraseña"
              className="w-full bg-neutral-800 border border-neutral-700 text-neutral-100 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div className="pt-2 border-t border-neutral-800 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-neutral-300 font-semibold">
                  Tu API Key de Google Gemini (Opcional ahora o después)
                </label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-yellow-400 hover:underline"
                >
                  Obtener gratis
                </a>
              </div>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy... (la puedes ingresar ahora o en tu perfil)"
                className="w-full bg-neutral-800 border border-neutral-700 text-neutral-100 font-mono rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="text-xs text-neutral-300 font-semibold block mb-1">
                País / Región Principal de Mercado Libre
              </label>
              <select
                value={preferredSite}
                onChange={(e) => setPreferredSite(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 text-white rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-yellow-400"
              >
                <option value="MCO">🇨🇴 Colombia (MCO)</option>
                <option value="MLM">🇲🇽 México (MLM)</option>
                <option value="MLA">🇦🇷 Argentina (MLA)</option>
                <option value="MLC">🇨🇱 Chile (MLC)</option>
                <option value="MPE">🇵🇪 Perú (MPE)</option>
                <option value="MLB">🇧🇷 Brasil (MLB)</option>
                <option value="MLU">🇺🇾 Uruguay (MLU)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 text-neutral-950 font-bold text-sm rounded-xl transition shadow-lg shadow-yellow-400/20 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <span>Actualizando contraseña...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Guardar y Entrar a la Aplicación</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
