import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { PageInput } from '../types';

type Rect = { originX: number; originY: number; width: number; height: number };

async function cropTo(uri: string, rect: Rect): Promise<string> {
  const ref = await ImageManipulator.manipulate(uri).crop(rect).renderAsync();
  const result = await ref.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return result.uri;
}

/**
 * Modo libro: divide la foto de un libro abierto en sus dos páginas.
 * - Foto horizontal (móvil girado): izquierda | derecha
 * - Foto vertical (libro girado en el encuadre): arriba / abajo
 */
export async function splitBookSpread(uri: string, width: number, height: number, startIndex: number): Promise<PageInput[]> {
  const landscape = width >= height;
  const halves: Rect[] = landscape
    ? [
        { originX: 0, originY: 0, width: Math.floor(width / 2), height },
        { originX: Math.floor(width / 2), originY: 0, width: width - Math.floor(width / 2), height },
      ]
    : [
        { originX: 0, originY: 0, width, height: Math.floor(height / 2) },
        { originX: 0, originY: Math.floor(height / 2), width, height: height - Math.floor(height / 2) },
      ];

  const uris = await Promise.all(halves.map((rect) => cropTo(uri, rect)));
  return uris.map((u, i) => ({ uri: u, mimeType: 'image/jpeg', name: `pagina-${startIndex + i + 1}.jpg` }));
}
