import { useEffect, useRef, useState } from 'react';
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
  const { login, loginGoogle } = useGame();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const googleInited = useRef(false);

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

  // Google Sign-In только на вебе и только если настроен на сервере.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/google/config`);
        const cfg = await res.json();
        if (cancelled || !cfg.enabled || !cfg.clientId) return;
        setGoogleEnabled(true);

        const render = () => {
          const g = (window as any).google;
          if (!g || googleInited.current) return;
          googleInited.current = true;
          g.accounts.id.initialize({
            client_id: cfg.clientId,
            callback: async (resp: any) => {
              try {
                await loginGoogle(resp.credential);
              } catch (e: any) {
                setError(e.message ?? 'Ошибка входа через Google');
              }
            },
          });
          const el = document.getElementById('gsi-button');
          if (el) g.accounts.id.renderButton(el, { theme: 'outline', size: 'large', width: 280 });
        };

        if ((window as any).google) {
          render();
        } else {
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.defer = true;
          script.onload = render;
          document.head.appendChild(script);
        }
      } catch {
        /* Google-вход недоступен — игнорируем */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loginGoogle]);

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

        {googleEnabled ? (
          <View style={styles.googleWrap}>
            <Text style={styles.orText}>или</Text>
            <View nativeID="gsi-button" style={styles.gsiBtn} />
          </View>
        ) : null}
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
  googleWrap: { marginTop: 20, alignItems: 'center', gap: 12 },
  orText: { fontSize: 13, color: colors.textSecondary },
  gsiBtn: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
