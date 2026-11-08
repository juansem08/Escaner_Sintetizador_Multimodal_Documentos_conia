import { GoogleGenAI, Type } from '@google/genai';
import { HttpError } from './httpError.js';

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
// Si el modelo principal está saturado (503) tras los reintentos, se prueba con este
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL ?? 'gemini-3.6-flash';
const RETRY_DELAYS_MS = [1500, 4000];
// Cada intento puede tardar como mucho esto; el total se mantiene por debajo del timeout de la app (150 s)
const ATTEMPT_TIMEOUT_MS = 60_000;
const TOTAL_BUDGET_MS = 130_000;
const MAX_TRANSCRIPTION_CHARS = 120_000;
const MAX_HISTORY_MESSAGES = 12;

export const modelName = MODEL;

/** Idiomas a los que se puede traducir un documento */
export const TRANSLATION_LANGUAGES = {
  es: 'Spanish',
  en: 'English',
  fr: 'French',
  pt: 'Portuguese',
  de: 'German',
  it: 'Italian',
};

export const INSIGHT_MODES = ['contract', 'study', 'invoice', 'general'];

let client;
function getClient() {
  if (!client) {
    if (!process.env.GEMINI_API_KEY) throw new HttpError(500, 'noKey');
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

// ---------------------------------------------------------------------------
// Esquemas JSON
// ---------------------------------------------------------------------------

const S = (description) => ({ type: Type.STRING, description });
const list = (items, description) => ({ type: Type.ARRAY, items, description });

const analysisProperties = {
  title: S('Título breve y descriptivo del documento'),
  documentType: S('Tipo: nota manuscrita, página de libro, apuntes, contrato, factura, recibo, formulario, carta, otro'),
  language: S('Idioma principal del documento, escrito en ese idioma (p. ej. "español", "English")'),
  transcription: S(
    'Transcripción OCR fiel y completa de todas las páginas, en orden, conservando párrafos y listas. ' +
      'Separa páginas con "--- Página N ---". Marca lo ilegible como [ilegible].',
  ),
  summary: {
    type: Type.OBJECT,
    properties: {
      overview: S('Resumen ejecutivo de 2 a 4 frases'),
      keyPoints: list({ type: Type.STRING }, 'De 3 a 8 puntos clave, cada uno una frase concreta'),
    },
    required: ['overview', 'keyPoints'],
  },
  keyData: list(
    {
      type: Type.OBJECT,
      properties: { label: { type: Type.STRING }, value: { type: Type.STRING } },
      required: ['label', 'value'],
    },
    'Datos clave sueltos: fechas, importes, partes, plazos, nombres, cifras, obligaciones',
  ),
  tables: list(
    {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        columns: list({ type: Type.STRING }),
        rows: list(list({ type: Type.STRING })),
      },
      required: ['title', 'columns', 'rows'],
    },
    'Tablas con información estructurada: tablas del documento o datos que se organizan mejor en filas ' +
      '(cláusulas, partidas, cronogramas). Vacío si no aplica.',
  ),
  suggestedQuestions: list({ type: Type.STRING }, '3 o 4 preguntas útiles que el usuario podría hacer sobre el documento'),
  warnings: list({ type: Type.STRING }, 'Avisos de calidad: partes borrosas, cortadas o ilegibles. Vacío si todo es legible.'),
};
const analysisKeys = Object.keys(analysisProperties);

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    isDocument: { type: Type.BOOLEAN, description: 'false si las imágenes no contienen texto legible de un documento' },
    ...analysisProperties,
  },
  required: ['isDocument', ...analysisKeys],
};

const translationSchema = { type: Type.OBJECT, properties: analysisProperties, required: analysisKeys };

