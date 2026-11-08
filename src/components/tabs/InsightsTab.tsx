import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { StringKey } from '../../i18n/strings';
import { useT } from '../../settings/SettingsContext';
import { gradients, makeStyles, PAGE_X, radius, spacing, type, useColors } from '../../theme';
import type { DocumentAnalysis, InsightLevel, InsightMode, Insights } from '../../types';
import { Button, type FeatherName } from '../Button';
import { Card, useTextStyles } from '../Card';
import { GradientCard } from '../ui';

const MODES: { mode: InsightMode; icon: FeatherName }[] = [
  { mode: 'contract', icon: 'briefcase' },
  { mode: 'study', icon: 'book-open' },
  { mode: 'invoice', icon: 'file-text' },
  { mode: 'general', icon: 'search' },
];

/** Propone un modo según el tipo de documento que detectó la IA */
export function suggestMode(documentType: string): InsightMode {
  const t = documentType.toLowerCase();
  if (/contrat|contract|acuerdo|agreement|arrend|lease|convenio|t[eé]rminos|terms/.test(t)) return 'contract';
  if (/factur|invoice|recibo|receipt|ticket|presupuesto|quote|bill|cuenta|comprobante|pago/.test(t)) return 'invoice';
  if (/apunte|nota|note|libro|book|p[aá]gina|page|estudio|study|clase|lecture|lecci|ensayo|essay/.test(t)) return 'study';
  return 'general';
}

type Props = {
  analysis: DocumentAnalysis;
  insights: Partial<Record<InsightMode, Insights>>;
  onGenerate: (mode: InsightMode) => Promise<void>;
};

