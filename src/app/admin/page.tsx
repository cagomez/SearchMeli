"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  Shield,
  Key,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  must_change_password: boolean;
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(true);

  // Formulario nuevo usuario
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [role, setRole] = useState("user");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; pass: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Lista de usuarios
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  useEffect(() => {
    checkAdminRole();
  }, []);

  const checkAdminRole = async () => {
    setLoadingCheck(true);
    try {
      if (!supabase) {
        setIsAdmin(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setIsAdmin(false);
        return;
      }

      setCurrentUser(session.user);

      // Consultar rol en profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profile?.role === "admin" || session.user.email?.includes("admin")) {
        setIsAdmin(true);
        loadUsers();
      } else {
        setIsAdmin(false);
      }
    } catch (err) {
      console.error(err);
      setIsAdmin(false);
    } finally {
      setLoadingCheck(false);
    }
  };

  const loadUsers = async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/admin/create-user");
      const data = await res.json();
      if (res.ok && data.profiles) {
        setProfiles(data.profiles);
      }
    } catch (err) {
      console.error("Error cargando usuarios:", err);
    } finally {
      setLoadingList(false);
    }
  };

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
    let pass = "";
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTempPassword(pass);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setCreatedCredentials(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          fullName,
          password: tempPassword,
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo crear el usuario");
      }

      setFeedback({
        type: "success",
        message: "¡Usuario creado exitosamente con contraseña temporal!",
      });

      setCreatedCredentials({
        email,
        pass: tempPassword,
      });

      // Limpiar formulario y recargar
      setEmail("");
      setFullName("");
      setTempPassword("");
      loadUsers();
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Error al crear usuario",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCredentials = () => {
    if (createdCredentials) {
      navigator.clipboard.writeText(
        `Acceso a SearchMeli:\nUsuario: ${createdCredentials.email}\nContraseña temporal: ${createdCredentials.pass}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loadingCheck) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-yellow-400" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold">Acceso Restringido</h2>
          <p className="text-xs text-neutral-400">
            Esta sección es exclusiva para usuarios con rol de Administrador.
          </p>
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold rounded-xl transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a la App</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push("/")}
              className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition"
              title="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Panel de Control
                </span>
              </div>
              <h1 className="text-2xl font-black text-white mt-1">Gestión de Usuarios</h1>
            </div>
          </div>

          <div className="text-xs text-neutral-400">
            Admin: <span className="text-white font-medium">{currentUser?.email}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Formulario Crear Usuario */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center space-x-2.5 text-yellow-400">
              <UserPlus className="w-5 h-5" />
              <h2 className="text-base font-bold text-white">Registrar Nuevo Usuario</h2>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Crea una cuenta y asígnale una clave temporal. El usuario estará obligado a cambiarla en su primer ingreso.
            </p>

            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start space-x-2 ${
                  feedback.type === "success"
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                    : "bg-red-500/10 border border-red-500/30 text-red-300"
                }`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            {/* Credenciales generadas listas para copiar */}
            {createdCredentials && (
              <div className="p-3.5 bg-neutral-950 border border-yellow-400/30 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-yellow-400">
                  <span>Credenciales para entregar:</span>
                  <button
                    onClick={copyCredentials}
                    className="flex items-center space-x-1 text-[11px] text-neutral-300 hover:text-white"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copiado" : "Copiar"}</span>
                  </button>
                </div>
                <div className="text-xs font-mono bg-neutral-900 p-2 rounded-lg space-y-1">
                  <p className="text-neutral-300">Usuario: <span className="text-white font-bold">{createdCredentials.email}</span></p>
                  <p className="text-neutral-300">Clave temporal: <span className="text-yellow-400 font-bold">{createdCredentials.pass}</span></p>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej: Carlos Gómez"
                  className="w-full bg-neutral-800 border border-neutral-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@correo.com"
                  className="w-full bg-neutral-800 border border-neutral-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-neutral-400">Contraseña Temporal *</label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] text-yellow-400 hover:underline"
                  >
                    Generar aleatoria
                  </button>
                </div>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-neutral-800 border border-neutral-700 text-white font-mono rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Rol</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-yellow-400"
                >
                  <option value="user">Usuario Estándar</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-300 text-neutral-950 font-bold text-xs rounded-xl transition shadow disabled:opacity-50 mt-2"
              >
                {isSubmitting ? "Creando usuario..." : "Crear y Asignar Clave Temporal"}
              </button>
            </form>
          </div>

          {/* Listado de Usuarios */}
          <div className="lg:col-span-2 bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-yellow-400" />
                <h2 className="text-base font-bold text-white">Usuarios en el Sistema</h2>
              </div>
              <button
                onClick={loadUsers}
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
                title="Actualizar lista"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? "animate-spin" : ""}`} />
              </button>
            </div>

            {profiles.length === 0 ? (
              <p className="text-xs text-neutral-500 py-8 text-center">
                No hay usuarios registrados aún.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="bg-neutral-800/60 uppercase text-[10px] text-neutral-400 border-b border-neutral-800">
                    <tr>
                      <th className="py-2.5 px-3">Usuario</th>
                      <th className="py-2.5 px-3">Rol</th>
                      <th className="py-2.5 px-3">Estado Clave</th>
                      <th className="py-2.5 px-3">API Key Gemini</th>
                      <th className="py-2.5 px-3">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60 font-medium">
                    {profiles.map((p) => (
                      <tr key={p.id} className="hover:bg-neutral-800/30 transition">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-white">{p.full_name || "Sin nombre"}</div>
                          <div className="text-[11px] text-neutral-400">{p.email}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              p.role === "admin"
                                ? "bg-yellow-400/20 text-yellow-400 border border-yellow-400/30"
                                : "bg-neutral-800 text-neutral-300 border border-neutral-700"
                            }`}
                          >
                            {p.role}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {p.must_change_password ? (
                            <span className="text-amber-400 text-[11px] font-semibold">
                              Temporal (Pendiente)
                            </span>
                          ) : (
                            <span className="text-emerald-400 text-[11px] font-semibold">
                              Activa (Modificada)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {(p as any).gemini_api_key ? (
                            <span className="text-emerald-400 text-[11px]">Configurada</span>
                          ) : (
                            <span className="text-neutral-500 text-[11px]">Por configurar</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-neutral-500 text-[11px]">
                          {new Date(p.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
