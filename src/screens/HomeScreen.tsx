import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BOTTOM_NAV_SPACE } from '../components/BottomNav';
import { Button } from '../components/Button';
import { useTextStyles } from '../components/Card';
import { GradientCard, Pill, RoundButton, SectionTitle, toneColors } from '../components/ui';
import { useSettings } from '../settings/SettingsContext';
import { deleteDocument, loadHistory } from '../storage/history';
import { fonts, makeStyles, PAGE_X, radius, spacing, type, useColors } from '../theme';
import type { PageInput, ScannedDocument } from '../types';
import { docStyle } from '../utils/docStyle';
import { formatDate } from '../utils/exportText';
import { MAX_PAGES, pickImages, pickPdf } from '../utils/pickers';

const RECENT_LIMIT = 5;

type Props = {
  mode: 'home' | 'library';
  onScan: () => void;
  onImportImages: (pages: PageInput[]) => void;
  onImportPdf: (page: PageInput) => void;
  onOpen: (doc: ScannedDocument) => void;
  onSettings: () => void;
  onSeeAll: () => void;
};

/** Normaliza para buscar sin tildes ni mayúsculas */
const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function HomeScreen({ mode, onScan, onImportImages, onImportPdf, onOpen, onSettings, onSeeAll }: Props) {
  const { t } = useSettings();
  const styles = useStyles();
  const text = useTextStyles();
  const c = useColors();
  const [history, setHistory] = useState<ScannedDocument[]>([]);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);

  const refresh = useCallback(() => {
    loadHistory().then(setHistory);
  }, []);
  useEffect(refresh, [refresh]);

  // Tipos de documento presentes en el historial, para los filtros rápidos
  const types = useMemo(() => {
    const seen = new Map<string, string>();
    history.forEach((d) => {
      const key = normalize(d.analysis.documentType);
      if (!seen.has(key)) seen.set(key, capitalize(d.analysis.documentType));
    });
    return [...seen.entries()];
  }, [history]);

  const filtered = useMemo(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    return history.filter((d) => {
      if (typeFilter && normalize(d.analysis.documentType) !== typeFilter) return false;
      if (words.length === 0) return true;
      const a = d.analysis;
      const haystack = normalize(
        [
          a.title,
          a.documentType,
          a.summary.overview,
          ...a.summary.keyPoints,
          ...a.keyData.map((k) => `${k.label} ${k.value}`),
          a.transcription,
        ].join(' '),
      );
      return words.every((w) => haystack.includes(w));
    });
  }, [history, query, typeFilter]);

  const isSearching = query.trim().length > 0 || typeFilter !== null;
  const visible = mode === 'home' && !isSearching ? filtered.slice(0, RECENT_LIMIT) : filtered;

  const importImages = async () => {
    const pages = await pickImages(MAX_PAGES);
    if (pages.length) onImportImages(pages);
  };

  const importPdf = async () => {
    const picked = await pickPdf();
    if (!picked) return;
    if (picked.tooLarge) Alert.alert(t('home.pdfTooLarge'), t('home.pdfTooLargeText'));
    else onImportPdf(picked.page);
  };

  const confirmDelete = (doc: ScannedDocument) => {
    Alert.alert(t('home.deleteTitle'), t('home.deleteConfirm', { title: doc.analysis.title }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteDocument(doc.id).then(refresh) },
    ]);
  };

  const searchRow =
    history.length > 0 ? (
      <View style={styles.searchRow}>
        <View style={styles.search}>
          <Feather name="search" size={19} color={c.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('home.search')}
            placeholderTextColor={c.textMuted}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10}>
              <Feather name="x" size={18} color={c.textMuted} />
            </Pressable>
          ) : null}
        </View>
        <RoundButton icon="filter" label={t('home.filter')} variant="ink" size={56} onPress={() => setShowFilters((v) => !v)}>
          <Ionicons name="filter" size={22} color={c.onInk} />
        </RoundButton>
      </View>
    ) : null;

  const chips =
    showFilters && types.length > 1 ? (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipsScroll}>
        <Chip label={t('home.filterAll')} active={typeFilter === null} onPress={() => setTypeFilter(null)} />
        {types.map(([key, label]) => (
          <Chip key={key} label={label} active={typeFilter === key} onPress={() => setTypeFilter(typeFilter === key ? null : key)} />
        ))}
      </ScrollView>
    ) : null;

  const header =
    mode === 'home' ? (
      <View style={styles.header}>
        <View style={styles.topRow}>
          <View>
            <Text style={text.small}>{t('home.greeting')}</Text>
            <Text style={text.brand}>Clarify</Text>
          </View>
          <RoundButton icon="sliders" label={t('home.settings')} onPress={onSettings} size={56}>
            <Ionicons name="options-outline" size={24} color={c.text} />
          </RoundButton>
        </View>

        <GradientCard>
          <View style={{ gap: spacing.md }}>
            <Pill label={t('home.heroBadge')} tone="glass" size="sm" />
            <Text style={styles.heroTitle}>{t('home.heroTitle')}</Text>
            <Text style={styles.heroText}>{t('home.heroText', { max: MAX_PAGES })}</Text>
            <Pressable
              onPress={onScan}
              accessibilityRole="button"
              accessibilityLabel={t('home.scan')}
              style={({ pressed }) => [styles.heroButton, pressed && { opacity: 0.9 }]}
            >
              <Ionicons name="scan-outline" size={20} color="#FFFFFF" />
              <Text style={styles.heroButtonText}>{t('home.scan')}</Text>
              <View style={styles.heroArrow}>
                <Feather name="arrow-right" size={20} color="#1B1A19" />
              </View>
            </Pressable>
          </View>
        </GradientCard>

        <View style={styles.row}>
          <Button title={t('home.photos')} icon="image" variant="light" onPress={importImages} style={styles.flex} />
          <Button title={t('home.pdf')} icon="file" variant="light" onPress={importPdf} style={styles.flex} />
        </View>

        {searchRow}

        <View style={{ marginTop: spacing.sm }}>
          <SectionTitle
            title={t('home.recent')}
            action={filtered.length > RECENT_LIMIT ? t('home.seeAll') : undefined}
            onAction={onSeeAll}
          />
        </View>
        {chips}
      </View>
    ) : (
      <View style={styles.header}>
        <View style={styles.topRow}>
          <View>
            <Text style={text.display}>{t('library.title')}</Text>
            <Text style={text.small}>
              {history.length === 1 ? t('library.countOne') : t('library.countMany', { n: history.length })}
            </Text>
          </View>
          <RoundButton icon="plus" label={t('home.scan')} variant="ink" onPress={onScan} size={56} />
        </View>
        {searchRow}
        {chips}
      </View>
    );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <FlatList
        data={visible}
        keyExtractor={(d) => d.id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name={isSearching ? 'search' : 'inbox'} size={28} color={c.textMuted} />
            <Text style={[text.small, { textAlign: 'center' }]}>{isSearching ? t('home.noResults') : t('home.empty')}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <DocumentRow doc={item} onPress={() => onOpen(item)} onLongPress={() => confirmDelete(item)} />
        )}
        ListFooterComponent={
          visible.length > 0 ? <Text style={[text.small, styles.hint]}>{t('home.deleteHint')}</Text> : undefined
        }
      />
    </SafeAreaView>
  );
}

