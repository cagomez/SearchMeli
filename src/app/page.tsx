"use client";

import React, { useState, useEffect } from "react";
import { ImageUploader } from "@/components/ImageUploader";
import { CompetitionOverview } from "@/components/CompetitionOverview";
import { ProductList } from "@/components/ProductList";
import { SupabaseAuthModal } from "@/components/SupabaseAuthModal";
import { GeminiKeyModal } from "@/components/GeminiKeyModal";
import { ForcePasswordChangeModal } from "@/components/ForcePasswordChangeModal";
import { MELI_SITES, SearchResponse, ImageAnalysisResult } from "@/types/meli";
import { supabase } from "@/lib/supabase";
import {
  Sparkles,
  Search,
  RefreshCw,
  Tag,
  AlertCircle,
  ShoppingBag,
  Layers,
  KeyRound,
  Lock,
} from "lucide-react";

export default function Home() {
  const [selectedSite, setSelectedSite] = useState("MCO"); // Por defecto Colombia
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSearchingMeli, setIsSearchingMeli] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ImageAnalysisResult | null>(null);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualQuery, setManualQuery] = useState("");

  // Control de usuario, claves Gemini y contraseñas temporales
  const [userProfile, setUserProfile] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [geminiApiKey, setGeminiApiKey] = useState<string>("");
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  // Cargar clave de Gemini desde localStorage y verificar sesión de usuario
  useEffect(() => {
    const savedLocalKey = localStorage.getItem("searchmeli_gemini_key");
    if (savedLocalKey) {
      setGeminiApiKey(savedLocalKey);
    }

    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.user) {
          setUserProfile(null);
        }
        setAuthLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session?.user) {
          setUserProfile(null);
        }
        setAuthLoading(false);
      });

      return () => subscription.unsubscribe();
    } else {
      setAuthLoading(false);
    }
  }, []);

  // Al cargar perfil desde SupabaseAuthModal
  const handleProfileLoaded = (profile: any) => {
    setUserProfile(profile);
    setAuthLoading(false);
    if (profile) {
      if (profile.must_change_password) {
        setMustChangePassword(true);
      }
      if (profile.gemini_api_key) {
        setGeminiApiKey(profile.gemini_api_key);
        localStorage.setItem("searchmeli_gemini_key", profile.gemini_api_key);
      }
    }
  };

  // Guardar clave de Gemini
  const handleSaveGeminiKey = async (key: string) => {
    setGeminiApiKey(key);
    localStorage.setItem("searchmeli_gemini_key", key);

    // Si el usuario está autenticado, guardarla en Supabase (Auth Metadata y Profiles)
    if (supabase && userProfile?.id) {
      try {
        await supabase.auth.updateUser({
          data: { gemini_api_key: key },
        });

        await supabase
          .from("profiles")
          .update({ gemini_api_key: key })
          .eq("id", userProfile.id);
      } catch (err) {
        console.error("Error guardando API key en perfil:", err);
      }
    }
  };

  // Manejar imagen seleccionada (vía archivo o cámara)
  const handleImageSelected = async (base64Image: string, previewUrl: string) => {
    setPreviewImage(previewUrl);
    setAnalysisResult(null);
    setSearchResponse(null);
    setErrorMessage(null);
    setIsAnalyzing(true);

    try {
      // 1. Analizar imagen con IA (enviando la key personalizada del usuario)
      const res = await fetch("/api/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64Image,
          mimeType: "image/jpeg",
          userGeminiKey: geminiApiKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al analizar la imagen");
      }

      const analysis: ImageAnalysisResult = data.analysis;
      setAnalysisResult(analysis);
      setManualQuery(analysis.productTitle);

      // 2. Realizar búsqueda inmediata en Mercado Libre con el término extraído
      await executeMeliSearch(analysis.productTitle, selectedSite, analysis);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Error procesando la imagen");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Ejecutar búsqueda en Mercado Libre
  const executeMeliSearch = async (
    query: string,
    siteId: string,
    analysis?: ImageAnalysisResult | null
  ) => {
    if (!query.trim()) return;
    setIsSearchingMeli(true);
    setErrorMessage(null);

    try {
      const res = await fetch(
        `/api/meli/search?q=${encodeURIComponent(query)}&siteId=${encodeURIComponent(
          siteId
        )}&limit=40`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al buscar en Mercado Libre");
      }

      const responseObj: SearchResponse = {
        analysis: analysis || {
          productTitle: query,
          suggestedKeywords: [],
          brand: null,
          model: null,
          category: null,
          features: [],
          confidenceScore: 1,
        },
        siteId,
        metrics: data.metrics,
        products: data.products,
        totalResults: data.totalResults,
        isSimulated: data.isSimulated,
        notice: data.notice,
      };

      setSearchResponse(responseObj);

      // 3. Registrar búsqueda en Supabase si está disponible
      if (supabase && data.metrics) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          await supabase.from("searches").insert({
            user_id: session?.user?.id ?? null,
            image_url: null,
            detected_product_title: query,
            detected_category: analysis?.category ?? null,
            detected_brand: analysis?.brand ?? null,
            site_id: siteId,
            results_count: data.products?.length || 0,
            min_price: data.metrics.minPrice,
            avg_price: data.metrics.avgPrice,
            max_price: data.metrics.maxPrice,
          });
        } catch (dbErr) {
          console.warn("No se pudo guardar la búsqueda en Supabase:", dbErr);
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Error buscando productos");
    } finally {
      setIsSearchingMeli(false);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    executeMeliSearch(manualQuery, selectedSite, analysisResult);
  };

  const handleKeywordClick = (keyword: string) => {
    setManualQuery(keyword);
    executeMeliSearch(keyword, selectedSite, analysisResult);
  };

  const resetSearch = () => {
    setPreviewImage(null);
    setAnalysisResult(null);
    setSearchResponse(null);
    setManualQuery("");
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-yellow-400 selection:text-neutral-950">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={resetSearch}>
            <div className="w-9 h-9 rounded-xl bg-yellow-400 text-neutral-950 flex items-center justify-center font-black shadow-md shadow-yellow-400/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-white flex items-center gap-1.5">
                SearchMeli <span className="text-[10px] bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Vision AI</span>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Selector de País de Mercado Libre: Solo visible para usuarios logueados */}
            {userProfile && (
              <div className="flex items-center bg-neutral-800/80 border border-neutral-700/80 rounded-xl px-2 py-1 text-xs">
                <span className="text-neutral-400 mr-1.5 hidden sm:inline">País:</span>
                <select
                  value={selectedSite}
                  onChange={(e) => {
                    setSelectedSite(e.target.value);
                    if (manualQuery) {
                      executeMeliSearch(manualQuery, e.target.value, analysisResult);
                    }
                  }}
                  className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
                >
                  {MELI_SITES.map((site) => (
                    <option key={site.id} value={site.id} className="bg-neutral-900 text-white">
                      {site.flag} {site.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Supabase Auth y Gestión de Gemini Key */}
            <SupabaseAuthModal
              onProfileLoaded={handleProfileLoaded}
              onOpenGeminiKeyModal={() => setIsGeminiModalOpen(true)}
              hasGeminiKey={Boolean(geminiApiKey)}
            />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col justify-center">
        {authLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-yellow-400" />
            <p className="text-xs text-neutral-400">Verificando sesión segura...</p>
          </div>
        ) : !userProfile ? (
          /* Pantalla de Bloqueo: Inicio de Sesión Obligatorio */
          <div className="max-w-md w-full mx-auto my-8 p-8 bg-neutral-900/90 border border-neutral-800 rounded-3xl text-center shadow-2xl space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-white">Acceso Privado</h2>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                Para utilizar la microApp y realizar búsquedas de productos en Mercado Libre debes iniciar sesión con tus credenciales asignadas.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800/80 text-left text-xs space-y-2">
              <div className="text-neutral-300 font-semibold flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                <span>¿Primera vez ingresando?</span>
              </div>
              <p className="text-neutral-400 text-[11px] leading-relaxed">
                Ingresa con tu correo y la contraseña temporal proporcionada por el Administrador. El sistema te pedirá definir tu nueva contraseña permanente.
              </p>
            </div>

            <div className="pt-2">
              <SupabaseAuthModal
                onProfileLoaded={handleProfileLoaded}
                onOpenGeminiKeyModal={() => setIsGeminiModalOpen(true)}
                hasGeminiKey={Boolean(geminiApiKey)}
              />
            </div>
          </div>
        ) : (
          /* Contenido Completo de la Aplicación una vez Autenticado */
          <>
            {/* Banner si el usuario no tiene configurada su clave de Gemini */}
            {!geminiApiKey && (
              <div className="mb-6 max-w-3xl mx-auto p-3.5 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-between gap-3 text-xs text-yellow-300">
                <div className="flex items-center space-x-2">
                  <KeyRound className="w-4 h-4 text-yellow-400 shrink-0" />
                  <span>Configura tu propia API Key de Google Gemini para reconocimiento en vivo por cámara.</span>
                </div>
                <button
                  onClick={() => setIsGeminiModalOpen(true)}
                  className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-neutral-950 font-bold rounded-xl text-[11px] shrink-0 transition"
                >
                  Configurar Clave
                </button>
              </div>
            )}

        {/* Hero si no hay búsqueda previa */}
        {!searchResponse && !isAnalyzing && (
          <div className="text-center max-w-2xl mx-auto mb-8 pt-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-yellow-400/10 border border-yellow-400/20 rounded-full text-yellow-400 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Búsqueda Visual Inteligente de Productos en MeLi</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Encuentra cualquier producto y analiza tu competencia en Mercado Libre
            </h1>
            <p className="mt-3 text-sm sm:text-base text-neutral-400">
              Toma una foto con tu celular o sube una imagen. Nuestra IA detectará el producto exacto y extraerá sus precios, reputación y métricas de mercado.
            </p>
          </div>
        )}

        {/* Zona de Subida / Cámara */}
        {!searchResponse && (
          <div className="max-w-2xl mx-auto mb-8">
            <ImageUploader
              onImageSelected={handleImageSelected}
              isLoading={isAnalyzing}
            />
          </div>
        )}

        {/* Estado de Carga / Detección IA */}
        {isAnalyzing && (
          <div className="max-w-md mx-auto my-12 p-8 bg-neutral-900/80 border border-neutral-800 rounded-3xl text-center space-y-4 shadow-xl">
            {previewImage && (
              <div className="w-28 h-28 mx-auto rounded-2xl overflow-hidden border-2 border-yellow-400 shadow-md">
                <img src={previewImage} alt="Analizando" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex items-center justify-center space-x-2 text-yellow-400">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="font-semibold text-sm">Identificando producto con IA...</span>
            </div>
            <p className="text-xs text-neutral-400">
              Extrayendo marca, modelo, características y consultando el mercado de Mercado Libre.
            </p>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="max-w-2xl mx-auto mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
            <div>
              <p className="font-semibold">Ocurrió un inconveniente</p>
              <p className="text-xs text-red-400 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Resultados de Búsqueda y Análisis de Competencia */}
        {searchResponse && (
          <div className="space-y-8 animate-fadeIn">
            {/* Header de Resultados */}
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-6 shadow-xl">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* Miniatura de la imagen subida */}
                {previewImage && (
                  <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border border-neutral-700 bg-black shrink-0 group">
                    <img
                      src={previewImage}
                      alt="Imagen consultada"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={resetSearch}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs text-yellow-400 font-semibold transition"
                    >
                      Nueva foto
                    </button>
                  </div>
                )}

                <div className="flex-1 w-full space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs text-yellow-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> Producto Detectado
                      </span>
                      <h2 className="text-xl sm:text-2xl font-bold text-white mt-0.5">
                        {analysisResult?.productTitle || manualQuery}
                      </h2>
                    </div>

                    <button
                      onClick={resetSearch}
                      className="text-xs text-neutral-400 hover:text-white underline transition"
                    >
                      Buscar otro producto
                    </button>
                  </div>

                  {/* Etiquetas / Características detectadas */}
                  {analysisResult && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {analysisResult.brand && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-300">
                          Marca: <b className="text-white">{analysisResult.brand}</b>
                        </span>
                      )}
                      {analysisResult.category && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-300">
                          {analysisResult.category}
                        </span>
                      )}
                      {analysisResult.features?.slice(0, 3).map((f, i) => (
                        <span key={i} className="text-[11px] px-2.5 py-0.5 rounded-full bg-neutral-800/60 text-neutral-400">
                          {f}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Formulario para afinar o cambiar término de búsqueda */}
                  <form onSubmit={handleManualSearch} className="flex gap-2 pt-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input
                        type="text"
                        value={manualQuery}
                        onChange={(e) => setManualQuery(e.target.value)}
                        placeholder="Ajustar término de búsqueda en MeLi..."
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-yellow-400"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSearchingMeli}
                      className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-neutral-950 font-semibold text-xs sm:text-sm rounded-xl transition flex items-center space-x-1.5 disabled:opacity-50"
                    >
                      {isSearchingMeli ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <span>Buscar</span>
                      )}
                    </button>
                  </form>

                  {/* Keywords sugeridas para búsqueda rápida */}
                  {analysisResult?.suggestedKeywords && analysisResult.suggestedKeywords.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-neutral-500 flex items-center gap-1">
                        <Tag className="w-3 h-3" /> Sugerencias:
                      </span>
                      {analysisResult.suggestedKeywords.map((kw, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleKeywordClick(kw)}
                          className="text-[11px] px-2 py-0.5 rounded-lg bg-neutral-800 hover:bg-yellow-400/20 hover:text-yellow-400 text-neutral-400 border border-neutral-700/60 transition"
                        >
                          {kw}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {searchResponse.notice && (
                <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
                  <span>{searchResponse.notice}</span>
                </div>
              )}
            </div>

            {/* Resumen de Competencia en MeLi */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-lg font-bold text-white">Análisis de la Competencia</h3>
                </div>
                <span className="text-xs text-neutral-400">
                  {searchResponse.totalResults} publicaciones encontradas en Mercado Libre
                </span>
              </div>

              <CompetitionOverview metrics={searchResponse.metrics} />
            </div>

            {/* Listado de Productos Competidores */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Publicaciones de Competidores</h3>
                <span className="text-xs text-neutral-400">
                  Mostrando {searchResponse.products.length} ofertas activas
                </span>
              </div>

              <ProductList
                products={searchResponse.products}
                currencyId={searchResponse.metrics.currencyId}
              />
            </div>
          </div>
        )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800 bg-neutral-900/30 py-6 text-center text-xs text-neutral-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>SearchMeli © 2026 — MicroApp de Búsqueda Visual y Competencia de Mercado Libre</p>
          <div className="flex items-center space-x-4">
            <span>Next.js 16</span>
            <span>•</span>
            <span>Supabase Auth & DB</span>
            <span>•</span>
            <span>Vercel Ready</span>
          </div>
        </div>
      </footer>

      {/* Modal para configurar API Key de Gemini */}
      <GeminiKeyModal
        isOpen={isGeminiModalOpen}
        onClose={() => setIsGeminiModalOpen(false)}
        apiKey={geminiApiKey}
        onSaveKey={handleSaveGeminiKey}
      />

      {/* Modal obligatorio para primer inicio de sesión */}
      <ForcePasswordChangeModal
        isOpen={mustChangePassword}
        onPasswordChanged={(key, site) => {
          setMustChangePassword(false);
          if (key) {
            handleSaveGeminiKey(key);
          }
          if (site) {
            setSelectedSite(site);
          }
        }}
      />
    </div>
  );
}
