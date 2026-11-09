import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';
import { makeT, type AppLanguage, type TranslationCode } from '../i18n/strings';
import type { ChatMessage, DocumentAnalysis, InsightMode, Insights, PageInput } from '../types';

const SERVER_PORT = 3001;
const LONG_TIMEOUT_MS = 150_000;
const SHORT_TIMEOUT_MS = 60_000;

/** Extrae el host de "192.168.1.42:8081", "exp://192.168.1.42:8081" o "http://192.168.1.42:8081/index.bundle?..." */
function hostFrom(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  const match = value.match(/^(?:[a-z][a-z0-9+.-]*:\/\/)?([^/:?#]+)/i);
  const host = match?.[1];
  // Los túneles de Expo no exponen el puerto 3001 del PC
  if (!host || host.includes('exp.direct') || host.includes('ngrok')) return null;
  return host;
}

/** Dirección desde la que el móvil descargó el bundle JS (el PC que ejecuta Metro) */
function bundleHost(): string | null {
  try {
    const sourceCode = NativeModules.SourceCode as
      | { scriptURL?: string; getConstants?: () => { scriptURL?: string } }
      | undefined;
    return hostFrom(sourceCode?.getConstants?.().scriptURL ?? sourceCode?.scriptURL);
  } catch {
    return null;
  }
}

/**
 * Busca la URL del backend:
 * 1. EXPO_PUBLIC_API_URL si está definida en .env
 * 2. La IP del PC que sirve Expo (varias fuentes según la versión de Expo Go), en el puerto 3001
 * 3. localhost (o 10.0.2.2 en el emulador de Android)
 *
 * IMPORTANTE para el APK/instalable: ahí no hay Metro, así que hay que compilar con
 * EXPO_PUBLIC_API_URL apuntando al servidor (ver README, sección "Generar el instalable").
 */
function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, '');

  const anyConstants = Constants as unknown as {
    expoGoConfig?: { debuggerHost?: string } | null;
    manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } } | null;
  };
  const host =
    hostFrom(Constants.expoConfig?.hostUri) ??
    hostFrom(anyConstants.expoGoConfig?.debuggerHost) ??
    hostFrom(anyConstants.manifest2?.extra?.expoGo?.debuggerHost) ??
    // Solo en desarrollo: en un APK el bundle va dentro de la app y su ruta no es un servidor
    (Platform.OS !== 'web' && __DEV__ ? bundleHost() : null);

  if (host && host !== 'localhost' && host !== '127.0.0.1') return `http://${host}:${SERVER_PORT}`;
  if (Platform.OS === 'web') return `http://${globalThis.location?.hostname || 'localhost'}:${SERVER_PORT}`;
  return Platform.OS === 'android' ? `http://10.0.2.2:${SERVER_PORT}` : `http://localhost:${SERVER_PORT}`;
}

export const API_BASE_URL = resolveBaseUrl();
// Aparece en la terminal de Expo: útil para comprobar a qué servidor llama el móvil
console.log(`[Clarify] API_BASE_URL = ${API_BASE_URL}`);

let language: AppLanguage = 'es';
/** Lo llama SettingsProvider para que el servidor responda en el idioma de la app */
export function setApiLanguage(lang: AppLanguage) {
  language = lang;
}

/** Devuelve el token de la sesión de Firebase (o null sin sesión). Lo registra AuthProvider. */
type TokenProvider = (forceRefresh: boolean) => Promise<string | null>;
let getToken: TokenProvider = async () => null;
export function setAuthTokenProvider(provider: TokenProvider) {
  getToken = provider;
}

async function authHeaders(forceRefresh = false): Promise<Record<string, string>> {
  const token = await getToken(forceRefresh).catch(() => null);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

/** 401/403: el token puede estar caducado o no incluir aún el correo verificado */
const isAuthError = (err: unknown) => err instanceof ApiError && (err.status === 401 || err.status === 403);

/** Reintenta una vez con un token renovado si el servidor rechaza la sesión */
async function withAuthRetry<T>(send: (headers: Record<string, string>) => Promise<T>): Promise<T> {
  try {
    return await send(await authHeaders());
  } catch (err) {
    if (!isAuthError(err)) throw err;
    return send(await authHeaders(true));
  }
}

function request<T>(path: string, init: RequestInit, timeoutMs: number): Promise<T> {
  return withAuthRetry((auth) => requestOnce<T>(path, init, timeoutMs, auth));
}

async function requestOnce<T>(
  path: string,
  init: RequestInit,
  timeoutMs: number,
  auth: Record<string, string>,
): Promise<T> {
  const t = makeT(language);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { 'Accept-Language': language, ...auth, ...(init.headers as Record<string, string> | undefined) },
      signal: controller.signal,
    });
  } catch (err) {
    const error = err as Error;
    if (error.name === 'AbortError') throw new ApiError(t('error.timeout'));
    // Aparece en la terminal de Expo con la causa real
    console.warn(`[Clarify] ${init.method ?? 'GET'} ${path} falló:`, error?.message);
    const isNetwork = /network|failed to connect|unable to resolve|connection|timed? ?out|ECONN/i.test(error?.message ?? '');
    throw new ApiError(
      isNetwork || !error?.message
        ? t('error.network', { url: API_BASE_URL })
        : `${t('error.network', { url: API_BASE_URL })}\n\n(${error.message})`,
    );
  } finally {
    clearTimeout(timer);
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(body?.error ?? t('error.server', { status: response.status }), response.status);
  return body as T;
}

