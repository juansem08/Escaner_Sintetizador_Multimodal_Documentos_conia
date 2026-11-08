// Exportación a Excel (.xlsx) con el estilo visual de Clarify.
// xlsx-js-style es una variante de SheetJS que permite colores, fuentes y bordes.
// Solo GENERAMOS archivos: nunca se leen Excel externos.
import XLSX from 'xlsx-js-style';
import type { TFunction } from '../i18n/strings';
import type { DocumentAnalysis } from '../types';

// Paleta de la app (sin "#")
const C = {
  orange: 'F26D45',
  orangeDark: 'C2481F',
  peach: 'FDE4D7',
  stone: 'F6F4F2',
  border: 'ECE8E4',
  text: '151413',
  muted: '77716C',
  white: 'FFFFFF',
};
const FONT = 'Calibri';

type Cell = { v: string | number; t: 's' | 'n'; s?: Record<string, unknown> };
type Row = (Cell | null)[];

const thin = { style: 'thin', color: { rgb: C.border } };
const borders = { top: thin, bottom: thin, left: thin, right: thin };

const styles = {
  brand: {
    font: { name: FONT, sz: 10, bold: true, color: { rgb: C.white } },
    fill: { fgColor: { rgb: C.orange } },
    alignment: { vertical: 'center', indent: 1 },
  },
  title: {
    font: { name: FONT, sz: 18, bold: true, color: { rgb: C.white } },
    fill: { fgColor: { rgb: C.orange } },
    alignment: { vertical: 'center', wrapText: true, indent: 1 },
  },
  subtitle: {
    font: { name: FONT, sz: 11, color: { rgb: C.white } },
    fill: { fgColor: { rgb: C.orange } },
    alignment: { vertical: 'center', indent: 1 },
  },
  caption: {
    font: { name: FONT, sz: 10, bold: true, color: { rgb: C.orangeDark } },
    alignment: { vertical: 'bottom' },
  },
  summary: {
    font: { name: FONT, sz: 11, bold: true, color: { rgb: '3A1A0E' } },
    fill: { fgColor: { rgb: C.peach } },
    alignment: { vertical: 'top', wrapText: true, indent: 1 },
  },
  pointNum: {
    font: { name: FONT, sz: 11, bold: true, color: { rgb: C.orangeDark } },
    fill: { fgColor: { rgb: C.peach } },
    alignment: { horizontal: 'center', vertical: 'top' },
    border: borders,
  },
  header: {
    font: { name: FONT, sz: 11, bold: true, color: { rgb: C.orangeDark } },
    fill: { fgColor: { rgb: C.peach } },
    alignment: { vertical: 'center', wrapText: true },
    border: borders,
  },
  cell: (zebra: boolean, bold = false) => ({
    font: { name: FONT, sz: 11, bold, color: { rgb: bold ? C.text : C.text } },
    fill: { fgColor: { rgb: zebra ? C.stone : C.white } },
    alignment: { vertical: 'top', wrapText: true },
    border: borders,
  }),
  label: (zebra: boolean) => ({
    font: { name: FONT, sz: 11, color: { rgb: C.muted } },
    fill: { fgColor: { rgb: zebra ? C.stone : C.white } },
    alignment: { vertical: 'top', wrapText: true },
    border: borders,
  }),
  footer: { font: { name: FONT, sz: 9, italic: true, color: { rgb: C.muted } } },
};

const s = (v: string, style?: Record<string, unknown>): Cell => ({ v, t: 's', s: style });

/** Nombre de hoja válido en Excel: máx. 31 caracteres, sin []:*?/\ y sin repetir */
function sheetName(raw: string, used: Set<string>): string {
  const base = (raw.replace(/[[\]:*?/\\]/g, ' ').replace(/\s+/g, ' ').trim() || 'Tabla').slice(0, 28);
  let name = base;
  for (let i = 2; used.has(name.toLowerCase()); i++) name = `${base.slice(0, 26)} ${i}`;
  used.add(name.toLowerCase());
  return name;
}

/** Ancho de columna aproximado según el contenido (en caracteres) */
function columnWidths(rows: Row[], min = 10, max = 60): { wch: number }[] {
  const widths: number[] = [];
  for (const row of rows) {
    row.forEach((cell, i) => {
      if (!cell) return;
      // Las celdas de cabecera combinadas no deben ensanchar la columna A
      const len = String(cell.v).split('\n').reduce((m, l) => Math.max(m, l.length), 0);
      widths[i] = Math.max(widths[i] ?? min, Math.min(max, len + 2));
    });
  }
  return widths.map((w) => ({ wch: Math.max(min, w ?? min) }));
}