export function InsightsTab({ analysis, insights, onGenerate }: Props) {
  const t = useT();
  const styles = useStyles();
  const text = useTextStyles();
  const c = useColors();
  const suggested = suggestMode(analysis.documentType);
  const [mode, setMode] = useState<InsightMode>(() => MODES.find((m) => insights[m.mode])?.mode ?? suggested);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = insights[mode];

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      await onGenerate(mode);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={text.small}>{t('insights.intro')}</Text>
      <View style={styles.modes}>
        {MODES.map(({ mode: m, icon }) => {
          const active = mode === m;
          return (
            <Pressable
              key={m}
              onPress={() => !loading && setMode(m)}
              style={({ pressed }) => [styles.mode, active && styles.modeActive, pressed && { opacity: 0.9 }]}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
            >
              <View style={styles.modeTop}>
                <View style={[styles.modeIcon, active && styles.modeIconActive]}>
                  <Feather name={icon} size={18} color={active ? c.ink : c.accentText} />
                </View>
                {insights[m] ? (
                  <Feather name="check-circle" size={16} color={active ? c.onInk : c.success} />
                ) : m === suggested ? (
                  <View style={[styles.suggested, active && { backgroundColor: c.onInk }]}>
                    <Text style={[styles.suggestedText, active && { color: c.ink }]}>{t('insights.suggested')}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.modeLabel, active && { color: c.onInk }]}>{t(`insights.mode.${m}` as StringKey)}</Text>
              <Text style={[styles.modeDesc, active && { color: c.onInk, opacity: 0.7 }]} numberOfLines={2}>
                {t(`insights.mode.${m}.desc` as StringKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {loading ? (
        <Card>
          <View style={styles.loading}>
            <ActivityIndicator color={c.accent} />
            <Text style={text.small}>{t('insights.generating')}</Text>
          </View>
        </Card>
      ) : current ? (
        <InsightsView insights={current} mode={mode} />
      ) : (
        <Button title={t('insights.generate')} icon="zap" trailingArrow onPress={generate} />
      )}

      {current && !loading && <Button title={t('insights.regenerate')} icon="refresh-cw" variant="light" onPress={generate} />}
    </ScrollView>
  );
}

function InsightsView({ insights, mode }: { insights: Insights; mode: InsightMode }) {
  const t = useT();
  const styles = useStyles();

  return (
    <View style={{ gap: spacing.md }}>
      {insights.headline ? (
        <GradientCard>
          <Text style={styles.headline}>{insights.headline}</Text>
        </GradientCard>
      ) : null}

      {insights.flashcards.length > 0 && <Flashcards cards={insights.flashcards} />}

      {insights.sections.map((section, i) => (
        <Card key={i} title={section.heading}>
          {section.items.map((item, j) => (
            <View key={j} style={styles.item}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <LevelBadge level={item.level} />
              </View>
              {item.detail ? (
                <Text style={styles.itemDetail} selectable>
                  {item.detail}
                </Text>
              ) : null}
            </View>
          ))}
        </Card>
      ))}

      {(mode === 'contract' || mode === 'invoice') && <Text style={styles.disclaimer}>{t('insights.disclaimer')}</Text>}
    </View>
  );
}

function LevelBadge({ level }: { level: InsightLevel }) {
  const t = useT();
  const c = useColors();
  const styles = useStyles();
  if (level === 'info') return null;
  const palette = {
    high: { bg: c.dangerSoft, fg: c.danger },
    medium: { bg: c.warningSoft, fg: c.warning },
    low: { bg: c.successSoft, fg: c.success },
  }[level];
  return (
    <View style={[styles.level, { backgroundColor: palette.bg }]}>
      <Text style={[styles.levelText, { color: palette.fg }]}>{t(`insights.level.${level}` as StringKey)}</Text>
    </View>
  );
}

function Flashcards({ cards }: { cards: Insights['flashcards'] }) {
  const t = useT();
  const styles = useStyles();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[Math.min(index, cards.length - 1)];

  const go = (delta: number) => {
    setFlipped(false);
    setIndex((i) => (i + delta + cards.length) % cards.length);
  };

  return (
    <Card title={t('insights.flashcards')}>
      <Pressable onPress={() => setFlipped((f) => !f)} style={({ pressed }) => pressed && { opacity: 0.92 }}>
        {flipped ? (
          <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.flashcard}>
            <Text style={[styles.flashcardText, { color: '#FFFFFF' }]}>{card.answer}</Text>
          </LinearGradient>
        ) : (
          <View style={[styles.flashcard, styles.flashcardFront]}>
            <Text style={styles.flashcardText}>{card.question}</Text>
          </View>
        )}
      </Pressable>
      <Text style={[styles.disclaimer, { textAlign: 'center' }]}>
        {t('insights.flashcardCounter', { n: index + 1, total: cards.length })}
      </Text>
      <View style={styles.flashNav}>
        <Button title={t('insights.prev')} variant="light" onPress={() => go(-1)} style={{ flex: 1, backgroundColor: styles.navLight.backgroundColor }} />
        <Button title={t('insights.next')} onPress={() => go(1)} style={{ flex: 1 }} />
      </View>
    </Card>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    container: { paddingHorizontal: PAGE_X, paddingTop: spacing.sm, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
    modes: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    mode: {
      width: '48.5%',
      flexGrow: 1,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: 4,
    },
    modeActive: { backgroundColor: c.ink },
    modeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
    modeIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modeIconActive: { backgroundColor: c.onInk },
    modeLabel: { ...type.bodyStrong, fontSize: 16, color: c.text },
    modeDesc: { ...type.small, fontSize: 12, lineHeight: 16, color: c.textMuted },
    suggested: { backgroundColor: c.accentSoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
    suggestedText: { ...type.label, fontSize: 10, lineHeight: 14, color: c.accentText },
    loading: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
    error: { ...type.small, color: c.danger, backgroundColor: c.dangerSoft, padding: spacing.md, borderRadius: radius.md },
    headline: { ...type.bodyStrong, fontSize: 17, lineHeight: 25, color: '#FFFFFF' },
    item: { gap: spacing.xs, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.border },
    itemHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    itemTitle: { ...type.bodyStrong, color: c.text, flex: 1 },
    itemDetail: { ...type.small, color: c.textMuted, lineHeight: 19 },
    level: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
    levelText: { ...type.label, fontSize: 11, lineHeight: 14 },
    disclaimer: { ...type.small, fontSize: 12, color: c.textMuted },
    flashcard: { minHeight: 170, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
    flashcardFront: { backgroundColor: c.surfaceMuted },
    flashcardText: { ...type.heading, color: c.text, textAlign: 'center', lineHeight: 26 },
    flashNav: { flexDirection: 'row', gap: spacing.sm },
    navLight: { backgroundColor: c.surfaceMuted },
  }),
);