function postJson<T>(path: string, payload: unknown, timeoutMs = SHORT_TIMEOUT_MS) {
  return request<T>(
    path,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    timeoutMs,
  );
}

/** Lo mínimo del documento que necesita el servidor para chat y análisis */
const documentContext = (a: DocumentAnalysis) => ({
  title: a.title,
  documentType: a.documentType,
  transcription: a.transcription,
  keyData: a.keyData,
});

/**
 * Sube un FormData con XMLHttpRequest.
 * Expo SDK 58 sustituye `fetch` por expo/fetch, que no admite archivos { uri } y, en Expo Go,
 * no tiene permiso para leer las fotos de la cámara. XMLHttpRequest sigue siendo el de React Native,
 * que lee el archivo de forma nativa a partir de su uri.
 */
function uploadForm<T>(path: string, form: FormData, timeoutMs: number): Promise<T> {
  return withAuthRetry((auth) => uploadFormOnce<T>(path, form, timeoutMs, auth));
}

function uploadFormOnce<T>(path: string, form: FormData, timeoutMs: number, auth: Record<string, string>): Promise<T> {
  const t = makeT(language);
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}${path}`);
    xhr.setRequestHeader('Accept-Language', language);
    for (const [name, value] of Object.entries(auth)) xhr.setRequestHeader(name, value);
    xhr.timeout = timeoutMs;
    xhr.onload = () => {
      let body: any = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // respuesta no JSON
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as T);
      else reject(new ApiError(body?.error ?? t('error.server', { status: xhr.status }), xhr.status));
    };
    xhr.ontimeout = () => reject(new ApiError(t('error.timeout')));
    xhr.onerror = () => {
      console.warn(`[Clarify] POST ${path} falló (XHR status ${xhr.status})`);
      reject(new ApiError(t('error.network', { url: API_BASE_URL })));
    };
    xhr.send(form);
  });
}

export async function analyzeDocument(pages: PageInput[]): Promise<DocumentAnalysis> {
  const form = new FormData();
  for (const page of pages) {
    if (Platform.OS === 'web') {
      const blob = await (await fetch(page.uri)).blob();
      form.append('pages', blob, page.name);
    } else {
      // Formato propio de React Native: el archivo se lee de forma nativa al enviarlo
      form.append('pages', { uri: page.uri, name: page.name, type: page.mimeType } as unknown as Blob);
    }
  }
  const { analysis } = await uploadForm<{ analysis: DocumentAnalysis }>('/api/analyze', form, LONG_TIMEOUT_MS);
  return analysis;
}

export async function reanalyzeText(transcription: string): Promise<DocumentAnalysis> {
  const { analysis } = await postJson<{ analysis: DocumentAnalysis }>('/api/reanalyze', { transcription }, LONG_TIMEOUT_MS);
  return analysis;
}

export async function translateDocument(analysis: DocumentAnalysis, targetLanguage: TranslationCode) {
  const { analysis: translated } = await postJson<{ analysis: DocumentAnalysis }>(
    '/api/translate',
    { analysis, targetLanguage },
    LONG_TIMEOUT_MS,
  );
  return translated;
}

export async function generateInsights(analysis: DocumentAnalysis, mode: InsightMode): Promise<Insights> {
  const { insights } = await postJson<{ insights: Insights }>(
    '/api/insights',
    { document: documentContext(analysis), mode, language: analysis.language },
    LONG_TIMEOUT_MS,
  );
  return insights;
}

export async function askQuestion(analysis: DocumentAnalysis, history: ChatMessage[], question: string) {
  const { answer } = await postJson<{ answer: string }>('/api/chat', {
    document: documentContext(analysis),
    history: history.map(({ role, text }) => ({ role, text })),
    question,
  });
  return answer;
}

export async function checkHealth() {
  return request<{ ok: boolean; model: string; hasApiKey: boolean; auth?: boolean }>(
    '/api/health',
    { method: 'GET' },
    // El servidor gratuito de Render tarda hasta ~50 s en despertar
    60_000,
  );
}
