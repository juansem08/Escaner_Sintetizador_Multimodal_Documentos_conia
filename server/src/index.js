import os from 'node:os';
import cors from 'cors';
import express from 'express';
import multer from 'multer';
import {
  analyzeDocument,
  analyzeText,
  askAboutDocument,
  generateInsights,
  INSIGHT_MODES,
  modelName,
  TRANSLATION_LANGUAGES,
  translateAnalysis,
} from './gemini.js';
import { HttpError } from './httpError.js';
import { requestLang, translate } from './messages.js';

const PORT = Number(process.env.PORT) || 3001;
const MAX_FILE_MB = 15;
const MAX_TOTAL_MB = 18; // límite práctico para enviar los archivos "inline" a Gemini
const MAX_PAGES = 10;
const ALLOWED_MIME = /^(image\/(jpeg|png|webp|heic|heif)|application\/pdf)$/;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024, files: MAX_PAGES },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIME.test(file.mimetype)) cb(null, true);
    else cb(new HttpError(415, 'unsupportedFormat', { type: file.mimetype }));
  },
});

const json = express.json({ limit: '5mb' });
const app = express();
app.use(cors());

// Registro de cada petición: método, ruta, origen, código y duración
app.use((req, res, next) => {
  const started = Date.now();
  res.on('finish', () => {
    const ip = (req.ip ?? '').replace('::ffff:', '');
    console.log(`→ ${req.method} ${req.path} desde ${ip} · ${res.statusCode} · ${Date.now() - started} ms`);
  });
  next();
});

/** Envuelve un handler async para mandar los errores al middleware */
const route = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

function requireDocument(document) {
  if (!document || typeof document !== 'object') throw new HttpError(400, 'missingDocument');
  if (typeof document.transcription !== 'string' || !document.transcription.trim()) {
    throw new HttpError(400, 'emptyText');
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, model: modelName, hasApiKey: Boolean(process.env.GEMINI_API_KEY) });
});

// OCR + resumen + datos a partir de imágenes o PDF
