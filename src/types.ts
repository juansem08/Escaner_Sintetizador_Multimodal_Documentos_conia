import type { TranslationCode } from './i18n/strings';

/** Una página/archivo listo para enviar al backend */
export type PageInput = {
  uri: string;
  mimeType: string;
  name: string;
};

export type KeyDatum = { label: string; value: string };

export type DataTable = {
  title: string;
  columns: string[];
  rows: string[][];
};

/** Resultado que devuelve el backend tras el OCR + análisis con Gemini */
export type DocumentAnalysis = {
  title: string;
  documentType: string;
  language: string;
  transcription: string;
  summary: { overview: string; keyPoints: string[] };
  keyData: KeyDatum[];
  tables: DataTable[];
  suggestedQuestions: string[];
  warnings: string[];
};

