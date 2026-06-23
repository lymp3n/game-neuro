import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useGame } from '@/context/GameContext';
import { FullScreenOverlay, PrimaryButton } from '@/components/ui';
import { Popup } from '@/components/ui/Popup';
import { STAT_LABELS, STAT_ORDER, STAT_ICONS, STAT_DESCRIPTIONS, SLOT_LABELS } from '@/constants/game';
import { spentStatPoints, statUpgradeCost, deriveStats } from '@/utils/stats';
import { gameIcon } from '@/utils/icons';
import { colors, radius, shadow, spacing } from '@/theme/colors';

const SLOT_ORDER = ['head', 'body', 'rightHand', 'leftHand', 'boots'] as const;

export function CharacterScreen() {
  const { player, items, closeOverlay, send, openOverlay } = useGame();
  const [slotMenu, setSlotMenu] = useState<{ slot: string; itemId: string } | null>(null);
  const committed = player?.stats ?? {};
  const [draft, setDraft] = useState<Record<string, number>>({ ...committed });

  // Сброс черновика, если серверные характеристики изменились (подтверждение/левелап).
  const committedKey = STAT_ORDER.map((s) => committed[s] ?? 0).join(',');
  const [lastKey, setLastKey] = useState(committedKey);
  if (committedKey !== lastKey) {
    setLastKey(committedKey);
    setDraft({ ...committed });
  }

  const totalPts = player?.totalStatPoints ?? 0;
  const spent = useMemo(() => spentStatPoints(draft), [draft]);
  const remaining = totalPts - spent;
  const dirty = STAT_ORDER.some((s) => (draft[s] ?? 0) !== (committed[s] ?? 0));

  const draftEffective = useMemo(() => {
    const eq: Record<string, number> = {};
    for (const s of STAT_ORDER) {
      eq[s] = (draft[s] ?? 0) + ((player?.effectiveStats?.[s] ?? 0) - (committed[s] ?? 0));
    }
    return eq;
  }, [draft, player, committed]);

  const preview = useMemo(() => deriveStats(player?.level ?? 1, draftEffective), [draftEffective, player]);

  if (!player) return null;

  const xpPct = Math.min(100, (player.xp / player.xpToNext) * 100);

  const inc = (stat: string) => {
    const cost = statUpgradeCost(draft[stat] ?? 0);
    if (remaining < cost) return;
    setDraft((d) => ({ ...d, [stat]: (d[stat] ?? 0) + 1 }));
  };
  const dec = (stat: string) => {
    if ((draft[stat] ?? 0) <= (committed[stat] ?? 0)) return;
    setDraft((d) => ({ ...d, [stat]: (d[stat] ?? 0) - 1 }));
  };

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
          {player.training ? (
            <View style={styles.trainBadge}>
              <MaterialIcons name="fitness-center" size={14} color={colors.onPrimaryContainer} />
              <Text style={styles.trainText}>
                Тренировка активна: {Object.entries(player.training.bonuses).map(([s, v]) => `+${v} ${STAT_LABELS[s]}`).join(', ')}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.pointsBanner}>
          <MaterialIcons name="stars" size={18} color={remaining > 0 ? colors.primary : colors.textSecondary} />
          <Text style={styles.pointsBannerText}>Свободных очков: {remaining}</Text>
          {dirty ? <Text style={styles.dirtyTag}>не сохранено</Text> : null}
        </View>

        <Text style={styles.sectionLabel}>Характеристики</Text>
        {STAT_ORDER.map((stat) => {
          const cost = statUpgradeCost(draft[stat] ?? 0);
          const canInc = remaining >= cost;
          const canDec = (draft[stat] ?? 0) > (committed[stat] ?? 0);
          return (
            <View key={stat} style={styles.statRow}>
              <MaterialIcons name={(STAT_ICONS[stat] as any) ?? 'star'} size={20} color={colors.primary} />
              <View style={styles.statTextCol}>
                <Text style={styles.statName}>{STAT_LABELS[stat]}</Text>
                <Text style={styles.statDesc}>{STAT_DESCRIPTIONS[stat]}</Text>
              </View>
              <View style={styles.statRight}>
                <TouchableOpacity
                  style={[styles.stepBtn, !canDec && styles.stepDisabled]}
                  disabled={!canDec}
                  onPress={() => dec(stat)}
                >
                  <MaterialIcons name="remove" size={18} color={canDec ? colors.onSurfaceVariant : colors.textLabel} />
                </TouchableOpacity>
                <Text style={styles.statVal}>{draft[stat] ?? 0}</Text>
                <TouchableOpacity
                  style={[styles.stepBtn, styles.stepInc, !canInc && styles.stepDisabled]}
                  disabled={!canInc}
                  onPress={() => inc(stat)}
                >
                  <MaterialIcons name="add" size={18} color={canInc ? colors.onPrimary : colors.textLabel} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
        <Text style={styles.statCostHint}>Стоимость растёт: каждые 10 очков в характеристике — +1 к цене.</Text>

        {dirty ? (
          <View style={styles.confirmRow}>
            <PrimaryButton label="Сбросить" variant="secondary" onPress={() => setDraft({ ...committed })} style={{ flex: 1 }} />
            <PrimaryButton label="Подтвердить" onPress={() => send('set_stats', { stats: draft })} style={{ flex: 1 }} />
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>Боевые показатели{dirty ? ' (предпросмотр)' : ''}</Text>
        <View style={styles.previewCard}>
          <PreviewRow label="Здоровье" value={preview.maxHp} icon="favorite" />
          <PreviewRow label="Мана" value={preview.maxMana} icon="water-drop" />
          <PreviewRow label="Ближний урон" value={preview.meleeDamage} icon="sports-martial-arts" />
          <PreviewRow label="Дальний урон" value={preview.rangedDamage} icon="my-location" />
          <PreviewRow label="Маг. урон" value={preview.magDamage} icon="auto-fix-high" />
          <PreviewRow label="Физ. защита" value={preview.physArmor} icon="shield" />
          <PreviewRow label="Маг. защита" value={preview.magArmor} icon="security" />
          <PreviewRow label="Уклонение" value={`${Math.round(preview.dodgeChance * 100)}%`} icon="directions-run" />
          <PreviewRow label="Шанс крита" value={`${Math.round(preview.critChance * 100)}%`} icon="bolt" />
          <PreviewRow label="Сопр. дебаффам" value={`${Math.round(preview.debuffResist * 100)}%`} icon="block" />
          <PreviewRow label="Вместимость сумки" value={preview.inventoryCapacity} icon="backpack" />
        </View>
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

function PreviewRow({ label, value, icon }: { label: string; value: number | string; icon: keyof typeof MaterialIcons.glyphMap }) {
  return (
    <View style={styles.previewRow}>
      <MaterialIcons name={icon} size={16} color={colors.onSurfaceVariant} />
      <Text style={styles.previewLabel}>{label}</Text>
      <Text style={styles.previewValue}>{value}</Text>
    </View>
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
  trainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  trainText: { fontSize: 12, fontWeight: '600', color: colors.onPrimaryContainer, flex: 1 },
  pointsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.input,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pointsBannerText: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  dirtyTag: { fontSize: 11, fontWeight: '700', color: colors.onErrorContainer },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
    marginTop: 8,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  statTextCol: { flex: 1 },
  statName: { fontSize: 15, color: colors.textPrimary, fontWeight: '600' },
  statDesc: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  statRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statVal: { fontSize: 16, fontWeight: '700', color: colors.primary, minWidth: 24, textAlign: 'center' },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepInc: { backgroundColor: colors.primary },
  stepDisabled: { backgroundColor: colors.surfaceContainer, opacity: 0.6 },
  statCostHint: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  confirmRow: { flexDirection: 'row', gap: spacing.itemGap, marginTop: 8 },
  previewCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.input,
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  previewLabel: { flex: 1, fontSize: 13, color: colors.onSurfaceVariant },
  previewValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  slotActions: { gap: 10 },
});