function toSheet(rows: Row[], opts: { merges?: XLSX.Range[]; cols?: { wch: number }[]; rowHeights?: Record<number, number> }) {
  const ws = XLSX.utils.aoa_to_sheet(rows.map((r) => r.map((c) => (c ? c.v : ''))));
  rows.forEach((row, r) =>
    row.forEach((cell, c) => {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (cell?.s && ws[ref]) ws[ref].s = cell.s;
    }),
  );
  if (opts.merges) ws['!merges'] = opts.merges;
  if (opts.cols) ws['!cols'] = opts.cols;
  if (opts.rowHeights) {
    ws['!rows'] = [];
    for (const [r, hpt] of Object.entries(opts.rowHeights)) ws['!rows'][Number(r)] = { hpt };
  }
  return ws;
}

/** Pinta de naranja toda la franja de cabecera (también las celdas vacías combinadas) */
function paintBand(ws: XLSX.WorkSheet, rowsIdx: number[], width: number, style: Record<string, unknown>) {
  // SheetJS solo guarda las celdas dentro de "!ref": lo ampliamos para incluir toda la franja
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
  range.e.c = Math.max(range.e.c, width - 1);
  range.e.r = Math.max(range.e.r, ...rowsIdx);
  ws['!ref'] = XLSX.utils.encode_range(range);
  for (const r of rowsIdx) {
    for (let c = 0; c < width; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { v: '', t: 's' };
      if (!ws[ref].s) ws[ref].s = style;
    }
  }
}

/** Genera el libro de Excel y lo devuelve en base64 */
export function buildWorkbookBase64(a: DocumentAnalysis, t: TFunction): string {
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();
  const WIDTH = 3; // columnas de la hoja Resumen: nº / campo / valor

  // ---------------- Hoja 1: Resumen ----------------
  const rows: Row[] = [];
  const merges: XLSX.Range[] = [];
  const heights: Record<number, number> = {};
  const mergeRow = (r: number) => merges.push({ s: { r, c: 0 }, e: { r, c: WIDTH - 1 } });

  rows.push([s('CLARIFY', styles.brand)]);
  mergeRow(0);
  heights[0] = 20;
  rows.push([s(a.title, styles.title)]);
  mergeRow(1);
  heights[1] = 34;
  rows.push([s([a.documentType, a.language].filter(Boolean).join(' · '), styles.subtitle)]);
  mergeRow(2);
  heights[2] = 22;
  rows.push([]);

  rows.push([s(t('summary.executive').toUpperCase(), styles.caption)]);
  rows.push([s(a.summary.overview, styles.summary)]);
  mergeRow(rows.length - 1);
  heights[rows.length - 1] = Math.min(160, 18 * Math.ceil(a.summary.overview.length / 90) + 10);
  rows.push([]);

  if (a.summary.keyPoints.length) {
    rows.push([s(t('summary.keyPoints').toUpperCase(), styles.caption)]);
    a.summary.keyPoints.forEach((p, i) => {
      rows.push([{ v: i + 1, t: 'n', s: styles.pointNum }, s(p, styles.cell(i % 2 === 1))]);
      merges.push({ s: { r: rows.length - 1, c: 1 }, e: { r: rows.length - 1, c: WIDTH - 1 } });
    });
    rows.push([]);
  }

  if (a.keyData.length) {
    rows.push([s(t('data.keyData').toUpperCase(), styles.caption)]);
    a.keyData.forEach((d, i) => {
      const zebra = i % 2 === 1;
      rows.push([s(d.label, styles.label(zebra)), s(d.value, styles.cell(zebra, true))]);
      merges.push({ s: { r: rows.length - 1, c: 1 }, e: { r: rows.length - 1, c: WIDTH - 1 } });
    });
    rows.push([]);
  }
  rows.push([s(t('export.generatedWith'), styles.footer)]);

  const summarySheet = toSheet(rows, {
    merges,
    cols: [{ wch: 28 }, { wch: 45 }, { wch: 30 }],
    rowHeights: heights,
  });
  paintBand(summarySheet, [0, 1, 2], WIDTH, styles.title);
  XLSX.utils.book_append_sheet(wb, summarySheet, sheetName(t('result.tab.summary'), used));

  // ---------------- Una hoja por tabla ----------------
  for (const table of a.tables) {
    const width = Math.max(1, table.columns.length);
    const tRows: Row[] = [
      [s(table.title, styles.title)],
      [s(a.title, styles.subtitle)],
      [],
      table.columns.map((col) => s(col, styles.header)),
      ...table.rows.map((r, i) => r.map((cell) => s(cell || '—', styles.cell(i % 2 === 1)))),
      [],
      [s(t('export.generatedWith'), styles.footer)],
    ];
    const tMerges: XLSX.Range[] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: width - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: width - 1 } },
    ];
    // El ancho se calcula solo con la cabecera de columnas y los datos (no con el título)
    const cols = columnWidths(tRows.slice(3, 3 + 1 + table.rows.length), 12, 50);
    const ws = toSheet(tRows, { merges: tMerges, cols, rowHeights: { 0: 30, 1: 20, 3: 22 } });
    paintBand(ws, [0, 1], width, styles.title);
    XLSX.utils.book_append_sheet(wb, ws, sheetName(table.title, used));
  }

  return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
}
