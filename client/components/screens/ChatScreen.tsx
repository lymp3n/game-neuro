import { useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useGame } from '@/context/GameContext';
import { colors, radius, spacing } from '@/theme/colors';

export function ChatScreen() {
  const { chat, closeOverlay, send } = useGame();
  const [text, setText] = useState('');
  const listRef = useRef<FlatList>(null);

  const handleSend = () => {
    if (!text.trim()) return;
    send('chat', { text: text.trim() });
    setText('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Общий чат</Text>
        <TouchableOpacity onPress={closeOverlay} style={styles.closeBtn}>
          <MaterialIcons name="expand-more" size={28} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={chat}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messages}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={styles.msg}>
            <Text style={styles.msgAuthor}>{item.playerName}</Text>
            <Text style={styles.msgText}>{item.text}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Нет сообщений. Напишите первым!</Text>}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Сообщение..."
            placeholderTextColor={colors.textLabel}
            value={text}
            onChangeText={setText}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <MaterialIcons name="send" size={22} color={colors.onPrimary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundPage },
  header: {
    height: spacing.touchPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.primary },
  closeBtn: { position: 'absolute', right: 16 },
  messages: { padding: spacing.px, gap: 12, flexGrow: 1 },
  msg: {
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    padding: 12,
  },
  msgAuthor: { fontSize: 13, fontWeight: '600', color: colors.primary },
  msgText: { fontSize: 15, color: colors.textPrimary, marginTop: 4 },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: 40 },
  inputRow: {
    flexDirection: 'row',
    padding: spacing.px,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.textPrimary,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
