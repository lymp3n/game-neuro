import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useGame } from '@/context/GameContext';
import { Popup } from '@/components/ui/Popup';
import { gameIcon } from '@/utils/icons';
import { colors, radius, shadow, spacing } from '@/theme/colors';

export function BattleScreen() {
  const { player, battle, spells, items, closeAllOverlays, send } = useGame();
  const [spellPopup, setSpellPopup] = useState(false);
  const [potionPopup, setPotionPopup] = useState(false);
  const [turnLeft, setTurnLeft] = useState(10);
  const [actionLock, setActionLock] = useState(false);
  const logRef = useRef<ScrollView>(null);

  const me = battle?.participants?.find((p: any) => p.id === player?.id);
  const hasActed =
    battle?.actedPlayerIds?.includes(player?.id) ||
    me?.acted ||
    false;

  useEffect(() => {
    setActionLock(false);
    setSpellPopup(false);
    setPotionPopup(false);
  }, [battle?.turnEndsAt]);

  const canAct = battle?.status === 'active' && !hasActed && !actionLock;

  const doAction = (payload: object) => {
    if (!canAct) return;
    setActionLock(true);
    send('battle_action', payload);
  };

  useEffect(() => {
    if (!battle?.turnEndsAt) return;
    const tick = () => {
      setTurnLeft(Math.max(0, Math.ceil((battle.turnEndsAt - Date.now()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [battle?.turnEndsAt]);

  useEffect(() => {
    logRef.current?.scrollToEnd({ animated: true });
  }, [battle?.log?.length]);

  if (!player || !battle) return null;

  const spellSlots = player.spellSlots.filter(Boolean) as string[];
  const potions = player.inventory.filter((inv: any) => items[inv.itemId]?.type === 'potion');

  const hpPct = (battle.mobHp / battle.mobMaxHp) * 100;
  const playerHpPct = me ? (me.hp / me.maxHp) * 100 : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={closeAllOverlays} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Бой: {battle.mobName}
        </Text>
        <Text style={styles.timer}>{turnLeft}с</Text>
      </View>

      <View style={styles.statusRow}>
        <View style={styles.statusCard}>
          <MaterialIcons name="person" size={24} color={colors.primary} />
          <View style={styles.statusInfo}>
            <Text style={styles.statusName}>{player.name}</Text>
            <View style={styles.barBg}>
              <View style={[styles.barHp, { width: `${playerHpPct}%` }]} />
            </View>
            <View style={styles.barBg}>
              <View style={[styles.barMana, { width: `${(me?.mana / me?.maxMana) * 100}%` }]} />
            </View>
          </View>
        </View>
        <View style={styles.statusCard}>
          <MaterialIcons name="smart-toy" size={24} color={colors.error} />
          <View style={styles.statusInfo}>
            <Text style={styles.statusName}>{battle.mobName} Lv.{battle.mobLevel}</Text>
            <View style={styles.barBg}>
              <View style={[styles.barHp, { width: `${hpPct}%` }]} />
            </View>
          </View>
        </View>
      </View>

      <ScrollView ref={logRef} style={styles.log} contentContainerStyle={styles.logContent}>
        {battle.log.map((line: string, i: number) => (
          <View key={i} style={[styles.logBubble, i % 2 === 0 ? styles.logLeft : styles.logRight]}>
            <Text style={styles.logText}>{line}</Text>
          </View>
        ))}
        {battle.status === 'won' ? (
          <Text style={styles.victory}>Победа!</Text>
        ) : null}
      </ScrollView>

      {battle.status === 'active' ? (
        <View style={styles.actionsWrap}>
          {hasActed ? <Text style={styles.waitHint}>Ход сделан — ждите следующий раунд ({turnLeft}с)</Text> : null}
          <View style={styles.actions}>
          <ActionBtn icon="sports-martial-arts" label="Атака" disabled={!canAct} onPress={() => doAction({ type: 'attack' })} />
          <ActionBtn icon="auto-fix-high" label="Заклинание" disabled={!canAct} onPress={() => setSpellPopup(true)} />
          <ActionBtn icon="science" label="Зелье" disabled={!canAct} onPress={() => setPotionPopup(true)} />
          </View>
        </View>
      ) : null}

      <Popup visible={spellPopup} onClose={() => setSpellPopup(false)} title="Заклинания">
        {spellSlots.length === 0 ? (
          <Text style={styles.emptyPopup}>Нет заклинаний в слотах</Text>
        ) : (
          spellSlots.map((id) => (
            <TouchableOpacity
              key={id}
              style={styles.popupItem}
              onPress={() => {
                doAction({ type: 'spell', spellId: id });
                setSpellPopup(false);
              }}
            >
              <Text style={styles.popupItemText}>{spells[id]?.name}</Text>
              <Text style={styles.popupMeta}>{spells[id]?.manaCost} маны</Text>
            </TouchableOpacity>
          ))
        )}
      </Popup>

      <Popup visible={potionPopup} onClose={() => setPotionPopup(false)} title="Зелья">
        {potions.length === 0 ? (
          <Text style={styles.emptyPopup}>Нет зелий</Text>
        ) : (
          potions.map((inv: any) => (
            <TouchableOpacity
              key={inv.itemId}
              style={styles.popupItem}
              onPress={() => {
                doAction({ type: 'potion', itemId: inv.itemId });
                setPotionPopup(false);
              }}
            >
              <Text style={styles.popupItemText}>{items[inv.itemId]?.name}</Text>
            </TouchableOpacity>
          ))
        )}
      </Popup>
    </View>
  );
}

function ActionBtn({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, disabled && styles.actionDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <MaterialIcons name={icon} size={24} color={disabled ? colors.textLabel : colors.onSurfaceVariant} />
      <Text style={[styles.actionLabel, disabled && { color: colors.textLabel }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundPage },
  header: {
    height: spacing.touchPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.px,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: colors.primary },
  timer: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, width: 40, textAlign: 'right' },
  statusRow: { flexDirection: 'row', gap: 10, padding: 12, backgroundColor: colors.backgroundPage },
  statusCard: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.input,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
  },
  statusInfo: { flex: 1 },
  statusName: { fontSize: 12, fontWeight: '700', color: colors.textPrimary },
  barBg: { height: 4, backgroundColor: colors.surfaceContainerHighest, borderRadius: 2, marginTop: 4, overflow: 'hidden' },
  barHp: { height: '100%', backgroundColor: colors.error },
  barMana: { height: '100%', backgroundColor: colors.primary },
  log: { flex: 1 },
  logContent: { padding: spacing.px, gap: 8, paddingBottom: 20 },
  logBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: radius.input,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
  },
  logLeft: { alignSelf: 'flex-start' },
  logRight: { alignSelf: 'flex-end', backgroundColor: colors.secondaryFixed },
  logText: { fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
  victory: { textAlign: 'center', fontSize: 20, fontWeight: '700', color: colors.primary, marginTop: 20 },
  actionsWrap: { backgroundColor: colors.surfaceContainerLowest, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, ...shadow.card },
  waitHint: { textAlign: 'center', fontSize: 13, color: colors.textSecondary, paddingTop: 12, paddingHorizontal: spacing.px },
  actions: {
    flexDirection: 'row',
    gap: 10,
    padding: spacing.px,
    paddingBottom: 24,
    backgroundColor: colors.surfaceContainerLowest,
  },
  actionBtn: {
    flex: 1,
    height: spacing.touchPrimary,
    backgroundColor: colors.surfaceVariant,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionDisabled: { opacity: 0.5 },
  actionLabel: { fontSize: 12, fontWeight: '700', color: colors.onSurfaceVariant },
  emptyPopup: { textAlign: 'center', color: colors.textSecondary, padding: 20 },
  popupItem: { padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.outlineVariant },
  popupItemText: { fontSize: 16, color: colors.textPrimary },
  popupMeta: { fontSize: 12, color: colors.textSecondary },
});
