import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { FullScreenOverlay, PrimaryButton } from '@/components/ui';
import { Popup } from '@/components/ui/Popup';
import { gameIcon } from '@/utils/icons';
import { colors, radius, shadow, spacing } from '@/theme/colors';

export function SpellScreen() {
  const { player, spells, closeOverlay, send } = useGame();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);

  if (!player) return null;

  const assigned = new Set(player.spellSlots.filter(Boolean));
  const learnedUnassigned = player.learnedSpells.filter((id: string) => !assigned.has(id));
  const unlearned = Object.keys(spells).filter((id) => !player.learnedSpells.includes(id));

  const openPicker = (slotIndex: number) => {
    setPickerSlot(slotIndex);
    setPickerOpen(true);
  };

  const assignToSlot = (spellId: string) => {
    if (pickerSlot !== null) {
      send('assign_spell', { spellId, slotIndex: pickerSlot });
    }
    setPickerOpen(false);
    setPickerSlot(null);
  };

  return (
    <FullScreenOverlay title="Заклинания" onClose={closeOverlay}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>Быстрые слоты</Text>
        <View style={styles.slotGrid}>
          {player.spellSlots.map((spellId: string | null, i: number) => (
            <TouchableOpacity
              key={i}
              style={styles.slot}
              onPress={() => {
                if (spellId) send('clear_spell', { slotIndex: i });
                else openPicker(i);
              }}
            >
              {spellId ? (
                <>
                  <MaterialIcons name={gameIcon(spells[spellId]?.icon)} size={24} color={colors.primary} />
                  <Text style={styles.slotName} numberOfLines={1}>{spells[spellId]?.name}</Text>
                </>
              ) : (
                <MaterialIcons name="add" size={28} color={colors.textLabel} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Изученные</Text>
        {learnedUnassigned.length === 0 ? (
          <Text style={styles.empty}>Все заклинания в слотах</Text>
        ) : (
          learnedUnassigned.map((id: string) => (
            <View key={id} style={styles.spellRow}>
              <View style={styles.spellInfo}>
                <MaterialIcons name={gameIcon(spells[id]?.icon)} size={22} color={colors.onSurfaceVariant} />
                <View>
                  <Text style={styles.spellName}>{spells[id]?.name}</Text>
                  <Text style={styles.spellMeta}>Мана: {spells[id]?.manaCost}</Text>
                </View>
              </View>
              <PrimaryButton
                label="Assign"
                onPress={() => {
                  const free = player.spellSlots.findIndex((s: string | null) => !s);
                  if (free >= 0) send('assign_spell', { spellId: id, slotIndex: free });
                }}
                style={styles.rowBtn}
              />
            </View>
          ))
        )}

        <Text style={styles.sectionLabel}>Не изученные</Text>
        {unlearned.map((id) => {
          const spell = spells[id];
          const canLearn =
            player.level >= spell.requiredLevel && player.skillPoints >= spell.skillPointCost;
          return (
            <View key={id} style={styles.spellRow}>
              <View style={styles.spellInfo}>
                <MaterialIcons name={gameIcon(spell.icon)} size={22} color={colors.textLabel} />
                <View>
                  <Text style={styles.spellName}>{spell.name}</Text>
                  <Text style={styles.spellMeta}>
                    Ур. {spell.requiredLevel} · {spell.skillPointCost} очк.
                  </Text>
                </View>
              </View>
              <PrimaryButton
                label="+ Learn"
                onPress={() => send('learn_spell', { spellId: id })}
                disabled={!canLearn}
                style={styles.rowBtn}
              />
            </View>
          );
        })}
        <Text style={styles.pointsHint}>Очков умений: {player.skillPoints}</Text>
      </ScrollView>

      <Popup visible={pickerOpen} onClose={() => setPickerOpen(false)} title="Выберите заклинание">
        <ScrollView style={{ maxHeight: 280 }}>
          {learnedUnassigned.map((id: string) => (
            <TouchableOpacity key={id} style={styles.pickerItem} onPress={() => assignToSlot(id)}>
              <Text style={styles.spellName}>{spells[id]?.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Popup>
    </FullScreenOverlay>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40, gap: spacing.itemGap },
  sectionLabel: { fontSize: 14, fontWeight: '500', color: colors.onSurfaceVariant, marginTop: 8 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slot: {
    width: '22%',
    aspectRatio: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.input,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: 4,
  },
  slotName: { fontSize: 9, color: colors.textSecondary, marginTop: 2 },
  empty: { color: colors.textSecondary, fontSize: 14 },
  spellRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    padding: 12,
    ...shadow.card,
  },
  spellInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  spellName: { fontSize: 15, fontWeight: '500', color: colors.textPrimary },
  spellMeta: { fontSize: 12, color: colors.textSecondary },
  rowBtn: { paddingHorizontal: 16 },
  pointsHint: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 8 },
  pickerItem: { padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.outlineVariant },
});
