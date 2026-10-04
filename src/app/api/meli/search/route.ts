import { NextRequest, NextResponse } from "next/server";
import { calculateCompetitionMetrics } from "@/lib/meliAnalytics";
import { MeliProduct } from "@/types/meli";

// Generador de datos inteligentes y realistas de Mercado Libre
// Sirve como fallback garantizado cuando la API oficial bloquea por PolicyAgent/OAuth
function generateSimulatedMeliProducts(
  query: string,
  siteId: string,
  customUsdPrice?: number,
  customCompetitors?: number
): MeliProduct[] {
  const currencies: Record<string, { code: string; factor: number; symbol: string; domain: string }> = {
    MCO: { code: "COP", factor: 4200, symbol: "$", domain: "mercadolibre.com.co" },
    MLM: { code: "MXN", factor: 18, symbol: "$", domain: "mercadolibre.com.mx" },
    MLA: { code: "ARS", factor: 1200, symbol: "$", domain: "mercadolibre.com.ar" },
    MLC: { code: "CLP", factor: 950, symbol: "$", domain: "mercadolibre.cl" },
    MPE: { code: "PEN", factor: 3.8, symbol: "S/", domain: "mercadolibre.com.pe" },
    MLB: { code: "BRL", factor: 5.5, symbol: "R$", domain: "mercadolivre.com.br" },
    MLU: { code: "UYU", factor: 40, symbol: "$", domain: "mercadolibre.com.uy" },
  };

  const curr = currencies[siteId] || currencies.MCO;
  // Usar el precio real estimado para este producto específico en USD (o default razonable)
  const baseUsdPrice = (customUsdPrice && customUsdPrice > 0) ? customUsdPrice : 35;

  const sellers = [
    "TECH_STORE_OFICIAL",
    "ELECTRO_GLOBAL_SAS",
    "IMPORTACIONES_DIRECTAS",
    "MEGA_TIENDA_DIGITAL",
    "DISTRIBUIDORA_NACIONAL",
    "LIDER_EXPRESS",
  ];

  const thumbnails = [
    "https://http2.mlstatic.com/D_NQ_NP_632904-MLA74681643922_022024-O.webp",
    "https://http2.mlstatic.com/D_NQ_NP_824707-MLA74704041793_022024-O.webp",
    "https://http2.mlstatic.com/D_NQ_NP_794271-MLA74805721151_022024-O.webp",
    "https://http2.mlstatic.com/D_NQ_NP_890833-MLA74676451638_022024-O.webp",
    "https://http2.mlstatic.com/D_NQ_NP_908422-MLA74674312002_022024-O.webp",
  ];

  const variants = [
    `${query} - Original Con Garantía Directa`,
    `${query} Pro Edición Premium Envío Inmediato`,
    `Kit ${query} Nuevo Modelo + Accesorios`,
    `${query} Alta Calidad Promoción Exclusiva`,
    `${query} Sellado En Caja Original`,
    `${query} Importado Con Factura Legal`,
    `${query} Última Generación Garantizado`,
    `${query} Distribuidor Autorizado Oferta`,
  ];

  const products: MeliProduct[] = variants.map((title, i) => {
    // Variación de precio entre el 70% y el 150% del precio base
    const priceMultiplier = 0.75 + (i * 0.12);
    const itemPrice = Math.round(baseUsdPrice * curr.factor * priceMultiplier);
    const isFull = i % 2 === 0;
    const freeShipping = i % 3 !== 2;
    const hasDiscount = i % 2 === 1;

    return {
      id: `${siteId}${100234500 + i}`,
      title,
      price: itemPrice,
      original_price: hasDiscount ? Math.round(itemPrice * 1.25) : null,
      currency_id: curr.code,
      condition: "new",
      thumbnail: thumbnails[i % thumbnails.length],
      permalink: `https://${curr.domain}/${encodeURIComponent(title.replace(/\s+/g, "-"))}#D[A:${encodeURIComponent(query)}]`,
      seller: {
        id: 500000 + (i % sellers.length),
        nickname: sellers[i % sellers.length],
      },
      shipping: {
        free_shipping: freeShipping,
        logistic_type: isFull ? "fulfillment" : "drop_off",
        store_pick_up: false,
      },
      sold_quantity: (i + 1) * 35,
      available_quantity: 50,
    };
  });

  return products;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    const siteId = searchParams.get("siteId") || "MCO"; // Por defecto Colombia
    const limit = searchParams.get("limit") || "30";
    const estimatedUsd = parseFloat(searchParams.get("estimatedUsd") || "0") || undefined;

    if (!query) {
      return NextResponse.json(
        { error: "El parámetro de búsqueda 'q' es requerido" },
        { status: 400 }
      );
    }

    let token = process.env.MELI_ACCESS_TOKEN;

    // Si tenemos client_id y client_secret, obtener o renovar access_token dinámicamente
    if (!token && process.env.MELI_CLIENT_ID && process.env.MELI_CLIENT_SECRET) {
      try {
        const tokenRes = await fetch("https://api.mercadolibre.com/oauth/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "client_credentials",
            client_id: process.env.MELI_CLIENT_ID,
            client_secret: process.env.MELI_CLIENT_SECRET,
          }),
        });
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          token = tokenData.access_token;
        }
      } catch (tokenErr) {
        console.warn("No se pudo obtener token dinámico de Mercado Libre:", tokenErr);
      }
    }

    const meliUrl = `https://api.mercadolibre.com/sites/${encodeURIComponent(
      siteId
    )}/search?q=${encodeURIComponent(query)}&limit=${encodeURIComponent(limit)}`;

    const headers: Record<string, string> = {
      "User-Agent": "SearchMeliMicroApp/1.0",
      Accept: "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    let products: MeliProduct[] = [];
    let isSimulated = false;

    try {
      const meliRes = await fetch(meliUrl, {
        headers,
        next: { revalidate: 60 },
      });

      if (meliRes.ok) {
        const data = await meliRes.json();
        const rawResults = data.results || [];
        products = rawResults.map((item: any) => ({
          id: item.id,
          title: item.title,
          price: item.price,
          original_price: item.original_price || null,
          currency_id: item.currency_id,
          condition: item.condition,
          thumbnail: item.thumbnail?.replace(/^http:/, "https:"),
          permalink: item.permalink,
          seller: {
            id: item.seller?.id,
            nickname: item.seller?.nickname,
            car_dealer: item.seller?.car_dealer,
            real_estate_agency: item.seller?.real_estate_agency,
          },
          shipping: {
            free_shipping: item.shipping?.free_shipping || false,
            logistic_type: item.shipping?.logistic_type,
            store_pick_up: item.shipping?.store_pick_up,
          },
          installments: item.installments,
          sold_quantity: item.sold_quantity,
          available_quantity: item.available_quantity,
        }));
      } else {
        console.warn(
          `Mercado Libre devolvió status ${meliRes.status} (PolicyAgent). Activando fallback de datos estructurados para desarrollo/preview.`
        );
        isSimulated = true;
        products = generateSimulatedMeliProducts(query, siteId, estimatedUsd);
      }
    } catch (fetchErr) {
      console.warn("Fallo en fetch a MeLi, usando datos simulados:", fetchErr);
      isSimulated = true;
      products = generateSimulatedMeliProducts(query, siteId, estimatedUsd);
    }

    const defaultCurrency = siteId === "MCO" ? "COP" : siteId === "MLM" ? "MXN" : "ARS";
    const metrics = calculateCompetitionMetrics(
      products,
      products[0]?.currency_id || defaultCurrency
    );

    return NextResponse.json({
      siteId,
      query,
      totalResults: products.length,
      metrics,
      products,
      isSimulated,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error en /api/meli/search:", err);
    return NextResponse.json(
      { error: "Error al consultar Mercado Libre: " + (err.message || "Desconocido") },
      { status: 500 }
    );
  }
}
