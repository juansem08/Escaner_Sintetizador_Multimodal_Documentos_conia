import { Feather } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { analyzeDocument } from '../api/client';
import { Button } from '../components/Button';
import { useTextStyles } from '../components/Card';
import { GradientCard } from '../components/ui';
import type { StringKey } from '../i18n/strings';
import { useT } from '../settings/SettingsContext';
import { newId, saveDocument } from '../storage/history';
import { makeStyles, PAGE_X, radius, spacing, type, useColors } from '../theme';
import type { PageInput, ScannedDocument } from '../types';

const STEPS: StringKey[] = ['processing.step1', 'processing.step2', 'processing.step3', 'processing.step4', 'processing.step5'];

type Props = {
  pages: PageInput[];
  onCancel: () => void;
  onDone: (doc: ScannedDocument) => void;
};

export function ProcessingScreen({ pages, onCancel, onDone }: Props) {
  const t = useT();
  const styles = useStyles();
  const text = useTextStyles();
  const c = useColors();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setStep(0);
    analyzeDocument(pages)
      .then(async (analysis) => {
        const doc: ScannedDocument = { id: newId(), createdAt: Date.now(), pages, analysis, chat: [] };
        await saveDocument(doc);
        if (!cancelled) onDoneRef.current(doc);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [pages, attempt]);

  // Mensajes de progreso para que la espera se entienda
  useEffect(() => {
    if (error) return;
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 2800);
    return () => clearInterval(timer);
  }, [error, attempt]);

  return (
    <SafeAreaView style={styles.screen}>
      {error ? (
        <View style={styles.box}>
          <View style={styles.errorIcon}>
            <Feather name="alert-triangle" size={28} color={c.danger} />
          </View>
          <Text style={[text.title, styles.center]}>{t('processing.errorTitle')}</Text>
          <Text style={[text.body, styles.center, { color: c.textMuted }]}>{error}</Text>
          <Button title={t('common.retry')} icon="refresh-cw" onPress={() => setAttempt((a) => a + 1)} />
          <Button title={t('processing.backHome')} variant="ghost" onPress={onCancel} />
        </View>
      ) : (
        <View style={{ gap: spacing.lg }}>
          <GradientCard>
            <View style={styles.spinner}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
            <Text style={styles.title}>
              {pages.length === 1 ? t('processing.titleOne') : t('processing.titleMany', { n: pages.length })}
            </Text>
            <Text style={styles.subtitle}>{t('processing.duration')}</Text>
          </GradientCard>

          <View style={styles.box}>
            {STEPS.map((key, i) => {
              const done = i < step;
              const current = i === step;
              return (
                <View key={key} style={styles.step}>
                  <View style={[styles.stepDot, done && styles.stepDone, current && styles.stepCurrent]}>
                    {done ? (
                      <Feather name="check" size={13} color="#FFFFFF" />
                    ) : current ? (
                      <ActivityIndicator size="small" color={c.accent} />
                    ) : null}
                  </View>
                  <Text style={[styles.stepText, (done || current) && { color: c.text }]}>{t(key)}</Text>
                </View>
              );
            })}
          </View>
          <Button title={t('common.cancel')} variant="ghost" onPress={onCancel} />
        </View>
      )}
    </SafeAreaView>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background, justifyContent: 'center', paddingHorizontal: PAGE_X },
    box: { backgroundColor: c.surface, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md },
    center: { textAlign: 'center' },
    errorIcon: {
      alignSelf: 'center',
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: c.dangerSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    spinner: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    title: { ...type.title, color: '#FFFFFF' },
    subtitle: { ...type.small, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
    step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    stepDot: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: c.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepDone: { backgroundColor: c.success },
    stepCurrent: { backgroundColor: c.accentSoft },
    stepText: { ...type.label, color: c.textMuted, flex: 1 },
  }),
);
