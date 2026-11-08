import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { generateInsights, reanalyzeText, translateDocument } from '../api/client';
import { BottomSheet, SheetOption } from '../components/BottomSheet';
import { Button } from '../components/Button';
import { useTextStyles } from '../components/Card';
import { ChatView } from '../components/ChatView';
import { CopyButton } from '../components/CopyButton';
import { DataTab } from '../components/tabs/DataTab';
import { InsightsTab } from '../components/tabs/InsightsTab';
import { SummaryTab } from '../components/tabs/SummaryTab';
import { TextTab } from '../components/tabs/TextTab';
import { Pill, RoundButton, ScreenHeader } from '../components/ui';
import { TRANSLATION_LANGUAGES, type StringKey, type TranslationCode } from '../i18n/strings';
import { useT } from '../settings/SettingsContext';
import { saveDocument } from '../storage/history';
import { fonts, makeStyles, PAGE_X, radius, spacing, type, useColors } from '../theme';
import type { ChatMessage, InsightMode, Insights, ScannedDocument, ViewLanguage } from '../types';
import { docStyle } from '../utils/docStyle';
import { exportExcel, exportPdf, hasTabularData, shareAsText } from '../utils/exporters';

type TabKey = 'summary' | 'data' | 'insights' | 'text';
const TABS: { key: TabKey; label: StringKey }[] = [
  { key: 'summary', label: 'result.tab.summary' },
  { key: 'data', label: 'result.tab.data' },
  { key: 'insights', label: 'result.tab.insights' },
  { key: 'text', label: 'result.tab.text' },
];

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

type Props = {
  initialDoc: ScannedDocument;
  onBack: () => void;
  chatOpen: boolean;
  onChatOpenChange: (open: boolean) => void;
};

