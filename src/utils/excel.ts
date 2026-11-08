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

