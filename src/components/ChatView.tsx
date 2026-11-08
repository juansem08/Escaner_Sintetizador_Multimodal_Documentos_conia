import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { askQuestion } from '../api/client';
import { useT } from '../settings/SettingsContext';
import { newId } from '../storage/history';
import { fonts, gradients, PAGE_X, radius, spacing, type } from '../theme';
import type { ChatMessage, DocumentAnalysis } from '../types';
import { CopyButton } from './CopyButton';
import { RoundButton, ScreenHeader } from './ui';

type Props = {
  analysis: DocumentAnalysis;
  messages: ChatMessage[];
  onChange: (messages: ChatMessage[]) => void;
  onBack: () => void;
};

/** Pantalla "Preguntar": siempre oscura, con degradado cálido */
export function ChatView({ analysis, messages, onChange, onBack }: Props) {
  const t = useT();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const send = async (raw: string) => {
    const question = raw.trim();
    if (!question || sending) return;

    const userMsg: ChatMessage = { id: newId(), role: 'user', text: question, createdAt: Date.now() };
    const withQuestion = [...messages, userMsg];
    onChange(withQuestion);
    setInput('');
    setError(null);
    setSending(true);

    try {
      const answer = await askQuestion(analysis, messages, question);
      onChange([...withQuestion, { id: newId(), role: 'model', text: answer, createdAt: Date.now() }]);
    } catch (err) {
      // Quitamos la pregunta fallida y la devolvemos al campo de texto para reintentar
      onChange(messages);
      setInput(question);
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    if (messages.length === 0) return;
    Alert.alert(t('chat.resetTitle'), t('chat.resetText'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('chat.reset'), style: 'destructive', onPress: () => onChange([]) },
    ]);
  };

  // Las sugerencias que ya se preguntaron desaparecen
  const asked = new Set(messages.filter((m) => m.role === 'user').map((m) => m.text));
  const suggestions = analysis.suggestedQuestions.filter((q) => !asked.has(q));

  return (
    <LinearGradient colors={gradients.chat} locations={[0, 0.45, 1]} style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right', 'bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <ScreenHeader
              light
              title={t('chat.title')}
              subtitle={analysis.title}
              left={<RoundButton icon="chevron-left" label={t('common.back')} variant="glass" onPress={onBack} />}
              right={
                <RoundButton
                  icon="rotate-ccw"
                  label={t('chat.reset')}
                  variant="glass"
                  onPress={reset}
                  disabled={messages.length === 0 || sending}
                />
              }
            />
          </View>

          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View style={styles.intro}>
                <View style={styles.introIcon}>
                  <Feather name="loader" size={20} color="#1B1A19" />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.introTitle}>{t('chat.introTitle')}</Text>
                  <Text style={styles.introText}>{t('chat.introText')}</Text>
                </View>
              </View>
            }
            renderItem={({ item }) =>
              item.role === 'user' ? (
                <View style={[styles.bubble, styles.user]}>
                  <Text style={styles.userText} selectable>
                    {item.text}
                  </Text>
                </View>
              ) : (
                <View style={[styles.bubble, styles.model]}>
                  <Text style={styles.modelText} selectable>
                    {item.text}
                  </Text>
                  <View style={styles.modelActions}>
                    <CopyButton value={item.text} variant="glass" withLabel />
                  </View>
                </View>
              )
            }
            ListFooterComponent={
              sending ? (
                <View style={[styles.bubble, styles.model, styles.typing]}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.typingText}>{t('chat.thinking')}</Text>
                </View>
              ) : undefined
            }
          />

          {error && (
            <View style={styles.error}>
              <Feather name="alert-circle" size={15} color="#FFB4A6" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {suggestions.length > 0 && (
            <View style={styles.suggestions}>
              <Text style={styles.suggestionsLabel}>{t('chat.suggestions')}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chips}
                keyboardShouldPersistTaps="handled"
              >
                {suggestions.map((q) => (
                  <Pressable
                    key={q}
                    style={({ pressed }) => [styles.chip, pressed && { opacity: 0.75 }]}
                    onPress={() => send(q)}
                    disabled={sending}
                  >
                    <Text style={styles.chipText} numberOfLines={1}>
                      {q}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={t('chat.placeholder')}
              placeholderTextColor="rgba(255,255,255,0.5)"
              multiline
              maxLength={2000}
              editable={!sending}
            />
            <Pressable
              style={[styles.send, (!input.trim() || sending) && { opacity: 0.45 }]}
              onPress={() => send(input)}
              disabled={!input.trim() || sending}
              accessibilityLabel="send"
            >
              <Feather name="arrow-up" size={22} color="#1B1A19" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const GLASS = 'rgba(255,255,255,0.08)';
const GLASS_BORDER = 'rgba(255,255,255,0.12)';

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: PAGE_X, paddingBottom: spacing.sm },
  list: { paddingHorizontal: PAGE_X, paddingBottom: spacing.lg, gap: spacing.md, flexGrow: 1 },
  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: GLASS,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_BORDER,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  introIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  introTitle: { ...type.bodyStrong, color: '#FFFFFF', fontSize: 16 },
  introText: { ...type.small, color: 'rgba(255,255,255,0.7)' },
  bubble: { maxWidth: '86%', borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 2 },
  user: { alignSelf: 'flex-end', backgroundColor: '#FFFFFF', borderBottomRightRadius: 8 },
  userText: { ...type.body, color: '#1B1A19' },
  model: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(201,88,48,0.32)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,170,130,0.35)',
    borderBottomLeftRadius: 8,
    gap: spacing.sm,
  },
  modelText: { ...type.body, color: '#FFFFFF' },
  modelActions: { flexDirection: 'row', gap: spacing.sm },
  typing: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  typingText: { ...type.small, color: 'rgba(255,255,255,0.8)' },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: PAGE_X,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(210,59,43,0.22)',
  },
  errorText: { ...type.small, color: '#FFD6CE', flex: 1 },
  suggestions: { gap: spacing.sm, paddingBottom: spacing.md },
  suggestionsLabel: { ...type.caption, color: 'rgba(255,255,255,0.6)', paddingHorizontal: PAGE_X },
  chips: { paddingHorizontal: PAGE_X, gap: spacing.sm },
  chip: {
    backgroundColor: GLASS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_BORDER,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    height: 44,
    justifyContent: 'center',
    maxWidth: 300,
  },
  chipText: { ...type.label, color: '#FFFFFF' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginHorizontal: PAGE_X,
    marginBottom: spacing.sm,
    backgroundColor: GLASS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_BORDER,
    borderRadius: 32,
    padding: 6,
    paddingLeft: spacing.xl,
  },
  input: {
    flex: 1,
    minHeight: 52,
    maxHeight: 120,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: '#FFFFFF',
    paddingTop: 15,
    paddingBottom: 15,
  },
  send: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
