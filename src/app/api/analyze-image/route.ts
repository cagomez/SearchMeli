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

    // Lista de modelos disponibles con cuotas independientes en Google AI Studio
    const candidateModels = ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];
    let responseText = "";
    let lastError: any = null;

    // Intentar con la cascada de modelos en caso de cuota agotada (429) o indisponibilidad (503)
    for (const modelName of candidateModels) {
      if (responseText) break;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          if (attempt > 0) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }

          const response = await ai.models.generateContent({
            model: modelName,
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
          console.warn(`Error con modelo ${modelName} (intento ${attempt + 1}):`, msg);
          // Si es 429 (cuota agotada) o 503 (ocupado) o 404 (modelo no disponible), pasar al siguiente modelo
          if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("503") || msg.includes("404")) {
            break;
          } else {
            throw err;
          }
        }
      }
    }

    if (!responseText) {
      throw lastError || new Error("Se alcanzó el límite diario de consultas de tu API Key de Gemini. Puedes ingresar otra clave gratuita en tu perfil o esperar a que Google renueve la cuota.");
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
