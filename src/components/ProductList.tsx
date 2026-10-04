"use client";

import React, { useState } from "react";
import { MeliProduct } from "@/types/meli";
import { formatCurrency } from "@/lib/meliAnalytics";
import { ExternalLink, Truck, Zap, Bookmark, Check, ArrowUpDown } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ProductListProps {
  products: MeliProduct[];
  currencyId: string;
}

export function ProductList({ products, currencyId }: ProductListProps) {
  const [filterShipping, setFilterShipping] = useState<"all" | "free" | "full">("all");
  const [sortOrder, setSortOrder] = useState<"relevance" | "price_asc" | "price_desc">("relevance");
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // Filtrado
  const filtered = products.filter((p) => {
    if (filterShipping === "free") return p.shipping?.free_shipping;
    if (filterShipping === "full") return p.shipping?.logistic_type === "fulfillment";
    return true;
  });

  // Ordenación
  const sorted = [...filtered].sort((a, b) => {
    if (sortOrder === "price_asc") return a.price - b.price;
    if (sortOrder === "price_desc") return b.price - a.price;
    return 0; // relevancia original MeLi
  });

  const handleSaveProduct = async (product: MeliProduct) => {
    if (savedIds[product.id]) return;
    setSavingId(product.id);

    try {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase.from("saved_products").insert({
            user_id: session.user.id,
            meli_id: product.id,
            title: product.title,
            price: product.price,
            currency_id: product.currency_id,
            permalink: product.permalink,
            thumbnail: product.thumbnail,
            seller_name: product.seller?.nickname || "Vendedor",
            has_free_shipping: product.shipping?.free_shipping || false,
            is_full: product.shipping?.logistic_type === "fulfillment",
          });
        }
      }
      setSavedIds((prev) => ({ ...prev, [product.id]: true }));
    } catch (err) {
      console.error("Error guardando producto:", err);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controles de Filtros y Orden */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-neutral-900/60 border border-neutral-800 rounded-2xl">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-neutral-400 font-medium">Filtrar por:</span>
          <div className="inline-flex rounded-xl bg-neutral-800 p-1 text-xs">
            <button
              onClick={() => setFilterShipping("all")}
              className={`px-3 py-1.5 rounded-lg transition font-medium ${
                filterShipping === "all"
                  ? "bg-yellow-400 text-neutral-950 font-semibold shadow"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Todos ({products.length})
            </button>
            <button
              onClick={() => setFilterShipping("free")}
              className={`px-3 py-1.5 rounded-lg transition font-medium flex items-center space-x-1 ${
                filterShipping === "free"
                  ? "bg-yellow-400 text-neutral-950 font-semibold shadow"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Truck className="w-3 h-3" />
              <span>Envío Gratis</span>
            </button>
            <button
              onClick={() => setFilterShipping("full")}
              className={`px-3 py-1.5 rounded-lg transition font-medium flex items-center space-x-1 ${
                filterShipping === "full"
                  ? "bg-yellow-400 text-neutral-950 font-semibold shadow"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Zap className="w-3 h-3 text-emerald-500 fill-emerald-500" />
              <span>FULL</span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <ArrowUpDown className="w-4 h-4 text-neutral-400" />
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-yellow-400"
          >
            <option value="relevance">Más Relevantes</option>
            <option value="price_asc">Menor Precio</option>
            <option value="price_desc">Mayor Precio</option>
          </select>
        </div>
      </div>

      {/* Grid de Productos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((product) => {
          const isSaved = Boolean(savedIds[product.id]);
          const isFull = product.shipping?.logistic_type === "fulfillment";

          return (
            <div
              key={product.id}
              className="group bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col hover:border-yellow-400/50 transition-all duration-200 shadow-md hover:shadow-yellow-400/5"
            >
              {/* Imagen del producto */}
              <div className="relative aspect-square w-full bg-neutral-950 flex items-center justify-center p-4 overflow-hidden">
                <img
                  src={product.thumbnail || "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&auto=format&fit=crop&q=60"}
                  alt={product.title}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={(e) => {
                    // Si falla cargar la imagen de Mercado Libre por hotlinking o caducidad, usar placeholder limpio
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&auto=format&fit=crop&q=60";
                  }}
                />

                {/* Badges de Envío */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                  {isFull && (
                    <span className="bg-emerald-500 text-black text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center space-x-1 shadow">
                      <Zap className="w-2.5 h-2.5 fill-black" />
                      <span>FULL</span>
                    </span>
                  )}
                  {product.shipping?.free_shipping && !isFull && (
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      Envío gratis
                    </span>
                  )}
                </div>

                {/* Botón Guardar / Favorito */}
                <button
                  onClick={() => handleSaveProduct(product)}
                  disabled={isSaved || savingId === product.id}
                  className={`absolute top-3 right-3 p-2 rounded-xl backdrop-blur-md transition ${
                    isSaved
                      ? "bg-yellow-400 text-neutral-950"
                      : "bg-black/50 text-neutral-300 hover:text-yellow-400 hover:bg-black/80"
                  }`}
                  title={isSaved ? "Guardado en Supabase" : "Guardar en favoritos"}
                >
                  {isSaved ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Bookmark className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Información */}
              <div className="p-4 flex flex-col flex-1 justify-between space-y-3">
                <div>
                  <p className="text-[11px] text-neutral-400 mb-1 truncate">
                    Vendedor: {product.seller?.nickname || "Desconocido"}
                  </p>
                  <h4 className="text-sm font-medium text-white line-clamp-2 leading-snug group-hover:text-yellow-400 transition-colors">
                    {product.title}
                  </h4>
                </div>

                <div className="pt-2 border-t border-neutral-800/80 flex items-end justify-between">
                  <div>
                    {product.original_price && product.original_price > product.price && (
                      <span className="text-[11px] text-neutral-400 line-through block">
                        {formatCurrency(product.original_price, product.currency_id)}
                      </span>
                    )}
                    <span className="text-lg font-bold text-white">
                      {formatCurrency(product.price, product.currency_id)}
                    </span>
                  </div>

                  <a
                    href={product.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-neutral-950 text-xs font-semibold rounded-xl transition"
                  >
                    <span>Ver en MeLi</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
