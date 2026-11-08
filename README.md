# Clarify — Escáner y Sintetizador de Documentos con IA

Aplicación móvil (React Native + Expo) que **captura documentos con la cámara** —notas manuscritas, páginas de libros, contratos, facturas— y usa **Google Gemini** para:

- 🔎 **OCR**: transcribir todo el texto, incluida la letra manuscrita.
- 📝 **Resumen ejecutivo** con puntos clave y datos destacados.
- 📊 **Extracción de datos clave y tablas** (fechas, importes, partes, cláusulas, partidas…).
- 💬 **Preguntas y respuestas** basadas únicamente en el contenido del documento.

Además:

- 📷 **Escáner con tres modos**: *Auto* (foto tras foto), *Manual* (recortar cada página al capturarla) y *Libro* (fotografía el libro abierto y se separa en dos páginas).
- ✂️ **Recortar y girar** cada página antes de analizarla, y reordenar o quitar páginas.
- 🧠 **Análisis especializado** según el documento: *Contrato* (riesgos, plazos, penalizaciones), *Estudio* (conceptos, preguntas de examen y tarjetas de repaso), *Factura* (totales, impuestos, alertas de cálculo) o *General*.
- 🌐 **Traducir** el documento completo a español, inglés, francés, portugués, alemán o italiano.
- ✏️ **Corregir el texto del OCR** y regenerar el resumen, los datos y las tablas.
- 📤 **Exportar** a **PDF** y a **Excel (.xlsx)** con el diseño de la app, o compartir como texto.
- 📋 **Copiar** referencias, números de transacción y respuestas con un toque.
- 🔍 **Buscar** en el historial (título, contenido, datos) y filtrar por tipo de documento.
- 🌙 **Modo oscuro** (automático o manual) y **app en español o inglés**, desde Ajustes.
- Importar fotos de la galería o PDF, hasta 10 páginas por documento, con historial guardado en el dispositivo.

## Diseño

Interfaz propia con fondo gris cálido, botones tipo píldora, tarjetas con **degradado naranja** de marca, tipografía **Plus Jakarta Sans** e iconos de línea. Navegación con barra flotante (Inicio · Documentos · Escanear · Ajustes). La pantalla *Preguntar* y el visor de la cámara usan un tema oscuro propio. Icono y pantalla de carga en `assets/` (se regeneran con `assets/make-icons.ps1`).

## Arquitectura

```
┌──────────────────────┐   multipart (imágenes/PDF)   ┌─────────────────────┐   API key   ┌──────────────┐
│  App Expo (móvil)    │ ───────────────────────────▶ │  server/ (Node +     │ ──────────▶ │ Gemini API   │
│  cámara · historial  │ ◀─────────────────────────── │  Express) proxy      │ ◀────────── │ (multimodal) │
└──────────────────────┘        JSON resultado        └─────────────────────┘             └──────────────┘
```

La **API key nunca está en la app**: vive solo en `server/.env`. El backend hace el OCR, el resumen y la extracción en **una sola llamada** multimodal a Gemini, con salida JSON validada por esquema (`responseSchema`). El chat envía la transcripción como contexto, así que no hay que volver a subir las imágenes.

| Endpoint              | Descripción                                                                |
| --------------------- | -------------------------------------------------------------------------- |
| `GET /api/health`     | Estado del servidor y modelo configurado                                   |
| `POST /api/analyze`   | `multipart/form-data` con campo `pages` (1–10 archivos)                    |
| `POST /api/reanalyze` | `{ transcription }` → análisis regenerado desde el texto corregido         |
| `POST /api/translate` | `{ analysis, targetLanguage }` (`es`, `en`, `fr`, `pt`, `de`, `it`)        |
| `POST /api/insights`  | `{ document, mode, language }` (`contract`, `study`, `invoice`, `general`) |
| `POST /api/chat`      | `{ document, history, question }` → `{ answer }`                           |

Los errores del servidor se devuelven en el idioma de la app (cabecera `Accept-Language`) y cada petición queda registrada en la terminal del servidor.

## Estructura

```
index.ts                  Punto de entrada de Expo
assets/                   Icono, icono adaptable, pantalla de carga y favicon
src/
  App.tsx                 Fuentes, pantalla de carga y navegación
  api/client.ts           Llamadas al backend (detecta la IP del PC en desarrollo)
  i18n/strings.ts         Textos de la app en español e inglés
  settings/               Idioma y tema (claro/oscuro) guardados en el dispositivo
  storage/history.ts      Historial local (AsyncStorage)
  palette.ts · theme.ts   Colores, degradados, tipografía y espaciados
  screens/                Home (+ Documentos) · Scan · Review · Processing · Result · Settings
  components/             Button, ui (píldoras, botones redondos, tarjetas con degradado),
                          BottomNav, BottomSheet, ChatView, PageEditor, CopyButton…
  components/tabs/        Resumen · Datos · Análisis · Texto
  utils/exporters.ts      Exportación a PDF, Excel y texto
  utils/excel.ts          Libro .xlsx con estilos de la app
  utils/splitBook.ts      Modo libro: divide la foto en dos páginas
server/
  src/index.js            Servidor Express, subida de archivos, validaciones y registro
  src/gemini.js           Prompts, esquemas JSON, reintentos y llamadas a Gemini
  src/messages.js         Mensajes de error en español e inglés
  src/listModels.js       Lista los modelos disponibles para tu API key
```

