import { Feather } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useT } from '../../settings/SettingsContext';
import { makeStyles, PAGE_X, radius, spacing, type } from '../../theme';
import type { DocumentAnalysis } from '../../types';
import { getStatTiles, isPositiveStatus, shortLabel } from '../../utils/highlights';
import { Card } from '../Card';
import { GradientCard } from '../ui';

/** Espacio para el botón fijo "Hacer una pregunta" */
export const STICKY_SPACE = 120;

export function SummaryTab({ analysis }: { analysis: DocumentAnalysis }) {
  const t = useT();
  const styles = useStyles();
  const { summary, warnings } = analysis;
  const tiles = getStatTiles(analysis.keyData);

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {warnings.length > 0 && (
        <View style={styles.warning}>
          <View style={styles.warningHead}>
            <Feather name="alert-triangle" size={15} color={styles.warningTitle.color} />
            <Text style={styles.warningTitle}>{t('summary.warnings')}</Text>
          </View>
          {warnings.map((w, i) => (
            <Text key={i} style={styles.warningText}>
              • {w}
            </Text>
          ))}
        </View>
      )}

      <GradientCard>
        <View style={styles.execHead}>
          <Feather name="loader" size={15} color="rgba(255,255,255,0.9)" />
          <Text style={styles.execLabel}>{t('summary.executive')}</Text>
        </View>
        <Text style={styles.execText} selectable>
          {summary.overview}
        </Text>
      </GradientCard>

      {tiles.length > 0 && (
        <View style={styles.tiles}>
          {tiles.map((d, i) => (
            <View key={i} style={styles.tile}>
              <Text style={styles.tileLabel} numberOfLines={1}>
                {shortLabel(d.label)}
              </Text>
              <View style={styles.tileValueRow}>
                {isPositiveStatus(d.value) && <View style={styles.dot} />}
                <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {d.value}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {summary.keyPoints.length > 0 && (
        <Card title={t('summary.keyPoints')}>
          {summary.keyPoints.map((point, i) => (
            <View key={i} style={styles.point}>
              <View style={styles.number}>
                <Text style={styles.numberText}>{i + 1}</Text>
              </View>
              <Text style={styles.pointText} selectable>
                {point}
              </Text>
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    container: { paddingHorizontal: PAGE_X, paddingTop: spacing.sm, gap: spacing.md, paddingBottom: STICKY_SPACE },
    warning: { backgroundColor: c.warningSoft, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs },
    warningHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    warningTitle: { ...type.label, color: c.warning },
    warningText: { ...type.small, color: c.warning },
    execHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
    execLabel: { ...type.caption, color: 'rgba(255,255,255,0.9)' },
    execText: { ...type.bodyStrong, color: '#FFFFFF', fontSize: 17, lineHeight: 25 },
    tiles: { flexDirection: 'row', gap: spacing.sm },
    tile: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: radius.md + 4,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      gap: 2,
    },
    tileLabel: { ...type.small, fontSize: 12, color: c.textMuted },
    tileValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    tileValue: { ...type.bodyStrong, fontSize: 16, color: c.text, flexShrink: 1 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.success },
    point: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
    number: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    numberText: { ...type.label, fontSize: 12, color: c.accentText },
    pointText: { ...type.body, color: c.text, flex: 1 },
  }),
);
