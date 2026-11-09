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
import { actionPageHtml } from './actionPage.js';
import { authEnabled, requireAuth } from './auth.js';
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

// Página de los enlaces de los correos de Firebase (verificar correo y restablecer contraseña).
// El enlace lleva un código de un solo uso: que no se guarde en caché ni se envíe como referer.
app.get('/auth/action', (_req, res) => {
  res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex' });
  res.type('html').send(actionPageHtml);
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, model: modelName, hasApiKey: Boolean(process.env.GEMINI_API_KEY), auth: authEnabled });
});

// Todas las rutas de IA exigen sesión iniciada con el correo verificado.
// Va antes de multer y express.json para no procesar archivos de peticiones sin permiso.
app.use('/api', requireAuth);

// OCR + resumen + datos a partir de imágenes o PDF
app.post(
  '/api/analyze',
  upload.array('pages', MAX_PAGES),
  route(async (req, res) => {
    const files = req.files ?? [];
    if (files.length === 0) throw new HttpError(400, 'noPages');
    const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
    if (totalBytes > MAX_TOTAL_MB * 1024 * 1024) throw new HttpError(413, 'totalTooLarge', { max: MAX_TOTAL_MB });

    const started = Date.now();
    const analysis = await analyzeDocument(files);
    console.log(`[analyze] ${files.length} archivo/s en ${Date.now() - started} ms → "${analysis.title}"`);
    res.json({ analysis });
  }),
);

// Regenera el análisis a partir del texto corregido por el usuario
app.post(
  '/api/reanalyze',
  json,
  route(async (req, res) => {
    const { transcription } = req.body ?? {};
    requireDocument({ transcription });
    res.json({ analysis: await analyzeText(transcription) });
  }),
);

// Traduce el análisis completo a otro idioma
app.post(
  '/api/translate',
  json,
  route(async (req, res) => {
    const { analysis, targetLanguage } = req.body ?? {};
    requireDocument(analysis);
    if (!Object.hasOwn(TRANSLATION_LANGUAGES, targetLanguage)) throw new HttpError(400, 'invalidLanguage');
    res.json({ analysis: await translateAnalysis(analysis, targetLanguage) });
  }),
);

// Análisis especializado: contrato, estudio, factura o general
app.post(
  '/api/insights',
  json,
  route(async (req, res) => {
    const { document, mode, language } = req.body ?? {};
    requireDocument(document);
    if (!INSIGHT_MODES.includes(mode)) throw new HttpError(400, 'invalidMode');
    const languageName = typeof language === 'string' && language.trim() ? language.trim().slice(0, 40) : 'the document language';
    res.json({ insights: await generateInsights(document, mode, languageName) });
  }),
);

// Preguntas y respuestas sobre el documento
app.post(
  '/api/chat',
  json,
  route(async (req, res) => {
    const { document, history, question } = req.body ?? {};
    requireDocument(document);
    if (typeof question !== 'string' || !question.trim()) throw new HttpError(400, 'emptyQuestion');
    if (question.length > 2000) throw new HttpError(400, 'questionTooLong');

    const answer = await askAboutDocument(document, Array.isArray(history) ? history : [], question.trim());
    res.json({ answer });
  }),
);

app.use((req, res) => res.status(404).json({ error: translate(requestLang(req), 'routeNotFound') }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  const lang = requestLang(req);
  if (err instanceof multer.MulterError) {
    const [key, params] =
      err.code === 'LIMIT_FILE_SIZE'
        ? ['fileTooLarge', { max: MAX_FILE_MB }]
        : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE'
          ? ['tooManyPages', { max: MAX_PAGES }]
          : ['uploadError', {}];
    return res.status(413).json({ error: translate(lang, key, params) });
  }
  if (err instanceof HttpError) return res.status(err.status).json({ error: translate(lang, err.key, err.params) });
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: translate(lang, 'requestTooLarge') });

  console.error('[server] error inesperado', err);
  res.status(500).json({ error: translate(lang, 'internal') });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Clarify API escuchando en el puerto ${PORT} (modelo: ${modelName})`);
  if (!process.env.GEMINI_API_KEY) console.warn('⚠  Falta GEMINI_API_KEY: copia server/.env.example a server/.env');
  console.log(
    authEnabled
      ? '  Login: activado (solo usuarios con el correo verificado)'
      : '  Login: desactivado (define FIREBASE_PROJECT_ID para exigir sesión)',
  );

  const lan = Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => `  http://${i.address}:${PORT}`);
  console.log(['  http://localhost:' + PORT, ...lan].join('\n'));
});
