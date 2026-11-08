import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, type FeatherName } from '../components/Button';
import { useTextStyles } from '../components/Card';
import { PageEditor } from '../components/PageEditor';
import { RoundButton, ScreenHeader } from '../components/ui';
import { useT } from '../settings/SettingsContext';
import { makeStyles, PAGE_X, radius, spacing, type, useColors } from '../theme';
import type { PageInput } from '../types';
import { MAX_PAGES, pickImages } from '../utils/pickers';

type Props = {
  pages: PageInput[];
  onChange: (pages: PageInput[]) => void;
  onAddWithCamera: () => void;
  onAnalyze: () => void;
  onDiscard: () => void;
};

export function ReviewScreen({ pages, onChange, onAddWithCamera, onAnalyze, onDiscard }: Props) {
  const t = useT();
  const styles = useStyles();
  const text = useTextStyles();
  const insets = useSafeAreaInsets();
  const [editing, setEditing] = useState<number | null>(null);
  const full = pages.length >= MAX_PAGES;

  const move = (from: number, to: number) => {
    if (to < 0 || to >= pages.length) return;
    const next = [...pages];
    [next[from], next[to]] = [next[to], next[from]];
    onChange(next);
  };

  const remove = (index: number) => onChange(pages.filter((_, i) => i !== index));

  const addPhotos = async () => {
    const more = await pickImages(MAX_PAGES - pages.length, pages.length);
    if (more.length) onChange([...pages, ...more]);
  };

  const discard = () => {
    Alert.alert(t('review.discardTitle'), t('review.discardText'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('review.discard'), style: 'destructive', onPress: onDiscard },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title={`${pages.length}/${MAX_PAGES}`}
          left={<RoundButton icon="x" label={t('common.cancel')} onPress={discard} />}
        />
      </View>
      <View style={styles.titleBox}>
        <Text style={text.display}>{t('review.title')}</Text>
        <Text style={text.small}>{t('review.subtitle')}</Text>
      </View>

      <FlatList
        data={pages}
        numColumns={2}
        keyExtractor={(p, i) => p.uri + i}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={{ gap: spacing.md }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={[text.small, { textAlign: 'center' }]}>{t('review.empty')}</Text>}
        renderItem={({ item, index }) => (
          <View style={styles.card}>
            <Pressable onPress={() => setEditing(index)}>
              <Image source={{ uri: item.uri }} style={styles.image} resizeMode="cover" />
              <View style={styles.pageBadge}>
                <Text style={styles.pageBadgeText}>{t('review.page', { n: index + 1 })}</Text>
              </View>
            </Pressable>
            <View style={styles.actions}>
              <IconButton icon="crop" onPress={() => setEditing(index)} label={t('review.edit')} />
              <IconButton icon="chevron-left" onPress={() => move(index, index - 1)} disabled={index === 0} label="◀" />
              <IconButton
                icon="chevron-right"
                onPress={() => move(index, index + 1)}
                disabled={index === pages.length - 1}
                label="▶"
              />
              <IconButton icon="trash-2" onPress={() => remove(index)} label={t('common.delete')} danger />
            </View>
          </View>
        )}
      />

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <View style={styles.row}>
          <Button title={t('review.addCamera')} icon="camera" variant="light" onPress={onAddWithCamera} disabled={full} style={styles.flex} />
          <Button title={t('review.addPhotos')} icon="image" variant="light" onPress={addPhotos} disabled={full} style={styles.flex} />
        </View>
        <Button title={t('review.analyze', { n: pages.length })} trailingArrow onPress={onAnalyze} disabled={pages.length === 0} />
      </View>

      {editing !== null && pages[editing] && (
        <PageEditor
          page={pages[editing]}
          onCancel={() => setEditing(null)}
          onSave={(page) => {
            onChange(pages.map((p, i) => (i === editing ? page : p)));
            setEditing(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

function IconButton({
  icon,
  onPress,
  disabled,
  label,
  danger,
}: {
  icon: FeatherName;
  onPress: () => void;
  disabled?: boolean;
  label: string;
  danger?: boolean;
}) {
  const styles = useStyles();
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.iconButton, (pressed || disabled) && { opacity: disabled ? 0.3 : 0.7 }]}
    >
      <Feather name={icon} size={17} color={danger ? c.danger : c.text} />
    </Pressable>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    headerWrap: { paddingHorizontal: PAGE_X, paddingTop: spacing.sm },
    titleBox: { paddingHorizontal: PAGE_X, gap: spacing.xs, marginVertical: spacing.md },
    grid: { paddingHorizontal: PAGE_X, paddingBottom: spacing.lg, gap: spacing.md },
    card: { flex: 1, maxWidth: '50%', backgroundColor: c.surface, borderRadius: radius.lg, overflow: 'hidden' },
    image: { width: '100%', aspectRatio: 3 / 4, backgroundColor: c.surfaceMuted },
    pageBadge: {
      position: 'absolute',
      left: spacing.sm,
      top: spacing.sm,
      backgroundColor: 'rgba(27,26,25,0.75)',
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
    },
    pageBadgeText: { ...type.label, fontSize: 12, lineHeight: 16, color: '#FFFFFF' },
    actions: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.xs },
    iconButton: { padding: spacing.sm + 2, borderRadius: radius.pill },
    footer: { paddingHorizontal: PAGE_X, paddingTop: spacing.md, gap: spacing.md },
    row: { flexDirection: 'row', gap: spacing.md },
    flex: { flex: 1 },
  }),
);
