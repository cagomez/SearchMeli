import React from "react";
import { CompetitionMetrics } from "@/types/meli";
import { formatCurrency } from "@/lib/meliAnalytics";
import { Users, DollarSign, Truck, Zap, TrendingUp, Award } from "lucide-react";

interface CompetitionOverviewProps {
  metrics: CompetitionMetrics;
}

export function CompetitionOverview({ metrics }: CompetitionOverviewProps) {
  return (
    <div className="space-y-6">
      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Competidores detectados */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
            <span>Competidores</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-white">
              {metrics.totalCompetitors}
            </span>
            <p className="text-[11px] text-neutral-400 mt-0.5">Publicaciones analizadas</p>
          </div>
        </div>

        {/* Precio Promedio */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
            <span>Precio Promedio</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-emerald-400 truncate block">
              {formatCurrency(metrics.avgPrice, metrics.currencyId)}
            </span>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Mediana: {formatCurrency(metrics.medianPrice, metrics.currencyId)}
            </p>
          </div>
        </div>

        {/* Rango de Precios */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
            <span>Rango de Precios</span>
            <TrendingUp className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="mt-2">
            <div className="text-sm font-bold text-white truncate">
              {formatCurrency(metrics.minPrice, metrics.currencyId)}
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
              hasta {formatCurrency(metrics.maxPrice, metrics.currencyId)}
            </p>
          </div>
        </div>

        {/* Cobertura Full / Envío Gratis */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
            <span>Logística & Envíos</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">
              {metrics.fullShippingPercentage}%
            </span>
            <span className="text-xs text-amber-400 font-medium">FULL</span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            {metrics.freeShippingPercentage}% con Envío Gratis
          </p>
        </div>
      </div>

      {/* Distribución de Gamas y Vendedores Líderes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Distribución de precios */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="w-4 h-4 text-yellow-400" />
            <h4 className="text-sm font-semibold text-white">Segmentación por Rango de Precios</h4>
          </div>
          <div className="space-y-3">
            {metrics.priceRangeDistribution.map((item, idx) => {
              const pct = metrics.totalCompetitors > 0 
                ? Math.round((item.count / metrics.totalCompetitors) * 100) 
                : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs text-neutral-300">
                    <span>{item.range}</span>
                    <span className="font-semibold text-white">
                      {item.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-yellow-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Vendedores con mayor presencia */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5">
          <div className="flex items-center space-x-2 mb-4">
            <Award className="w-4 h-4 text-yellow-400" />
            <h4 className="text-sm font-semibold text-white">Vendedores con Más Publicaciones</h4>
          </div>
          {metrics.topSellers.length > 0 ? (
            <ul className="space-y-2.5">
              {metrics.topSellers.map((seller, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-neutral-800/50 border border-neutral-800"
                >
                  <span className="font-medium text-neutral-200 truncate max-w-[200px]">
                    {seller.name}
                  </span>
                  <span className="px-2 py-0.5 bg-neutral-700/60 rounded text-neutral-300 font-semibold">
                    {seller.count} avisos
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-neutral-500">No hay información de vendedores disponible.</p>
          )}
        </div>
      </div>
    </div>
  );
}
