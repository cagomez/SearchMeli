import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { ImageAnalysisResult } from "@/types/meli";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType = "image/jpeg", userGeminiKey } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: "No se proporcionó la imagen base64" },
        { status: 400 }
      );
    }

    // Priorizar la API key personal del usuario (BYOK), luego la del entorno del servidor
    const apiKey = userGeminiKey?.trim() || process.env.GEMINI_API_KEY;

    // Si no hay API key disponible, ofrecemos el fallback inteligente para demostración
    if (!apiKey) {
      console.warn("Sin API Key de Gemini. Usando fallback de demostración.");
      const mockResult: ImageAnalysisResult = {
        productTitle: "Audífonos Bluetooth Inalámbricos",
        suggestedKeywords: ["audifonos bluetooth", "auriculares inalambricos", "tws cancelacion ruido"],
        brand: "Genérico",
        model: "Pro Series",
        category: "Electrónica, Audio y Video",
        features: ["Inalámbrico", "Estuche de carga", "Bluetooth 5.3"],
        confidenceScore: 0.9,
      };
      return NextResponse.json({
        analysis: mockResult,
        warning: "Configura tu propia API Key personal de Google Gemini para reconocimiento en vivo.",
      });
    }

    // Inicializar Google Gen AI SDK
    const ai = new GoogleGenAI({ apiKey });

    // Limpiar base64 si contiene prefijo data:image/...;base64,
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `Analiza detalladamente esta imagen de producto comercial para identificarlo y extraer su competencia real y publicaciones de competidores tal como se venden en Mercado Libre.
Identifica exactamente el tipo de producto, su precio real de mercado en USD, marcas/modelos competidores y publicaciones reales típicas de Mercado Libre para este producto.
Responde ÚNICAMENTE un objeto JSON válido con la siguiente estructura (sin markdown adicional):
{
  "productTitle": "Nombre exacto y comercial del producto como se vende en Mercado Libre (máximo 5-7 palabras clave prioritarias)",
  "suggestedKeywords": ["keyword alternativa 1", "keyword alternativa 2", "keyword 3"],
  "brand": "Nombre de marca identificada o null",
  "model": "Modelo identificado o null",
  "category": "Categoría general del producto en español",
  "features": ["característica visible 1", "característica visible 2"],
  "estimatedPriceUsd": 25.5,
  "estimatedCompetitors": 45,
  "competitorsList": [
    {
      "title": "Título específico y realista de publicación de Mercado Libre para este producto (ej. Marca + Modelo + Variante)",
      "estimatedPriceUsd": 24.0,
      "seller": "Nombre de tienda o vendedor de comercio electrónico",
      "condition": "new",
      "isFull": true,
      "freeShipping": true
    },
    {
      "title": "Otra publicación competidora directa de este producto o modelo alternativo",
      "estimatedPriceUsd": 28.5,
      "seller": "Distribuidor o tienda oficial",
      "condition": "new",
      "isFull": false,
      "freeShipping": true
    },
    {
      "title": "Publicación versión combo o kit de este producto",
      "estimatedPriceUsd": 32.0,
      "seller": "Comercializadora oficial",
      "condition": "new",
      "isFull": true,
      "freeShipping": true
    },
    {
      "title": "Publicación versión económica o genérica compatible",
      "estimatedPriceUsd": 19.9,
      "seller": "Importaciones directas",
      "condition": "new",
      "isFull": false,
      "freeShipping": false
    },
    {
      "title": "Publicación edición premium o con garantía extendida",
      "estimatedPriceUsd": 35.0,
      "seller": "Tienda verificada",
      "condition": "new",
      "isFull": true,
      "freeShipping": true
    },
    {
      "title": "Publicación paquete por 2 unidades o con accesorios",
      "estimatedPriceUsd": 39.5,
      "seller": "Tech Express",
      "condition": "new",
      "isFull": true,
      "freeShipping": true
    }
  ],
  "confidenceScore": 0.95
}`;

    // Usar exclusivamente el modelo oficial recomendado gemini-3.8-flash
    const targetModel = "gemini-3.8-flash";
    let responseText = "";
    let lastError: any = null;

    // Intentar hasta 3 veces con pausa progresiva ante picos temporales de demanda (503/429)
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) {
          // Pausa de 1.5s antes del reintento
          await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
        }

        const response = await ai.models.generateContent({
          model: targetModel,
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    data: cleanBase64,
                    mimeType: mimeType,
                  },
                },
              ],
            },
          ],
          config: {
            responseMimeType: "application/json",
          },
        });

        if (response && response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        lastError = err;
        const msg = err.message || "";
        console.warn(`Intento ${attempt + 1} con ${targetModel}:`, msg);
        if (msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("high demand") || msg.includes("429")) {
          // Continuar al siguiente intento
          continue;
        } else {
          // Si es otro error (por ejemplo clave inválida), terminar de inmediato
          throw err;
        }
      }
    }

    if (!responseText) {
      throw lastError || new Error("El servicio de IA se encuentra temporalmente ocupado. Por favor intenta de nuevo en unos momentos.");
    }

    let parsed: ImageAnalysisResult;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No se pudo procesar la respuesta del modelo");
      }
    }

    return NextResponse.json({ analysis: parsed });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error en /api/analyze-image:", err);
    return NextResponse.json(
      { error: "Error al analizar la imagen: " + (err.message || "Desconocido") },
      { status: 500 }
    );
  }
}
