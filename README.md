# 🔍 SearchMeli — MicroApp de Búsqueda Visual y Competencia en Mercado Libre

Una microApp moderna diseñada para buscar productos en **Mercado Libre** únicamente a partir de fotos tomadas con la **cámara del dispositivo** o **imágenes adjuntas**, extrayendo datos analíticos clave y métricas de competencia. Desarrollada para desplegarse con un clic en **Vercel** y almacenar usuarios e historial en **Supabase**.

---

## 🚀 Características Principales

1. **Captura Visual & Cámara en Vivo**:
   - Soporte para cámara web y dispositivos móviles (con cambio de cámara frontal/trasera).
   - Zona de arrastre y subida de archivos (Drag & Drop para JPG, PNG, WEBP).
2. **Reconocimiento con IA Multimodal**:
   - Detección del producto comercial, marca, categoría, atributos y palabras clave óptimas para Mercado Libre utilizando la API de Google Gemini Flash.
   - Fallback inteligente incluido para modo de desarrollo y pruebas.
3. **Búsqueda en Mercado Libre & Extracción de Datos**:
   - Conexión directa a la API pública de Mercado Libre (`/api/meli/search`).
   - Selector de país para MeLi: 🇨🇴 Colombia (`MCO`), 🇲🇽 México (`MLM`), 🇦🇷 Argentina (`MLA`), 🇨🇱 Chile (`MLC`), 🇵🇪 Perú (`MPE`), 🇧🇷 Brasil (`MLB`), 🇺🇾 Uruguay (`MLU`).
4. **Análisis de Competencia en Tiempo Real**:
   - Rango de precios: Mínimo, Máximo, Promedio y Mediana del mercado.
   - Cobertura de envíos: Porcentaje de publicaciones con **Envío FULL** y **Envío Gratis**.
   - Top 5 de vendedores con mayor cuota de publicaciones.
   - Segmentación por rangos de precio (gama económica, media y alta).
5. **Base de Datos y Autenticación con Supabase**:
   - Sistema de login/registro de usuarios mediante Supabase Auth.
   - Registro automático del historial de búsquedas y métricas en PostgreSQL.
   - Posibilidad de guardar publicaciones de competidores favoritas o monitoreadas.
6. **Optimizado para Vercel**:
   - Arquitectura Next.js 16 con App Router y Turbopack, compilación estricta en TypeScript y Tailwind CSS.

---

## 🛠️ Configuración Rápida

### 1. Variables de Entorno

Crea tu archivo `.env.local` a partir de `.env.example`:

```env
# Supabase (Obtén estos valores en tu panel de Supabase -> Project Settings -> API)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key

# Google Gemini API Key (Obtén tu clave gratuita en https://aistudio.google.com/app/apikey)
GEMINI_API_KEY=tu-gemini-api-key
```

### 2. Configurar la Base de Datos en Supabase

Ve a tu proyecto en **Supabase** -> **SQL Editor**, copia y ejecuta el contenido del archivo:
`supabase/schema.sql`

Este script creará:
- Tabla `profiles` vinculada a `auth.users`.
- Tabla `searches` para almacenar el historial de productos analizados.
- Tabla `saved_products` para guardar publicaciones favoritas.
- Políticas de Row Level Security (RLS) para proteger los datos de cada usuario.

### 3. Ejecutar Localmente

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## ☁️ Despliegue en Vercel

1. Sube este repositorio a **GitHub**.
2. Entra en [vercel.com](https://vercel.com) y selecciona **Add New Project**.
3. Importa el repositorio de **SearchMeli**.
4. En la sección **Environment Variables**, añade:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
5. Haz clic en **Deploy**. ¡Tu microApp estará en vivo con HTTPS y soporte completo de cámara web y móvil!
