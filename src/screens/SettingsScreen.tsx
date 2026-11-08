import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL, checkHealth } from '../api/client';
import { BOTTOM_NAV_SPACE } from '../components/BottomNav';
import { Button, type FeatherName } from '../components/Button';
import { Card, useTextStyles } from '../components/Card';
import type { AppLanguage } from '../i18n/strings';
import { useSettings, type ThemePreference } from '../settings/SettingsContext';
import { fonts, makeStyles, PAGE_X, radius, spacing, type, useColors } from '../theme';

export function SettingsScreen() {
  const { settings, update, t } = useSettings();
  const styles = useStyles();
  const text = useTextStyles();
  const c = useColors();
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  const languages: { value: AppLanguage; label: string }[] = [
    { value: 'es', label: 'Español' },
    { value: 'en', label: 'English' },
  ];
  const themes: { value: ThemePreference; label: string; icon: FeatherName }[] = [
    { value: 'system', label: t('settings.theme.system'), icon: 'smartphone' },
    { value: 'light', label: t('settings.theme.light'), icon: 'sun' },
    { value: 'dark', label: t('settings.theme.dark'), icon: 'moon' },
  ];

  const test = async () => {
    setTesting(true);
    setStatus(null);
    try {
      const health = await checkHealth();
      setStatus(
        health.hasApiKey
          ? { ok: true, message: t('settings.testOk', { model: health.model }) }
          : { ok: false, message: t('settings.testNoKey') },
      );
    } catch (err) {
      setStatus({ ok: false, message: (err as Error).message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={text.display}>{t('settings.title')}</Text>

        <Card title={t('settings.language')}>
          <Segmented options={languages} value={settings.language} onChange={(language) => update({ language })} />
          <Text style={text.small}>{t('settings.languageNote')}</Text>
        </Card>

        <Card title={t('settings.theme')}>
          <Segmented options={themes} value={settings.theme} onChange={(theme) => update({ theme })} />
        </Card>

        <Card title={t('settings.server')}>
          <View style={styles.server}>
            <Feather name="server" size={16} color={c.textMuted} />
            <Text style={styles.mono} selectable numberOfLines={1}>
              {API_BASE_URL}
            </Text>
          </View>
          <Button title={t('settings.test')} icon="wifi" variant="soft" onPress={test} loading={testing} />
          {status && (
            <View style={[styles.status, { backgroundColor: status.ok ? c.successSoft : c.dangerSoft }]}>
              <Feather name={status.ok ? 'check-circle' : 'alert-circle'} size={16} color={status.ok ? c.success : c.danger} />
              <Text style={[text.small, { color: status.ok ? c.success : c.danger, flex: 1 }]}>{status.message}</Text>
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon?: FeatherName }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const styles = useStyles();
  const c = useColors();
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.segment, active && styles.segmentActive]}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
          >
            {o.icon ? <Feather name={o.icon} size={15} color={active ? c.onInk : c.textMuted} /> : null}
            <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: PAGE_X, paddingTop: spacing.lg, gap: spacing.md, paddingBottom: BOTTOM_NAV_SPACE + spacing.lg },
    server: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: c.surfaceMuted,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    mono: { fontFamily: 'monospace', fontSize: 14, color: c.text, flex: 1 },
    status: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md },
    segmented: { flexDirection: 'row', backgroundColor: c.surfaceMuted, borderRadius: radius.pill, padding: 4 },
    segment: {
      flex: 1,
      height: 44,
      flexDirection: 'row',
      gap: 6,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
    },
    segmentActive: { backgroundColor: c.ink },
    segmentText: { ...type.label, color: c.textMuted },
    segmentTextActive: { color: c.onInk, fontFamily: fonts.bold },
  }),
);