export function ResultScreen({ initialDoc, onBack, chatOpen, onChatOpenChange }: Props) {
  const t = useT();
  const styles = useStyles();
  const text = useTextStyles();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [doc, setDoc] = useState(initialDoc);
  const [tab, setTab] = useState<TabKey>('summary');
  const [viewLang, setViewLang] = useState<ViewLanguage>('original');
  const [translating, setTranslating] = useState<TranslationCode | null>(null);
  const [sheet, setSheet] = useState<'export' | 'translate' | null>(null);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  // Siempre guardamos sobre la versión más reciente del documento
  const docRef = useRef(doc);
  const persist = (patch: (d: ScannedDocument) => ScannedDocument) => {
    const next = patch(docRef.current);
    docRef.current = next;
    setDoc(next);
    saveDocument(next).catch(() => {});
  };

  const analysis = (viewLang !== 'original' && doc.translations?.[viewLang]) || doc.analysis;
  const style = docStyle(analysis.documentType);

  const insightsForView = useMemo(() => {
    const result: Partial<Record<InsightMode, Insights>> = {};
    for (const [key, value] of Object.entries(doc.insights ?? {})) {
      const [mode, lang] = key.split(':');
      if (lang === viewLang) result[mode as InsightMode] = value;
    }
    return result;
  }, [doc.insights, viewLang]);

  // --- Traducción ---------------------------------------------------------
  const selectLanguage = async (lang: ViewLanguage) => {
    if (lang === 'original' || doc.translations?.[lang]) {
      setViewLang(lang);
      setSheet(null);
      return;
    }
    setTranslating(lang);
    try {
      const translated = await translateDocument(doc.analysis, lang);
      persist((d) => ({ ...d, translations: { ...d.translations, [lang]: translated } }));
      setViewLang(lang);
      setSheet(null);
    } catch (err) {
      Alert.alert(t('result.translateError'), (err as Error).message);
    } finally {
      setTranslating(null);
    }
  };

  // --- Acciones de las pestañas ------------------------------------------
  const updateChat = (chat: ChatMessage[]) => persist((d) => ({ ...d, chat }));

  const runInsights = async (mode: InsightMode) => {
    const lang = viewLang;
    const insights = await generateInsights(analysis, mode);
    persist((d) => ({ ...d, insights: { ...d.insights, [`${mode}:${lang}`]: insights } }));
  };

  const regenerate = async (transcription: string) => {
    const updated = await reanalyzeText(transcription);
    // Las traducciones y análisis anteriores ya no corresponden al texto nuevo
    persist((d) => ({ ...d, analysis: updated, translations: {}, insights: {} }));
    setViewLang('original');
  };

  // --- Exportar ----------------------------------------------------------
  const runExport = async (kind: 'pdf' | 'excel' | 'text') => {
    if (exporting) return;
    // El menú de compartir no se abre bien mientras el panel se está cerrando (iOS y Android):
    // esperamos a que termine la animación
    const wasOpen = sheet !== null;
    setSheet(null);
    if (wasOpen) await new Promise((r) => setTimeout(r, Platform.OS === 'ios' ? 450 : 350));
    try {
      if (kind === 'text') {
        await shareAsText(analysis, t);
        return;
      }
      setExporting(kind);
      if (kind === 'pdf') await exportPdf(analysis, Object.values(insightsForView), t);
      else await exportExcel(analysis, t);
    } catch (err) {
      console.warn('[export]', err);
      Alert.alert(t('export.error'), (err as Error).message);
    } finally {
      setExporting(null);
    }
  };

  // --- Pantalla de chat ----------------------------------------------------
  if (chatOpen) {
    return (
      <ChatView analysis={doc.analysis} messages={doc.chat} onChange={updateChat} onBack={() => onChatOpenChange(false)} />
    );
  }

  const dataCount = analysis.keyData.length + analysis.tables.length;
  const langLabel =
    viewLang === 'original' ? t('result.original') : TRANSLATION_LANGUAGES.find((l) => l.code === viewLang)?.name ?? '';
  const pagesLabel = t('common.pagesShort', { n: doc.pages.length });
  const allData = analysis.keyData.map((d) => `${d.label}: ${d.value}`).join('\n');

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title={tab === 'summary' ? t('result.documentLabel') : analysis.title}
          subtitle={tab === 'summary' ? undefined : `${capitalize(analysis.documentType)} · ${pagesLabel}`}
          left={<RoundButton icon="chevron-left" label={t('common.back')} onPress={onBack} />}
          right={
            exporting ? (
              <View style={styles.spinnerButton}>
                <ActivityIndicator color={c.text} />
              </View>
            ) : (
              <RoundButton icon="share" label={t('result.export')} onPress={() => setSheet('export')} />
            )
          }
        />
      </View>

      {tab === 'summary' && (
        <View style={styles.titleBox}>
          <Text style={text.display} numberOfLines={3}>
            {analysis.title}
          </Text>
          <View style={styles.badges}>
            <Pill
              label={langLabel}
              tone="ink"
              icon="globe"
              trailingIcon="chevron-down"
              size="sm"
              onPress={() => setSheet('translate')}
              style={styles.badge}
            />
            <Pill label={capitalize(analysis.documentType)} tone={style.tone} size="sm" style={styles.badge} />
            <Pill label={pagesLabel} tone="light" size="sm" style={styles.badge} />
          </View>
        </View>
      )}

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TABS.map((item) => {
            const active = tab === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setTab(item.key)}
                style={[styles.tab, active && styles.tabActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{t(item.label)}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    headerWrap: { paddingHorizontal: PAGE_X, paddingTop: spacing.sm },
    spinnerButton: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleBox: { paddingHorizontal: PAGE_X, gap: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.sm },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    badge: { paddingVertical: 8, paddingHorizontal: 14 },
    tabs: { paddingHorizontal: PAGE_X, gap: spacing.sm, paddingVertical: spacing.md },
    tab: {
      height: 46,
      paddingHorizontal: spacing.xl,
      borderRadius: radius.pill,
      backgroundColor: c.surface,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    tabActive: { backgroundColor: c.ink },
    tabText: { ...type.label, fontSize: 15, color: c.text },
    tabTextActive: { color: c.onInk, fontFamily: fonts.bold },
    count: {
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      paddingHorizontal: 6,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    countActive: { backgroundColor: c.onInk },
    countText: { ...type.label, fontSize: 11, lineHeight: 14, color: c.accentText },
    countTextActive: { color: c.ink },
    content: { flex: 1 },
    sticky: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: PAGE_X, paddingTop: spacing.xxl },
    stickyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    flex: { flex: 1, minHeight: 64 },
  }),
);

