import { gradients } from '../palette';
import type { Tone } from '../components/ui';
import type { FeatherName } from '../components/Button';

type DocStyle = {
  tone: Tone;
  icon: FeatherName;
  gradient: readonly [string, string];
};

/** Color e icono de cada documento según el tipo que detectó la IA */
export function docStyle(documentType: string): DocStyle {
  const t = documentType.toLowerCase();
  if (/recibo|receipt|comprobante|ticket|pago|payment|voucher/.test(t)) {
    return { tone: 'peach', icon: 'file-minus', gradient: gradients.peach };
  }
  if (/factur|invoice|cuenta|bill|presupuesto|quote|servicio/.test(t)) {
    return { tone: 'mint', icon: 'file-text', gradient: gradients.mint };
  }
  if (/contrat|contract|acuerdo|agreement|arrend|lease|convenio|legal/.test(t)) {
    return { tone: 'lavender', icon: 'briefcase' as FeatherName, gradient: gradients.lavender };
  }
  if (/apunte|nota|note|libro|book|p[aá]gina|page|estudio|study|clase|lecture|manuscr|hand/.test(t)) {
    return { tone: 'sun', icon: 'book-open', gradient: gradients.sun };
  }
  return { tone: 'stone', icon: 'file', gradient: gradients.stone };
}
