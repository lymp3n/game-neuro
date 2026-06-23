import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useGame } from '@/context/GameContext';
import { API_URL } from '@/config/api';
import { colors, radius, shadow, spacing } from '@/theme/colors';

export function LoginScreen() {
  const { loginDemoGoogle } = useGame();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDemoGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      await loginDemoGoogle();
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
        <MaterialIcons name="auto-awesome" size={48} color={colors.primary} style={{ alignSelf: 'center' }} />
        <Text style={styles.title}>TextQuest RPG</Text>
        <Text style={styles.subtitle}>Текстовая MMORPG — войдите, чтобы начать</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : (
          <TouchableOpacity style={styles.googleBtn} onPress={handleDemoGoogle} activeOpacity={0.85}>
            <View style={styles.googleIconWrap}>
              <Text style={styles.googleG}>G</Text>
            </View>
            <Text style={styles.googleLabel}>Войти через Google</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.demoHint}>
          Демо-режим: кнопка имитирует вход через Google. Реальная авторизация подключится позже.
        </Text>
        <Text style={styles.apiHint}>Сервер: {API_URL}</Text>
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
    gap: 8,
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
    marginBottom: 24,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    height: 52,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    marginTop: 8,
  },
  googleIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: { color: '#fff', fontWeight: '700', fontSize: 16 },
  googleLabel: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  demoHint: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: 16, lineHeight: 18 },
  error: { color: colors.error, textAlign: 'center' },
  apiHint: { fontSize: 11, color: colors.textLabel, textAlign: 'center', marginTop: 8 },
});
