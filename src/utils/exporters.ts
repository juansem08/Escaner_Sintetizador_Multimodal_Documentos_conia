import { getLocales } from 'expo-localization';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';
import type { TFunction } from '../i18n/strings';
import type { DocumentAnalysis, Insights } from '../types';
import { buildWorkbookBase64 } from './excel';
import { analysisToText, fileSlug } from './exportText';

// ---------------------------------------------------------------------------
// Texto plano
// ---------------------------------------------------------------------------

export async function shareAsText(a: DocumentAnalysis, t: TFunction) {
  await Share.share({ title: a.title, message: analysisToText(a, t) });
}

// ---------------------------------------------------------------------------
// PDF (HTML → PDF con expo-print)
// ---------------------------------------------------------------------------

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Colores de los niveles de gravedad: [fondo, texto] */
const LEVELS: Record<string, [string, string]> = {
  high: ['#FDE3DF', '#D23B2B'],
  medium: ['#FFF0D6', '#A86400'],
  low: ['#DDF3E8', '#22A35A'],
};

function buildHtml(a: DocumentAnalysis, insights: Insights[], t: TFunction): string {
  const section = (title: string, body: string) =>
    `<section><div class="caption"><span class="dot"></span>${esc(title)}</div>${body}</section>`;

  const keyPoints = a.summary.keyPoints
    .map((p, i) => `<div class="point"><span class="num">${i + 1}</span><span>${esc(p)}</span></div>`)
    .join('');

  const keyData = a.keyData.length
    ? section(
        t('data.keyData'),
        `<div class="card kv">${a.keyData
          .map((d) => `<div class="row"><div class="k">${esc(d.label)}</div><div class="v">${esc(d.value)}</div></div>`)
          .join('')}</div>`,
      )
    : '';

  const tables = a.tables
    .map((tb) =>
      section(
        tb.title,
        `<table>
          <thead><tr>${tb.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>
          <tbody>${tb.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c || '—')}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>`,
      ),
    )
    .join('');

  const levelPill = (level: string) => {
    const colors = LEVELS[level];
    if (!colors) return '';
    const label = t(`insights.level.${level}` as Parameters<TFunction>[0]);
    return `<span class="pill" style="background:${colors[0]};color:${colors[1]}">${esc(label)}</span>`;
  };

  const insightsHtml = insights
    .map(
      (ins) => `
      ${ins.headline ? `<div class="headline">${esc(ins.headline)}</div>` : ''}
      ${ins.sections
        .map(
          (s) => `<div class="card"><h3>${esc(s.heading)}</h3>${s.items
            .map(
              (i) => `<div class="item"><div class="item-head"><b>${esc(i.title)}</b>${levelPill(i.level)}</div>
                <div class="muted">${esc(i.detail)}</div></div>`,
            )
            .join('')}</div>`,
        )
        .join('')}
      ${
        ins.flashcards.length
          ? `<div class="card"><h3>${esc(t('insights.flashcards'))}</h3>${ins.flashcards
              .map((f, i) => `<div class="point"><span class="num">${i + 1}</span><span><b>${esc(f.question)}</b><br/><span class="muted">${esc(f.answer)}</span></span></div>`)
              .join('')}</div>`
          : ''
      }`,
    )
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet"/>
<style>
  @page { margin: 16mm 14mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: 'Plus Jakarta Sans', -apple-system, Roboto, 'Segoe UI', Arial, sans-serif;
         color: #151413; font-size: 12px; line-height: 1.55; margin: 0; }
  .hero { background: linear-gradient(135deg, #FFA374 0%, #F26D45 55%, #D44E2A 100%);
          border-radius: 22px; padding: 26px 26px 22px; color: #fff; position: relative; overflow: hidden; }
  .hero:after { content: ''; position: absolute; right: -60px; top: -70px; width: 200px; height: 200px;
                border-radius: 50%; background: rgba(255,255,255,0.16); }
  .brand { font-weight: 800; font-size: 11px; letter-spacing: 1.2px; text-transform: uppercase; opacity: .9; }
  h1 { font-size: 24px; line-height: 1.2; font-weight: 800; margin: 10px 0 14px; letter-spacing: -.4px; }
  .tags span { display: inline-block; background: rgba(255,255,255,0.22); border-radius: 999px;
               padding: 4px 12px; margin-right: 6px; font-weight: 700; font-size: 11px; text-transform: capitalize; }
  section { margin-top: 22px; page-break-inside: auto; }
  .caption { font-weight: 800; font-size: 11px; letter-spacing: 1.1px; text-transform: uppercase; color: #77716C;
             margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: #F26D45; display: inline-block; }
  .card { background: #F6F4F2; border-radius: 18px; padding: 16px 18px; margin-bottom: 10px; page-break-inside: avoid; }
  .summary { background: #FDE4D7; color: #3A1A0E; font-weight: 600; font-size: 13px; line-height: 1.6; }
  .point { display: flex; gap: 10px; align-items: flex-start; margin: 7px 0; }
  .num { flex: 0 0 22px; height: 22px; border-radius: 50%; background: #FDE4D7; color: #C2481F;
         font-weight: 800; font-size: 11px; display: flex; align-items: center; justify-content: center; }
  .kv .row { display: flex; gap: 14px; padding: 8px 0; border-top: 1px solid #ECE8E4; }
  .kv .row:first-child { border-top: 0; padding-top: 0; }
  .k { flex: 0 0 38%; color: #77716C; font-weight: 600; }
  .v { flex: 1; font-weight: 700; word-break: break-word; }
  table { width: 100%; border-collapse: separate; border-spacing: 0; border-radius: 14px; overflow: hidden; }
  thead th { background: #FDE4D7; color: #C2481F; font-weight: 800; text-align: left; padding: 9px 12px; font-size: 11.5px; }
  td { padding: 8px 12px; vertical-align: top; background: #FFFFFF; border-top: 1px solid #ECE8E4; }
  tbody tr:nth-child(even) td { background: #F6F4F2; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  h3 { font-size: 14px; font-weight: 800; margin: 0 0 8px; }
  .headline { background: linear-gradient(135deg, #FFA374, #F26D45 60%, #D44E2A); color: #fff; font-weight: 700;
              border-radius: 18px; padding: 16px 18px; margin-bottom: 10px; font-size: 13px; }
  .item { padding: 8px 0; border-top: 1px solid #ECE8E4; }
  .item:first-of-type { border-top: 0; }
  .item-head { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
  .pill { border-radius: 999px; padding: 2px 10px; font-size: 10px; font-weight: 800; white-space: nowrap; }
  .muted { color: #77716C; }
  pre { white-space: pre-wrap; font-family: inherit; font-size: 11px; line-height: 1.6; margin: 0; }
  footer { margin-top: 26px; text-align: center; color: #A59E98; font-size: 10px; font-weight: 600; }
  footer b { color: #F26D45; }
</style></head><body>
  <div class="hero">
    <div class="brand">Clarify</div>
    <h1>${esc(a.title)}</h1>
    <div class="tags"><span>${esc(a.documentType)}</span>${a.language ? `<span>${esc(a.language)}</span>` : ''}</div>
  </div>

  ${section(t('summary.executive'), `<div class="card summary">${esc(a.summary.overview)}</div>`)}
  ${keyPoints ? section(t('summary.keyPoints'), `<div class="card">${keyPoints}</div>`) : ''}
  ${keyData}
  ${tables}
  ${insightsHtml ? section(t('export.analysis'), insightsHtml) : ''}
  ${section(t('export.transcription'), `<div class="card" style="page-break-inside:auto"><pre>${esc(a.transcription)}</pre></div>`)}

  <footer>● <b>${esc(t('export.generatedWith'))}</b></footer>
</body></html>`;
}

export async function exportPdf(a: DocumentAnalysis, insights: Insights[], t: TFunction) {
  const html = buildHtml(a, insights, t);
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  try {
    // En Expo Go, Sharing no puede leer el archivo que deja expo-print en su carpeta.
    // Pedimos el PDF en base64 y lo escribimos nosotros en la caché de la app, que sí es accesible.
    const { base64 } = await Print.printToFileAsync({ html, base64: true });
    if (!base64) throw new Error('PDF vacío');
    const file = new File(Paths.cache, `${fileSlug(a.title)}.pdf`);
    if (file.exists) file.delete();
    file.create();
    await file.write(base64, { encoding: 'base64' });
    await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: a.title });
  } catch (err) {
    // Plan B: diálogo de impresión del sistema, que permite "Guardar como PDF"
    console.warn('[Clarify] no se pudo compartir el PDF, se abre el diálogo de impresión:', (err as Error).message);
    await Print.printAsync({ html });
  }
}

// ---------------------------------------------------------------------------
// CSV compatible con Excel
// ---------------------------------------------------------------------------

/** Excel usa ";" como separador en los países donde la coma es el separador decimal */
