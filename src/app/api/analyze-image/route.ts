import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { ImageAnalysisResult } from "@/types/meli";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType = "image/jpeg" } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: "No se proporcionó la imagen base64" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Si no hay API key configurada, ofrecemos un fallback inteligente para pruebas de desarrollo
    if (!apiKey) {
      console.warn("GEMINI_API_KEY no configurada. Usando fallback de demostración.");
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
        warning: "Para detección con IA real en producción, configura GEMINI_API_KEY en las variables de entorno.",
      });
    }

    // Inicializar Google Gen AI SDK
    const ai = new GoogleGenAI({ apiKey });

    // Limpiar base64 si contiene prefijo data:image/...;base64,
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `Analiza detalladamente esta imagen de producto comercial para buscarlo y extraer su competencia en Mercado Libre.
Responde ÚNICAMENTE un objeto JSON válido con la siguiente estructura (sin markdown adicional):
{
  "productTitle": "Nombre específico, claro y conciso del producto como se buscaría en Mercado Libre (máximo 5-7 palabras clave prioritarias)",
  "suggestedKeywords": ["keyword alternativa 1", "keyword alternativa 2", "keyword 3"],
  "brand": "Nombre de marca identificada o null",
  "model": "Modelo identificado o null",
  "category": "Categoría general del producto en español",
  "features": ["característica visible 1", "característica visible 2"],
  "confidenceScore": 0.95
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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

    const responseText = response.text || "{}";
    let parsed: ImageAnalysisResult;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      // Intento de extracción si contiene bloques ```json
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No se pudo parsear la respuesta JSON del modelo");
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
