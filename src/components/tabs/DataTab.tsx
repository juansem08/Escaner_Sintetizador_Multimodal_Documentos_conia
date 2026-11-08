import { Feather } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useT } from '../../settings/SettingsContext';
import { makeStyles, PAGE_X, radius, spacing, type } from '../../theme';
import type { DocumentAnalysis } from '../../types';
import { getHighlight, isCopyable, isPositiveStatus, splitAmount } from '../../utils/highlights';
import { Card, useTextStyles } from '../Card';
import { CopyButton } from '../CopyButton';
import { DataTableView } from '../DataTableView';
import { GradientCard, Pill } from '../ui';
import { STICKY_SPACE } from './SummaryTab';

export function DataTab({ analysis }: { analysis: DocumentAnalysis }) {
  const t = useT();
  const styles = useStyles();
  const text = useTextStyles();
  const { keyData, tables } = analysis;

  if (keyData.length === 0 && tables.length === 0) {
    return (
      <View style={styles.empty}>
        <Feather name="database" size={28} color={styles.emptyIcon.color} />
        <Text style={[text.small, { textAlign: 'center' }]}>{t('data.empty')}</Text>
      </View>
    );
  }

  const { amount, date, status, party, method } = getHighlight(keyData);
  const money = amount ? splitAmount(amount.value) : null;
  const subtitle = [party?.value, method?.value].filter(Boolean).join(' · ');

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Tarjeta destacada: importe principal, fecha y estado */}
      <GradientCard>
        <View style={styles.heroTop}>
          <Pill
            label={status?.value ?? analysis.documentType}
            icon={status && isPositiveStatus(status.value) ? 'check' : undefined}
            tone="glass"
            size="sm"
          />
          {date ? (
            <Text style={styles.heroDate} numberOfLines={1}>
              {date.value}
            </Text>
          ) : null}
        </View>
        {money ? (
          <View style={styles.amountRow}>
            <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
              {money.amount}
            </Text>
            {money.currency ? <Text style={styles.currency}>{money.currency}</Text> : null}
          </View>
        ) : (
          <View style={styles.amountRow}>
            <Text style={styles.amount}>{keyData.length}</Text>
            <Text style={styles.currency}>{t('data.keyData')}</Text>
          </View>
        )}
        {subtitle ? (
          <Text style={styles.heroSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : (
          <Text style={styles.heroSubtitle} numberOfLines={1}>
            {analysis.title}
          </Text>
        )}
      </GradientCard>

      {keyData.length > 0 && (
        <Card title={t('data.keyData')} right={<Text style={text.small}>{t('data.fields', { n: keyData.length })}</Text>}>
          {keyData.map((d, i) => (
            <View key={i} style={styles.kv}>
              <View style={styles.kvText}>
                <Text style={styles.label}>{d.label}</Text>
                <Text style={styles.value} selectable numberOfLines={isCopyable(d.value) ? 1 : undefined}>
                  {d.value}
                </Text>
              </View>
              {isCopyable(d.value) && <CopyButton value={d.value} />}
            </View>
          ))}
        </Card>
      )}

      {tables.map((table, i) => (
        <Card key={i} title={table.title}>
          <DataTableView table={table} />
          <Text style={text.small}>
            {table.rows.length === 1 ? t('data.rowsOne') : t('data.rowsMany', { n: table.rows.length })} ·{' '}
            {t('data.swipe')}
          </Text>
        </Card>
      ))}
    </ScrollView>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    container: { paddingHorizontal: PAGE_X, paddingTop: spacing.sm, gap: spacing.md, paddingBottom: STICKY_SPACE },
    empty: { padding: spacing.xxl, alignItems: 'center', gap: spacing.sm },
    emptyIcon: { color: c.textMuted },
    heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
    heroDate: { ...type.label, color: '#FFFFFF', flexShrink: 1 },
    amountRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginTop: spacing.xxl + spacing.md },
    amount: { ...type.brand, fontSize: 44, lineHeight: 50, color: '#FFFFFF', flexShrink: 1 },
    currency: { ...type.bodyStrong, color: '#FFFFFF', marginBottom: 8, fontSize: 16 },
    heroSubtitle: { ...type.label, color: 'rgba(255,255,255,0.88)', marginTop: 2 },
    kv: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    kvText: { flex: 1, gap: 2 },
    label: { ...type.small, fontSize: 12, color: c.textMuted },
    value: { ...type.bodyStrong, color: c.text },
  }),
);
