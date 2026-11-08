import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ScannedDocument } from '../types';

// Clave heredada del nombre anterior de la app: no cambiarla o se pierde el historial guardado
const KEY = 'docusynth:history:v1';
const MAX_DOCUMENTS = 50;

export async function loadHistory(): Promise<ScannedDocument[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function write(docs: ScannedDocument[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(docs.slice(0, MAX_DOCUMENTS)));
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
