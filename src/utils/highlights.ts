import type { KeyDatum } from '../types';

const AMOUNT = /monto|total|importe|amount|valor|precio|canon|price|suma|cuant[ií]a|pago|payment/i;
const DATE = /fecha|date|d[ií]a|emisi[oó]n|issued/i;
const STATUS = /estado|status|resultado/i;
const PARTY = /comercio|beneficiari|proveedor|emisor|merchant|payee|vendor|arrendador|empresa|destinatario|para|cliente|parte/i;
const METHOD = /m[eé]todo|medio|tarjeta|method|card|forma de pago/i;
const POSITIVE = /pagad|paid|aprobad|approved|exitos|success|complet|activo|vigente|confirmad|v[aá]lid/i;

const find = (data: KeyDatum[], re: RegExp, except: KeyDatum[] = []) =>
  data.find((d) => re.test(d.label) && !except.includes(d));

const hasDigit = (s: string) => /\d/.test(s);

/** ¿El valor indica un estado positivo (pagado, aprobado…)? Se muestra con un punto verde */
export const isPositiveStatus = (value: string) => POSITIVE.test(value);

/** Separa "$60.000 COP" en importe "$60.000" y moneda "COP" */
export function splitAmount(value: string): { amount: string; currency: string } {
  const match = value.trim().match(/^(.*?\d[\d.,'\s]*)\s*([A-Z]{3})\b(.*)$/);
  if (match) return { amount: match[1].trim(), currency: match[2] };
  return { amount: value.trim(), currency: '' };
}

/** Datos destacados para la tarjeta grande de la pestaña Datos */
export function getHighlight(data: KeyDatum[]) {
  const amount = data.find((d) => AMOUNT.test(d.label) && hasDigit(d.value));
  const date = find(data, DATE, amount ? [amount] : []);
  const status = find(data, STATUS);
  const party = find(data, PARTY, [amount, date, status].filter(Boolean) as KeyDatum[]);
  const method = find(data, METHOD, [amount, date, status, party].filter(Boolean) as KeyDatum[]);
  return { amount, date, status, party, method };
}

/** Hasta 3 datos cortos para las fichas del resumen (Monto · Fecha · Estado) */
export function getStatTiles(data: KeyDatum[]): KeyDatum[] {
  const short = (d: KeyDatum) => d.value.length <= 22;
  const { amount, date, status } = getHighlight(data);
  const preferred = [amount, date, status].filter((d): d is KeyDatum => Boolean(d) && short(d!));
  const rest = data.filter((d) => short(d) && !preferred.includes(d));
  return [...preferred, ...rest].slice(0, 3);
}

/** Etiquetas cortas para las fichas: "Monto total a pagar" → "Monto total a pagar" (se recorta en la UI) */
export function shortLabel(label: string): string {
  return label.length > 18 ? label.split(/\s+/).slice(0, 2).join(' ') : label;
}

/** ¿Merece botón de copiar? Identificadores, referencias, números largos */
export function isCopyable(value: string): boolean {
  const v = value.trim();
  if (v.length >= 20) return true;
  return /^[\w-]{8,}$/.test(v.replace(/\s/g, '')) && hasDigit(v) && !/\s/.test(v);
}
