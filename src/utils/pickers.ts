import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import type { PageInput } from '../types';

export const MAX_PAGES = 10;
export const MAX_PDF_BYTES = 15 * 1024 * 1024;

/** Abre la galería y devuelve hasta `limit` imágenes como páginas */
export async function pickImages(limit: number, startIndex = 0): Promise<PageInput[]> {
  if (limit <= 0) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: limit,
    orderedSelection: true,
    quality: 0.6,
  });
  if (result.canceled) return [];
  return result.assets.slice(0, limit).map((a, i) => ({
    uri: a.uri,
    mimeType: a.mimeType ?? 'image/jpeg',
    name: a.fileName ?? `pagina-${startIndex + i + 1}.jpg`,
  }));
}

/** Abre el selector de archivos para un PDF. `tooLarge` indica si supera el límite */
export async function pickPdf(): Promise<{ page: PageInput; tooLarge: boolean } | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
  if (result.canceled || !result.assets[0]) return null;
  const file = result.assets[0];
  return {
    page: { uri: file.uri, mimeType: 'application/pdf', name: file.name || 'documento.pdf' },
    tooLarge: Boolean(file.size && file.size > MAX_PDF_BYTES),
  };
}
