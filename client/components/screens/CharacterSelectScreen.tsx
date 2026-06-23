import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useGame } from '@/context/GameContext';
import { PrimaryButton } from '@/components/ui';
import { colors, radius, shadow, spacing } from '@/theme/colors';

export function CharacterSelectScreen() {
  const { account, characters, createCharacter, selectCharacter, logoutAccount } = useGame();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const maxChars = account?.maxCharacters ?? 3;
  const canCreate = characters.length < maxChars;

  const handleCreate = async () => {
    if (!newName.trim()) {
      setError('Введите имя персонажа');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await createCharacter(newName.trim());
      setCreating(false);
      setNewName('');
    } catch (e: any) {
      setError(e.message ?? 'Ошибка создания');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (playerId: string) => {
    setLoading(true);
    setError('');
    try {
      await selectCharacter(playerId);
    } catch (e: any) {
      setError(e.message ?? 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Выбор персонажа</Text>
        <Text style={styles.sub}>{account?.displayName ?? 'Аккаунт'}</Text>
        <TouchableOpacity onPress={logoutAccount} style={styles.logout}>
          <MaterialIcons name="logout" size={18} color={colors.textSecondary} />
          <Text style={styles.logoutText}>Выйти</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {characters.map((ch) => (
          <TouchableOpacity
            key={ch.id}
            style={styles.charCard}
            onPress={() => handleSelect(ch.id)}
            disabled={loading}
            activeOpacity={0.85}
          >
            <View style={styles.avatar}>
              <MaterialIcons name="person" size={28} color={colors.primary} />
            </View>
            <View style={styles.charInfo}>
              <Text style={styles.charName}>{ch.name}</Text>
              <Text style={styles.charMeta}>Ур. {ch.level}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}

        {canCreate && !creating ? (
          <TouchableOpacity style={styles.addCard} onPress={() => setCreating(true)}>
            <MaterialIcons name="add-circle-outline" size={28} color={colors.primary} />
            <Text style={styles.addText}>Создать персонажа ({characters.length}/{maxChars})</Text>
          </TouchableOpacity>
        ) : null}

        {creating ? (
          <View style={styles.createBox}>
            <Text style={styles.createLabel}>Имя нового персонажа</Text>
            <CreateNameInput value={newName} onChange={setNewName} />
            <View style={styles.createActions}>
              <PrimaryButton label="Отмена" variant="secondary" onPress={() => setCreating(false)} style={{ flex: 1 }} />
              <PrimaryButton label="Создать" onPress={handleCreate} disabled={loading} style={{ flex: 1 }} />
            </View>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </View>
  );
}

function CreateNameInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <TextInput
      style={styles.input}
      placeholder="Имя персонажа"
      placeholderTextColor={colors.textLabel}
      value={value}
      onChangeText={onChange}
      maxLength={20}
      autoCapitalize="none"
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundPage, padding: spacing.px },
  header: { paddingTop: 24, paddingBottom: 16, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  sub: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  logout: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 },
  logoutText: { fontSize: 13, color: colors.textSecondary },
  list: { gap: spacing.rowGap, paddingBottom: 40 },
  charCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 16,
    ...shadow.card,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  charInfo: { flex: 1 },
  charName: { fontSize: 17, fontWeight: '600', color: colors.textPrimary },
  charMeta: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.card,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderStyle: 'dashed',
  },
  addText: { fontSize: 15, fontWeight: '600', color: colors.primary },
  createBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 16,
    gap: 12,
    ...shadow.card,
  },
  createLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  createRow: { flexDirection: 'row' },
  nameInput: { flex: 1 },
  nameInputText: {},
  input: {
    height: 48,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.input,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  createActions: { flexDirection: 'row', gap: 10 },
  error: { color: colors.error, textAlign: 'center', marginTop: 8 },
});