const insightsSchema = {
  type: Type.OBJECT,
  properties: {
    headline: S('Conclusión principal del análisis en una o dos frases'),
    sections: list({
      type: Type.OBJECT,
      properties: {
        heading: { type: Type.STRING },
        items: list({
          type: Type.OBJECT,
          properties: {
            title: S('Idea, riesgo, concepto o dato en pocas palabras'),
            detail: S('Explicación concreta, citando la parte del documento si aplica'),
            level: {
              type: Type.STRING,
              enum: ['high', 'medium', 'low', 'info'],
              description: 'Importancia o gravedad: high, medium, low; info si es solo informativo',
            },
          },
          required: ['title', 'detail', 'level'],
        }),
      },
      required: ['heading', 'items'],
    }),
    flashcards: list(
      {
        type: Type.OBJECT,
        properties: { question: { type: Type.STRING }, answer: { type: Type.STRING } },
        required: ['question', 'answer'],
      },
      'Tarjetas de repaso. Solo en el modo estudio; en los demás, vacío.',
    ),
  },
  required: ['headline', 'sections', 'flashcards'],
};

// ---------------------------------------------------------------------------
// 1) Análisis completo desde imágenes/PDF: OCR + resumen + datos en una llamada
// ---------------------------------------------------------------------------

const ANALYSIS_INSTRUCTIONS = `Eres un sistema experto de digitalización de documentos.
Recibes una o varias páginas fotografiadas o escaneadas (notas manuscritas, páginas de libros, contratos, facturas, etc.).

Tareas:
1. OCR: transcribe TODO el texto con fidelidad, incluida la letra manuscrita. No inventes contenido; si algo no se lee, escribe [ilegible].
2. Resumen ejecutivo: una visión general breve y puntos clave accionables.
3. Datos clave: extrae los datos concretos más importantes (fechas, importes, partes, plazos, obligaciones, nombres, cifras).
4. Tablas: estructura en tablas la información tabular. En contratos, incluye una tabla de cláusulas u obligaciones relevantes. Todas las filas deben tener tantas celdas como columnas.
5. Sugiere preguntas que ayuden a entender el documento.

Escribe el resumen, los datos, las tablas y las preguntas en el mismo idioma del documento.
Si las imágenes no contienen un documento con texto, devuelve isDocument=false y deja el resto vacío.`;

/** @param {{ buffer: Buffer, mimetype: string }[]} files */
export async function analyzeDocument(files) {
  const parts = files.map((file) => ({
    inlineData: { mimeType: file.mimetype, data: file.buffer.toString('base64') },
  }));
  parts.push({ text: `Analiza este documento (${files.length} archivo/s) y devuelve el JSON solicitado.` });

  const raw = await generateJson({
    contents: [{ role: 'user', parts }],
    systemInstruction: ANALYSIS_INSTRUCTIONS,
    schema: analysisSchema,
    temperature: 0.2,
  });

  if (raw.isDocument === false || !str(raw.transcription)) throw new HttpError(422, 'notDocument');
  return normalizeAnalysis(raw);
}

// ---------------------------------------------------------------------------
// 2) Re-análisis a partir del texto corregido por el usuario
// ---------------------------------------------------------------------------

export async function analyzeText(transcription) {
  const text = String(transcription).slice(0, MAX_TRANSCRIPTION_CHARS);
  const raw = await generateJson({
    contents: [
      {
        role: 'user',
        parts: [
          {
            text:
              'Este es el texto de un documento, ya transcrito y corregido por el usuario. ' +
              'No lo transcribas de nuevo: en "transcription" devuelve una cadena vacía y en "warnings" una lista vacía. ' +
              `Genera el resto del análisis a partir de este texto:\n"""\n${text}\n"""`,
          },
        ],
      },
    ],
    systemInstruction: ANALYSIS_INSTRUCTIONS,
    schema: analysisSchema,
    temperature: 0.2,
  });
  // Conservamos el texto del usuario tal cual
  return normalizeAnalysis({ ...raw, transcription: text, warnings: [] });
}

// ---------------------------------------------------------------------------
// 3) Traducción del análisis completo
// ---------------------------------------------------------------------------


