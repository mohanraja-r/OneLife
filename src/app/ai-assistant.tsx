import { useFocusEffect } from 'expo-router';
import { Send, Sparkles, Trash2 } from 'lucide-react-native';
import { ReactNode, useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '../components/AppHeader';
import { EmptyState, ErrorNotice } from '../components/ui';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import {
  ChatMessage,
  addMessage,
  askAssistant,
  clearChatMessages,
  getChatMessages,
} from '../services/chat';
import { errorMessage } from '../services/errors';

/** Longest question the input accepts, matching the edge function's budget. */
const MAX_QUESTION_LENGTH = 500;

/**
 * The assistant conversation: the stored history, a composer, and the reply
 * the edge function returns for each question.
 *
 * Both turns are written to `chat_messages` before the screen shows them, so
 * the thread the user reads is always the thread that was saved — reopening
 * the screen cannot show a conversation different from the one on screen.
 */
export default function AIAssistantScreen(): ReactNode {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const load = useCallback(async () => {
    try {
      setMessages(await getChatMessages());
      setError(null);
    } catch (err) {
      setError(errorMessage(err, 'Could not load your conversation.'));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const send = useCallback(async () => {
    const text = question.trim();
    if (!text || sending) return;

    setQuestion('');
    setError(null);
    setSending(true);

    // The assistant answers against the thread as it stood before this
    // question, so the question is not handed to the model twice.
    const history = messages;

    try {
      const asked = await addMessage('user', text);
      setMessages((prev) => [...prev, asked]);

      const reply = await askAssistant(text, history);
      const answered = await addMessage('assistant', reply);
      setMessages((prev) => [...prev, answered]);
    } catch (err) {
      setError(errorMessage(err, 'The assistant could not reply.'));
      // Restore the question so a failed send is not lost work.
      setQuestion(text);
    } finally {
      setSending(false);
    }
  }, [question, sending, messages]);

  const confirmClear = useCallback(() => {
    Alert.alert('Clear conversation', 'This deletes every message for good.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await clearChatMessages();
              setMessages([]);
              setError(null);
            } catch (err) {
              setError(errorMessage(err, 'Could not clear the conversation.'));
            }
          })();
        },
      },
    ]);
  }, []);

  const canSend = question.trim().length > 0 && !sending;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title="AI Assistant"
        action={
          messages.length > 0 ? (
            <TouchableOpacity
              onPress={confirmClear}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear conversation">
              <Trash2 size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ErrorNotice message={error} onRetry={() => void load()} />

        {messages.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Ask about your health"
            subtitle="Your medicines, meals and daily numbers are already here — ask about those, or about wellbeing in general."
          />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <Bubble message={item} />}
            contentContainerStyle={styles.thread}
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: true })
            }
          />
        )}

        {sending && (
          <View style={styles.thinking}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.thinkingText}>Thinking...</Text>
          </View>
        )}

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="Ask about your health"
            placeholderTextColor={Colors.textMuted}
            value={question}
            onChangeText={setQuestion}
            multiline
            maxLength={MAX_QUESTION_LENGTH}
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.send, !canSend && styles.sendDisabled]}
            onPress={() => void send()}
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityLabel="Send">
            <Send size={20} color={Colors.textInverse} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** One turn in the thread, aligned and coloured by who said it. */
function Bubble({ message }: { message: ChatMessage }): ReactNode {
  const mine = message.role === 'user';

  return (
    <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
      <Text style={mine ? styles.mineText : styles.theirsText}>
        {message.content}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  thread: {
    padding: Spacing.screen,
    gap: Spacing.sm,
  },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  mineText: { ...Typography.body, color: Colors.textInverse },
  theirsText: { ...Typography.body, color: Colors.textPrimary },
  thinking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.screen,
    paddingBottom: Spacing.sm,
  },
  thinkingText: { ...Typography.caption, color: Colors.textSecondary },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    ...Typography.body,
    color: Colors.textPrimary,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: Radius.round,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendDisabled: { opacity: 0.4 },
});
