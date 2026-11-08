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

