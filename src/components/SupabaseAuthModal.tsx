"use client";

import React, { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { User, LogIn, LogOut, KeyRound, Sparkles } from "lucide-react";

export function SupabaseAuthModal() {
  const [user, setUser] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setMessage("Supabase no está configurado aún. Configura las variables de entorno.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setIsOpen(false);
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage("¡Registro exitoso! Revisa tu correo o inicia sesión.");
        setIsLogin(true);
      }
    } catch (err: any) {
      setMessage(err.message || "Ocurrió un error en la autenticación");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      setUser(null);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="flex items-center space-x-2 text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20 px-3 py-1.5 rounded-xl">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>Supabase listo para conectar</span>
      </div>
    );
  }

  return (
    <div>
      {user ? (
        <div className="flex items-center space-x-3 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-xl">
          <div className="w-6 h-6 rounded-full bg-yellow-400/20 text-yellow-400 flex items-center justify-center text-xs font-bold">
            {user.email?.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs text-neutral-300 hidden sm:inline max-w-[140px] truncate">
            {user.email}
          </span>
          <button
            onClick={handleLogout}
            className="text-neutral-400 hover:text-red-400 transition"
            title="Cerrar sesión"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-xl border border-neutral-700 transition"
        >
          <LogIn className="w-3.5 h-3.5 text-yellow-400" />
          <span>Iniciar Sesión</span>
        </button>
      )}

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-sm p-6 relative shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">
              {isLogin ? "Iniciar Sesión" : "Crear Cuenta"}
            </h3>
            <p className="text-xs text-neutral-400 mb-4">
              Guarda tus búsquedas e historial de productos analizados.
            </p>

            {message && (
              <div className="p-3 mb-4 rounded-xl text-xs bg-yellow-400/10 border border-yellow-400/30 text-yellow-300">
                {message}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-3">
              <div>
                <label className="text-xs text-neutral-300 block mb-1">Correo electrónico</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                  className="w-full bg-neutral-800 border border-neutral-700 text-neutral-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-300 block mb-1">Contraseña</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-neutral-800 border border-neutral-700 text-neutral-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-300 text-neutral-950 font-semibold text-sm rounded-xl transition mt-2 disabled:opacity-50"
              >
                {loading ? "Procesando..." : isLogin ? "Entrar" : "Registrarse"}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setMessage(null);
                }}
                className="text-xs text-neutral-400 hover:text-yellow-400 transition"
              >
                {isLogin
                  ? "¿No tienes cuenta? Regístrate aquí"
                  : "¿Ya tienes cuenta? Inicia sesión"}
              </button>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="mt-3 w-full py-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
