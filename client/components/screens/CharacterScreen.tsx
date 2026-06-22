import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useGame } from '@/context/GameContext';
import { FullScreenOverlay, PrimaryButton } from '@/components/ui';
import { Popup } from '@/components/ui/Popup';
import { STAT_LABELS, SLOT_LABELS } from '@/constants/game';
import { gameIcon } from '@/utils/icons';
import { colors, radius, shadow, spacing } from '@/theme/colors';

const STAT_ORDER = ['strength', 'agility', 'endurance', 'wisdom', 'intuition', 'luck', 'will'];
const SLOT_ORDER = ['head', 'body', 'rightHand', 'leftHand', 'boots'] as const;

export function CharacterScreen() {
  const { player, items, closeOverlay, send, openOverlay } = useGame();
  const [slotMenu, setSlotMenu] = useState<{ slot: string; itemId: string } | null>(null);

  if (!player) return null;

  const xpPct = Math.min(100, (player.xp / player.xpToNext) * 100);

  const handleSlotPress = (slot: string, itemId: string | null) => {
    if (itemId) {
      setSlotMenu({ slot, itemId });
    } else {
      openOverlay('inventory', { inventoryFilter: slot });
    }
  };

  return (
    <FullScreenOverlay title="Персонаж" onClose={closeOverlay}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarRow}>
          <View style={styles.equipCol}>
            {SLOT_ORDER.slice(0, 2).map((slot) => (
              <EquipSlot
                key={slot}
                slot={slot}
                itemId={player.equipment[slot]}
                items={items}
                onPress={() => handleSlotPress(slot, player.equipment[slot])}
              />
            ))}
          </View>
          <View style={styles.avatar}>
            <MaterialIcons name="person" size={64} color={colors.primary} />
            <Text style={styles.avatarName}>{player.name}</Text>
          </View>
          <View style={styles.equipCol}>
            {SLOT_ORDER.slice(2).map((slot) => (
              <EquipSlot
                key={slot}
                slot={slot}
                itemId={player.equipment[slot]}
                items={items}
                onPress={() => handleSlotPress(slot, player.equipment[slot])}
              />
            ))}
          </View>
        </View>

        <View style={styles.levelCard}>
          <Text style={styles.levelText}>
            {player.level} уровень [{player.xp}/{player.xpToNext}]
          </Text>
          <View style={styles.xpBar}>
            <View style={[styles.xpFill, { width: `${xpPct}%` }]} />
          </View>
          <Text style={styles.hpMana}>
            HP {player.hp}/{player.maxHp} · Мана {player.mana}/{player.maxMana}
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Характеристики</Text>
        {STAT_ORDER.map((stat) => (
          <View key={stat} style={styles.statRow}>
            <Text style={styles.statName}>{STAT_LABELS[stat]}</Text>
            <View style={styles.statRight}>
              <Text style={styles.statVal}>{player.effectiveStats?.[stat] ?? player.stats[stat]}</Text>
              {player.statPoints > 0 ? (
                <TouchableOpacity style={styles.plusBtn} onPress={() => send('allocate_stat', { stat })}>
                  <MaterialIcons name="add" size={18} color={colors.onPrimary} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ))}
        {player.statPoints > 0 ? (
          <Text style={styles.pointsHint}>Очков характеристик: {player.statPoints}</Text>
        ) : null}
      </ScrollView>

      <Popup
        visible={!!slotMenu}
        onClose={() => setSlotMenu(null)}
        title={slotMenu ? items[slotMenu.itemId]?.name : undefined}
      >
        {slotMenu ? (
          <View style={styles.slotActions}>
            <PrimaryButton
              label="Снять"
              onPress={() => {
                send('unequip', { slot: slotMenu.slot });
                setSlotMenu(null);
              }}
            />
            <PrimaryButton
              label="Заменить"
              variant="secondary"
              onPress={() => {
                setSlotMenu(null);
                openOverlay('inventory', { inventoryFilter: slotMenu.slot });
              }}
            />
            <PrimaryButton label="Отмена" variant="ghost" onPress={() => setSlotMenu(null)} />
          </View>
        ) : null}
      </Popup>
    </FullScreenOverlay>
  );
}

function EquipSlot({
  slot,
  itemId,
  items,
  onPress,
}: {
  slot: string;
  itemId: string | null;
  items: Record<string, any>;
  onPress: () => void;
}) {
  const item = itemId ? items[itemId] : null;
  return (
    <TouchableOpacity style={[styles.equipSlot, item && styles.equipSlotFilled]} onPress={onPress}>
      <MaterialIcons
        name={item ? gameIcon(item.icon) : 'add'}
        size={20}
        color={item ? colors.primary : colors.textLabel}
      />
      <Text style={styles.slotLabel} numberOfLines={1}>
        {item ? item.name : SLOT_LABELS[slot]}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40, gap: spacing.rowGap },
  avatarRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  equipCol: { gap: 12 },
  equipSlot: {
    width: 72,
    height: 72,
    borderRadius: radius.input,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: 4,
    ...shadow.card,
  },
  equipSlotFilled: { borderColor: colors.primary, backgroundColor: colors.primaryFixed },
  slotLabel: { fontSize: 8, color: colors.textLabel, marginTop: 4, textAlign: 'center' },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  avatarName: { fontSize: 12, fontWeight: '600', color: colors.primary, marginTop: 4 },
  levelCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.py,
    ...shadow.card,
  },
  levelText: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  xpBar: {
    height: 6,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  xpFill: { height: '100%', backgroundColor: colors.primary },
  hpMana: { fontSize: 13, color: colors.textSecondary, marginTop: 8 },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
    marginTop: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  statName: { fontSize: 16, color: colors.textPrimary },
  statRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statVal: { fontSize: 16, fontWeight: '600', color: colors.primary },
  plusBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsHint: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  slotActions: { gap: 10 },
});
