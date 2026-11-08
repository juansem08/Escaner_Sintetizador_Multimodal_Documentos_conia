import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useT } from '../../settings/SettingsContext';
import { fonts, makeStyles, PAGE_X, radius, spacing, type, useColors } from '../../theme';
import type { DocumentAnalysis } from '../../types';
import { Button } from '../Button';
import { Card, useTextStyles } from '../Card';
import { CopyButton } from '../CopyButton';

type Props = {
  analysis: DocumentAnalysis;
  isTranslation: boolean;
  onRegenerate: (transcription: string) => Promise<void>;
};

export function TextTab({ analysis, isTranslation, onRegenerate }: Props) {
  const t = useT();
  const styles = useStyles();
  const text = useTextStyles();
  const c = useColors();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(analysis.transcription);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEditing = () => {
    setDraft(analysis.transcription);
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    if (draft.trim() === analysis.transcription.trim()) {
      setError(t('text.unchanged'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onRegenerate(draft.trim());
      setEditing(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.editContainer}>
          <Text style={text.small}>{t('text.editHint')}</Text>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            multiline
            editable={!saving}
            textAlignVertical="top"
            style={styles.input}
            placeholderTextColor={c.textMuted}
            autoCorrect={false}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.row}>
            <Button title={t('common.cancel')} variant="light" onPress={() => setEditing(false)} disabled={saving} style={{ flex: 1 }} />
            <Button
              title={saving ? t('text.regenerating') : t('text.save')}
              icon="refresh-cw"
              onPress={save}
              loading={saving}
              style={{ flex: 2 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Card title={t('text.title')} right={<CopyButton value={analysis.transcription} />}>
        <Text style={styles.transcription} selectable>
          {analysis.transcription}
        </Text>
      </Card>

      {isTranslation ? (
        <View style={styles.note}>
          <Feather name="info" size={15} color={c.textMuted} />
          <Text style={[text.small, { flex: 1 }]}>{t('text.translatedNote')}</Text>
        </View>
      ) : (
        <Button title={t('text.edit')} icon="edit-3" onPress={startEditing} />
      )}
      <Button
        title={t('text.share')}
        icon="share"
        variant="light"
        onPress={() => Share.share({ title: analysis.title, message: analysis.transcription }).catch(() => {})}
      />
      <Text style={[text.small, styles.center]}>{t('text.selectHint')}</Text>
    </ScrollView>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    container: { paddingHorizontal: PAGE_X, paddingTop: spacing.sm, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
    transcription: { ...type.body, fontSize: 14, lineHeight: 21, color: c.text },
    editContainer: { flex: 1, paddingHorizontal: PAGE_X, paddingTop: spacing.sm, paddingBottom: spacing.lg, gap: spacing.md },
    input: {
      flex: 1,
      backgroundColor: c.surface,
      borderWidth: 1.5,
      borderColor: c.accent,
      borderRadius: radius.lg,
      padding: spacing.lg,
      fontFamily: fonts.medium,
      fontSize: 14,
      lineHeight: 21,
      color: c.text,
    },
    error: { ...type.small, color: c.danger, backgroundColor: c.dangerSoft, padding: spacing.md, borderRadius: radius.md },
    row: { flexDirection: 'row', gap: spacing.sm },
    note: {
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
    },
    center: { textAlign: 'center' },
  }),
);
