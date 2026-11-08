# Clarify — Escáner y Sintetizador de Documentos con IA

Aplicación móvil (React Native + Expo) que **captura documentos con la cámara** —notas manuscritas, páginas de libros, contratos, facturas— y usa **Google Gemini** para:

- **OCR**: transcribir todo el texto, incluida la letra manuscrita.
- **Resumen ejecutivo** con puntos clave y datos destacados.
- **Extracción de datos clave y tablas** (fechas, importes, partes, cláusulas, partidas…).
- **Preguntas y respuestas** basadas únicamente en el contenido del documento.

Además:

- **Escáner con tres modos**: *Auto* (foto tras foto), *Manual* (recortar cada página al capturarla) y *Libro* (fotografía el libro abierto y se separa en dos páginas).
- **Recortar y girar** cada página antes de analizarla, y reordenar o quitar páginas.
- **Análisis especializado** según el documento: *Contrato* (riesgos, plazos, penalizaciones), *Estudio* (conceptos, preguntas de examen y tarjetas de repaso), *Factura* (totales, impuestos, alertas de cálculo) o *General*.
- **Traducir** el documento completo a español, inglés, francés, portugués, alemán o italiano.
- **Corregir el texto del OCR** y regenerar el resumen, los datos y las tablas.
- **Exportar** a **PDF** y a **Excel (.xlsx)** con el diseño de la app, o compartir como texto.
- **Copiar** referencias, números de transacción y respuestas con un toque.
- **Buscar** en el historial (título, contenido, datos) y filtrar por tipo de documento.
- **Modo oscuro** (automático o manual) y **app en español o inglés**, desde Ajustes.
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

## Puesta en marcha

Requisitos: **Node.js 22+** y la app **Expo Go** en el móvil (o un emulador).

```bash
# 1. Dependencias
npm install
npm run server:install

# 2. API key de Gemini (gratis en https://aistudio.google.com/apikey)
cp server/.env.example server/.env      # en Windows: copy server\.env.example server\.env
#    edita server/.env y pon GEMINI_API_KEY=...

# 3. Arranca el backend (terminal 1)
npm run server

# 4. Arranca la app (terminal 2) y abre el proyecto con Expo Go
npm start
```

El móvil y el PC deben estar en la **misma red Wi-Fi**. En desarrollo la app usa automáticamente la IP del PC que sirve Expo, en el puerto `3001` (se ve en *Ajustes → Servidor*, con un botón para probar la conexión). Si usas `expo start --tunnel` o el servidor está en otra máquina, define la URL en un `.env` en la raíz:

```
EXPO_PUBLIC_API_URL=http://192.168.1.42:3001
```

> **Windows:** la red Wi-Fi debe estar marcada como **Privada** y el firewall debe permitir los puertos `8081` (Expo) y `3001` (servidor). Si la app no conecta, revisa esto primero.

### Modelo de Gemini

Por defecto se usa **`gemini-3.5-flash`** (rápido y fiable) y, si está saturado, el servidor reintenta y pasa automáticamente al modelo de respaldo **`gemini-3.6-flash`**. Cada intento tiene un tiempo máximo, así que la app siempre recibe respuesta. Se configuran en `server/.env`:

```
GEMINI_MODEL=gemini-3.5-flash
GEMINI_FALLBACK_MODEL=gemini-3.6-flash
```

Para ver qué modelos puede usar tu API key: `npm --prefix server run models`.

## Scripts

| Comando                         | Qué hace                                  |
| ------------------------------- | ----------------------------------------- |
| `npm start`                     | Inicia Expo                               |
| `npm run android`               | Abre en emulador/dispositivo Android      |
| `npm run server`                | Inicia el backend en el puerto 3001       |
| `npm --prefix server run models`| Lista los modelos de Gemini disponibles   |
| `npm run typecheck`             | Comprueba los tipos de TypeScript         |

## Despliegue

### Servidor en Render

El backend está publicado en **https://clarify-server.onrender.com** (Render, plan gratuito), así que la app instalada funciona en cualquier red sin necesidad de un PC encendido.

| Ajuste en Render   | Valor                                                              |
| ------------------ | ------------------------------------------------------------------ |
| Tipo               | Web Service · Node                                                 |
| Root Directory     | `server`                                                           |
| Build / Start      | `npm install` / `npm start`                                        |
| Variables          | `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`          |
| Health Check Path  | `/api/health`                                                      |

La API key se guarda solo en las variables de entorno de Render, nunca en el repositorio. Cada push a `main` que cambie `server/` se despliega automáticamente.

> En el plan gratuito el servidor se suspende tras 15 minutos sin uso: la primera petición después de eso tarda unos 30–50 s más. En la app puedes despertarlo con *Ajustes → Servidor → Probar conexión*.

### Instalable para Android (APK)

En Expo Go la app encuentra el servidor sola gracias a Metro. En un APK no hay Metro, así que la URL del servidor se incluye al compilar: está definida en [`eas.json`](eas.json) (`EXPO_PUBLIC_API_URL`, perfil `preview`).

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview      # genera un .apk en los servidores de Expo
```

Al terminar, EAS da un enlace y un código QR para descargar el `.apk` e instalarlo directamente en el móvil (Android pedirá permitir la instalación desde esa fuente).

El icono y la pantalla de carga de Clarify solo se ven en el APK (Expo Go muestra los suyos). Las adaptaciones hechas para Expo Go (subida con XMLHttpRequest, PDF y Excel escritos en la caché de la app) funcionan igual en el APK. La app solo pide permiso de cámara (el de micrófono está bloqueado).

> **iOS:** instalar la app fuera de Expo Go en un iPhone requiere una cuenta de Apple Developer (TestFlight o distribución *ad hoc*). Sin ella, en iPhone se usa con Expo Go.

## Límites y notas

- Máx. 10 páginas por documento, 15 MB por archivo y 18 MB en total.
- Formatos: JPG, PNG, WEBP, HEIC y PDF.
- El historial se guarda solo en el dispositivo (máx. 50 documentos).
- El escáner no detecta bordes automáticamente y el recorte es rectangular: la detección y la corrección de perspectiva necesitarían un módulo nativo que no funciona en Expo Go.
- En el modo libro la foto se divide exactamente por la mitad: centra el lomo en la línea del marco.
- En Excel los importes se guardan como texto, tal como aparecen en el documento.
- El Excel se genera con `xlsx-js-style` (basada en SheetJS 0.18). Esa versión tiene vulnerabilidades conocidas al **leer** archivos externos; Clarify solo **genera** archivos, así que no le afectan.
- El servidor no tiene autenticación: cualquiera que conozca su URL puede usarlo y consumir la cuota de Gemini. Para un proyecto académico es aceptable; para un uso real habría que añadir autenticación o límites por usuario.