function DocumentRow({ doc, onPress, onLongPress }: { doc: ScannedDocument; onPress: () => void; onLongPress: () => void }) {
  const { t, settings } = useSettings();
  const styles = useStyles();
  const c = useColors();
  const style = docStyle(doc.analysis.documentType);
  const tone = toneColors(c, style.tone);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.item, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}
    >
      <LinearGradient colors={style.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tile}>
        <Feather name={style.icon} size={26} color={tone.fg} />
      </LinearGradient>
      <View style={styles.itemBody}>
        <Pill label={capitalize(doc.analysis.documentType)} tone={style.tone} size="sm" />
        <Text style={styles.itemTitle} numberOfLines={1}>
          {doc.analysis.title}
        </Text>
        <Text style={styles.itemMeta} numberOfLines={1}>
          {t('common.pagesShort', { n: doc.pages.length })} · {formatDate(doc.createdAt, settings.language)}
        </Text>
      </View>
    </Pressable>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const styles = useStyles();
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    list: { paddingHorizontal: PAGE_X, paddingBottom: BOTTOM_NAV_SPACE + spacing.lg },
    header: { gap: spacing.lg, marginBottom: spacing.md, paddingTop: spacing.md },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    heroTitle: { ...type.display, color: '#FFFFFF', fontSize: 27, lineHeight: 33 },
    heroText: { ...type.small, color: 'rgba(255,255,255,0.88)' },
    heroButton: {
      marginTop: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: 'rgba(60,22,10,0.55)',
      borderRadius: radius.pill,
      paddingLeft: spacing.xl,
      paddingRight: 6,
      height: 62,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.18)',
    },
    heroButtonText: { ...type.bodyStrong, color: '#FFFFFF', flex: 1, fontSize: 16 },
    heroArrow: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    row: { flexDirection: 'row', gap: spacing.md },
    flex: { flex: 1 },
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    search: {
      flex: 1,
      height: 56,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: c.surface,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.xl,
    },
    searchInput: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: c.text, paddingVertical: 0 },
    chipsScroll: { marginHorizontal: -PAGE_X },
    chips: { gap: spacing.sm, paddingHorizontal: PAGE_X },
    chip: {
      paddingHorizontal: spacing.lg + 2,
      height: 42,
      justifyContent: 'center',
      borderRadius: radius.pill,
      backgroundColor: c.surface,
    },
    chipActive: { backgroundColor: c.ink },
    chipText: { ...type.label, color: c.text },
    chipTextActive: { color: c.onInk, fontFamily: fonts.bold },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      backgroundColor: c.surface,
      padding: spacing.md,
      borderRadius: radius.lg,
    },
    tile: { width: 76, height: 76, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    itemBody: { flex: 1, gap: 4 },
    itemTitle: { ...type.bodyStrong, fontSize: 16, color: c.text },
    itemMeta: { ...type.small, fontSize: 12, color: c.textMuted },
    empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
    hint: { textAlign: 'center', marginTop: spacing.lg, fontSize: 12 },
  }),
);
