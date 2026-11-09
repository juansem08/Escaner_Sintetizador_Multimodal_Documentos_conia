import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ScannedDocument } from '../types';

// Historial de antes de que existiera el login (nombre anterior de la app).
// Se pasa a la primera cuenta que inicie sesión en el dispositivo para no perderlo.
const LEGACY_KEY = 'docusynth:history:v1';
const MAX_DOCUMENTS = 50;

/** Cada cuenta tiene su propio historial en el dispositivo */
let currentKey: string | null = null;

const keyFor = (uid: string) => `clarify:history:${uid}`;

/** Lo llama AuthProvider al iniciar o cerrar sesión */
export async function setHistoryUser(uid: string | null): Promise<void> {
  currentKey = uid ? keyFor(uid) : null;
  if (!uid) return;
  try {
    const legacy = await AsyncStorage.getItem(LEGACY_KEY);
    if (legacy === null) return;
    const existing = await AsyncStorage.getItem(keyFor(uid));
    if (existing === null) await AsyncStorage.setItem(keyFor(uid), legacy);
    await AsyncStorage.removeItem(LEGACY_KEY);
  } catch {
    // Si falla la migración el historial antiguo se queda donde estaba
  }
}

/** Borra todo el historial de una cuenta (al eliminarla) */
export async function clearHistoryFor(uid: string): Promise<void> {
  await AsyncStorage.removeItem(keyFor(uid)).catch(() => {});
}

export async function loadHistory(): Promise<ScannedDocument[]> {
  if (!currentKey) return [];
  try {
    const raw = await AsyncStorage.getItem(currentKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function write(docs: ScannedDocument[]) {
  if (!currentKey) return;
  await AsyncStorage.setItem(currentKey, JSON.stringify(docs.slice(0, MAX_DOCUMENTS)));
}

/** Inserta o actualiza un documento (los más recientes primero) */
export async function saveDocument(doc: ScannedDocument): Promise<void> {
  const docs = await loadHistory();
  const others = docs.filter((d) => d.id !== doc.id);
  const existed = others.length !== docs.length;
  await write(existed ? docs.map((d) => (d.id === doc.id ? doc : d)) : [doc, ...others]);
}

export async function deleteDocument(id: string): Promise<void> {
  const docs = await loadHistory();
  await write(docs.filter((d) => d.id !== id));
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
