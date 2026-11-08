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

export type InsightMode = 'contract' | 'study' | 'invoice' | 'general';
export type InsightLevel = 'high' | 'medium' | 'low' | 'info';

export type Insights = {
  headline: string;
  sections: { heading: string; items: { title: string; detail: string; level: InsightLevel }[] }[];
  flashcards: { question: string; answer: string }[];
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'model';
  text: string;
  createdAt: number;
};

/** Idioma en el que se está viendo el documento */
export type ViewLanguage = 'original' | TranslationCode;

/** Documento guardado en el historial del dispositivo */
export type ScannedDocument = {
  id: string;
  createdAt: number;
  pages: PageInput[];
  analysis: DocumentAnalysis;
  chat: ChatMessage[];
  /** Traducciones ya generadas, por código de idioma */
  translations?: Partial<Record<TranslationCode, DocumentAnalysis>>;
  /** Análisis especializados, con clave "modo:idioma" (p. ej. "contract:original") */
  insights?: Record<string, Insights>;
};
