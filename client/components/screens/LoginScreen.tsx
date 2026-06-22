import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useGame } from '@/context/GameContext';
import { PrimaryButton } from '@/components/ui';
import { API_URL } from '@/config/api';
import { colors, radius, shadow, spacing } from '@/theme/colors';

export function LoginScreen() {
  const { login } = useGame();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!name.trim()) {
      setError('Введите имя персонажа');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(name.trim());
    } catch (e: any) {
      setError(e.message ?? 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>TextQuest RPG</Text>
        <Text style={styles.subtitle}>Текстовая MMORPG</Text>
        <TextInput
          style={styles.input}
          placeholder="Имя персонажа"
          placeholderTextColor={colors.textLabel}
          value={name}
          onChangeText={setName}
          autoCapitalize="none"
          maxLength={20}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.apiHint}>Сервер: {API_URL}</Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
        ) : (
          <PrimaryButton label="Войти в игру" onPress={handleLogin} style={styles.btn} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPage,
    justifyContent: 'center',
    padding: spacing.px,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 32,
    ...shadow.card,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  input: {
    height: spacing.touchPrimary,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.input,
    paddingHorizontal: 20,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  error: { color: colors.error, marginTop: 8, textAlign: 'center' },
  apiHint: { fontSize: 11, color: colors.textLabel, textAlign: 'center', marginTop: 8 },
  btn: { marginTop: 24, width: '100%' },
});
