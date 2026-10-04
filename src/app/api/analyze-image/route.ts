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

    const prompt = `Analiza detalladamente esta imagen de producto comercial para buscarlo y extraer su competencia real en Mercado Libre.
Identifica exactamente el tipo de producto, su rango de precio real de venta al público en USD y competidores habituales.
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
  "confidenceScore": 0.95
}`;

    // Modelos candidatos en orden de preferencia si uno presenta saturación 503
    const candidateModels = ["gemini-3.8-flash", "gemini-3.8-flash-lite", "gemini-2.0-flash"];

    let responseText = "";
    let lastError: any = null;

    for (const modelName of candidateModels) {
      // Intentar hasta 2 veces por modelo en caso de pico 503 temporal
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          if (attempt > 0) {
            await new Promise((resolve) => setTimeout(resolve, 800));
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
          // Si es error 503 (alta demanda / unavailable) o 429, intentar con reintento o siguiente modelo
          const msg = err.message || "";
          if (msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("high demand") || msg.includes("429")) {
            console.warn(`Modelo ${modelName} con alta demanda (503). Probando alternativa...`);
            continue;
          } else {
            // Si es otro tipo de error, pasar al siguiente modelo
            break;
          }
        }
      }

      if (responseText) break;
    }

    if (!responseText) {
      throw lastError || new Error("Los servidores de IA se encuentran temporalmente saturados. Por favor intenta de nuevo en unos segundos.");
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