const str = (v) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v));
const strList = (v) => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);

function normalizeAnalysis(raw) {
  const tables = (Array.isArray(raw.tables) ? raw.tables : [])
    .map((t) => {
      const columns = strList(t?.columns);
      const rows = (Array.isArray(t?.rows) ? t.rows : [])
        .filter(Array.isArray)
        .map((row) => {
          const cells = row.map(str);
          // Igualamos cada fila al número de columnas para que la tabla se pinte bien
          while (cells.length < columns.length) cells.push('');
          return cells.slice(0, columns.length);
        });
      return { title: str(t?.title) || 'Tabla', columns, rows };
    })
    .filter((t) => t.columns.length > 0 && t.rows.length > 0);

  return {
    title: str(raw.title) || 'Documento sin título',
    documentType: str(raw.documentType) || 'Documento',
    language: str(raw.language),
    transcription: str(raw.transcription),
    summary: {
      overview: str(raw.summary?.overview),
      keyPoints: strList(raw.summary?.keyPoints),
    },
    keyData: (Array.isArray(raw.keyData) ? raw.keyData : [])
      .map((d) => ({ label: str(d?.label), value: str(d?.value) }))
      .filter((d) => d.label && d.value),
    tables,
    suggestedQuestions: strList(raw.suggestedQuestions).slice(0, 4),
    warnings: strList(raw.warnings),
  };
}


const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isTimeout = (err) => err?.name === 'TimeoutError' || err?.name === 'AbortError';
const statusOf = (err) => (isTimeout(err) ? 504 : Number(err?.status ?? err?.code) || 0);
const isTransient = (status) => status === 429 || status === 500 || status === 503 || status === 504;

/**
 * Llama a Gemini con reintentos ante saturación temporal (429/5xx/timeout) y,
 * si el modelo principal sigue sin responder, prueba con el modelo de respaldo.
 * Todo dentro de un presupuesto de tiempo para responder antes que el timeout de la app.
 * @param {(model: string, signal: AbortSignal) => Promise<any>} fn
 */
async function callGemini(fn) {
  const models = FALLBACK_MODEL && FALLBACK_MODEL !== MODEL ? [MODEL, FALLBACK_MODEL] : [MODEL];
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let lastError;

  for (const model of models) {
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      const remaining = deadline - Date.now();
      if (remaining < 5_000) break;
      try {
        return await fn(model, AbortSignal.timeout(Math.min(ATTEMPT_TIMEOUT_MS, remaining)));
      } catch (err) {
        if (err instanceof HttpError) throw err;
        lastError = err;
        const status = statusOf(err);
        console.error(`[gemini] ${model} intento ${attempt + 1}: error ${status}`, String(err?.message).slice(0, 160));
        if (!isTransient(status)) throw toHttpError(err);
        // Si el modelo no responde a tiempo, no insistimos: pasamos directamente al de respaldo
        if (status === 504) break;
        if (attempt < RETRY_DELAYS_MS.length) await sleep(RETRY_DELAYS_MS[attempt]);
      }
    }
    if (model !== models.at(-1)) console.warn(`[gemini] ${model} no disponible, probando con ${models.at(-1)}`);
  }
  throw toHttpError(lastError);
}

/** Traduce un error de Gemini a un HttpError con mensaje para el usuario */
function toHttpError(err) {
  if (!err) return new HttpError(503, 'unavailable');
  const status = statusOf(err);
  if (status === 429) return new HttpError(429, 'rateLimit');
  if (status === 400 && /api key/i.test(String(err?.message))) return new HttpError(500, 'invalidKey');
  if (status === 403) return new HttpError(500, 'forbidden');
  if (status === 404) return new HttpError(500, 'modelNotFound', { model: MODEL });
  if (status >= 500) return new HttpError(503, 'unavailable');
  return new HttpError(502, 'aiFailed');
}

