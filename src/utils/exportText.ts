import type { AppLanguage, TFunction } from '../i18n/strings';
import type { DocumentAnalysis } from '../types';

/** Convierte el análisis en texto plano para compartir (WhatsApp, correo, notas...) */
export function analysisToText(a: DocumentAnalysis, t: TFunction): string {
  const lines: string[] = [`📄 ${a.title}`, a.documentType, ''];

  lines.push(t('summary.executive').toUpperCase(), a.summary.overview, '');
  if (a.summary.keyPoints.length) {
    lines.push(t('summary.keyPoints').toUpperCase(), ...a.summary.keyPoints.map((p) => `• ${p}`), '');
  }
  if (a.keyData.length) {
    lines.push(t('data.keyData').toUpperCase(), ...a.keyData.map((d) => `• ${d.label}: ${d.value}`), '');
  }
  for (const table of a.tables) {
    lines.push(table.title.toUpperCase(), table.columns.join(' | '), ...table.rows.map((r) => r.join(' | ')), '');
  }
  lines.push(`— ${t('export.generatedWith')}`);
  return lines.join('\n');
}

export function formatDate(ts: number, lang: AppLanguage): string {
  return new Date(ts).toLocaleString(lang === 'en' ? 'en-US' : 'es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Nombre de archivo seguro a partir del título */
export function fileSlug(title: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 50);
  return slug || 'documento';
}
