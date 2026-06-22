import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useGame } from '@/context/GameContext';
import { Card, PrimaryButton, RowItem, SectionTitle } from '@/components/ui';
import { Popup } from '@/components/ui/Popup';
import { gameIcon } from '@/utils/icons';
import { colors, radius, shadow, spacing } from '@/theme/colors';

export function MainScreen() {
  const { player, location, locations, items, openOverlay, send, chat } = useGame();
  const [selectedMob, setSelectedMob] = useState<any>(null);
  if (!player || !location) return null;

  const isCity = location.type === 'city';
  const isDungeonEntry = location.type === 'dungeon_entry';
  const inBattle = !!player.inBattle;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.appTitle}>TextQuest RPG</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.statusRow}>
          <TouchableOpacity style={styles.statusIcon} onPress={() => openOverlay('character')}>
            <MaterialIcons name="person" size={22} color={colors.primary} />
            <View style={styles.hpBadge}>
              <MaterialIcons name="favorite" size={10} color={colors.onPrimary} />
              <Text style={styles.hpBadgeText}>{player.hp}</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.statusPills}>
            <TouchableOpacity style={styles.hpPill} onPress={() => openOverlay('character')}>
              <MaterialIcons name="favorite" size={16} color={colors.onErrorContainer} />
              <Text style={styles.hpText}>
                {player.hp}/{player.maxHp}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.manaPill} onPress={() => openOverlay('spells')}>
              <MaterialIcons name="water-drop" size={16} color={colors.onPrimaryContainer} />
              <Text style={styles.manaText}>
                {player.mana}/{player.maxMana}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.invPill} onPress={() => openOverlay('inventory')}>
              <MaterialIcons name="backpack" size={16} color={colors.textPrimary} />
              <Text style={styles.invText}>
                {player.inventoryCount}/{player.inventoryLimit}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {player.traveling ? (
          <TravelProgressBar traveling={player.traveling} locations={locations} onCancel={() => send('cancel_travel')} />
        ) : null}

        <View style={styles.locCard}>
          <Text style={styles.locName}>{location.name}</Text>
          <Text style={styles.locType}>
            {location.type === 'city' ? 'Город' : location.type === 'dungeon' ? 'Подземелье' : 'Локация'}
          </Text>
        </View>

        <LocationExitsList disabled={inBattle} />

        <Text style={styles.description}>{location.description}</Text>

        {isCity ? (
          <View style={styles.cityActions}>
            <Card>
              <RowItem icon="inventory-2" title="Личный сундук" subtitle="Хранилище предметов" actionLabel="Открыть" onAction={() => openOverlay('stash')} />
            </Card>
            <Card style={{ marginTop: spacing.rowGap }}>
              <RowItem icon="storefront" title="Торговец" subtitle={`Золото: ${player.gold}`} actionLabel="Торговля" onAction={() => openOverlay('merchant')} />
            </Card>
          </View>
        ) : null}

        {player.inDungeon ? (
          <Card style={{ marginBottom: spacing.rowGap }}>
            <RowItem
              icon="exit-to-app"
              title="Выйти из подземелья"
              subtitle="Вернуться на карту мира"
              actionLabel="Выйти"
              actionVariant="secondary"
              onAction={() => send('exit_dungeon')}
            />
          </Card>
        ) : null}

        {isDungeonEntry && !player.inDungeon ? (
          <Card style={{ marginBottom: spacing.rowGap }}>
            <RowItem icon="castle" title="Пещеры теней" subtitle="Нужна группа из 3 игроков" actionLabel="Лобби" onAction={() => openOverlay('dungeon')} />
          </Card>
        ) : null}

        {location.activeFights?.length > 0 ? (
          <View style={styles.section}>
            <SectionTitle title="Активные бои" count={location.activeFights.length} />
            <Card style={styles.listCard}>
              {location.activeFights.map((fight: any) => (
                <RowItem
                  key={fight.id}
                  icon="sports-martial-arts"
                  title={`${fight.mobName} vs ${fight.participants.join(', ')}`}
                  actionLabel="Join"
                  onAction={() => send('join_battle', { battleId: fight.id })}
                />
              ))}
            </Card>
          </View>
        ) : null}

        {!isCity && location.mobs?.length > 0 ? (
          <View style={styles.section}>
            <SectionTitle title="Монстры" count={location.mobs.length} />
            <Card style={styles.listCard}>
              {location.mobs.map((mob: any) => (
                <TouchableOpacity
                  key={mob.instanceId}
                  style={styles.mobRow}
                  activeOpacity={0.8}
                  onPress={() => setSelectedMob(mob)}
                >
                  <View style={styles.mobAvatar}>
                    <MaterialIcons name={gameIcon(mob.icon)} size={24} color={colors.onSurfaceVariant} />
                  </View>
                  <View style={styles.mobInfo}>
                    <Text style={styles.mobName} numberOfLines={1}>
                      {mob.name}
                    </Text>
                    <Text style={styles.mobSub}>
                      Ур. {mob.level} · {mob.hp} HP
                    </Text>
                  </View>
                  <MaterialIcons name="info-outline" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        ) : null}

        {location.groundItems?.length > 0 ? (
          <View style={styles.section}>
            <SectionTitle title="Предметы на земле" count={location.groundItems.length} />
            <Card style={styles.listCard}>
              {location.groundItems.map((gi: any) => (
                <RowItem
                  key={gi.id}
                  icon="science"
                  title={`${items[gi.itemId]?.name ?? gi.itemId} x${gi.count}`}
                  subtitle={gi.canPickup ? undefined : `Доступно через ${gi.expiresIn}с`}
                  actionLabel="Pick Up"
                  actionVariant="secondary"
                  disabled={!gi.canPickup}
                  onAction={() => send('pickup', { groundItemId: gi.id })}
                />
              ))}
            </Card>
          </View>
        ) : null}

        <View style={{ height: 160 }} />
      </ScrollView>

      <TouchableOpacity style={styles.chatBar} onPress={() => openOverlay('chat')} activeOpacity={0.9}>
        <MaterialIcons name="chat" size={20} color={colors.inversePrimary} />
        <Text style={styles.chatPreview} numberOfLines={1}>
          {chat.slice(-1)[0]
            ? `${chat.slice(-1)[0].playerName}: ${chat.slice(-1)[0].text}`
            : 'Global Chat — нажмите чтобы открыть'}
        </Text>
        <MaterialIcons name="expand-less" size={20} color={colors.textLabel} />
      </TouchableOpacity>

      <MobDetailPopup
        mob={selectedMob}
        onClose={() => setSelectedMob(null)}
        onFight={(mob) => {
          setSelectedMob(null);
          send('start_battle', { mobInstanceId: mob.instanceId });
        }}
      />
    </View>
  );
}

function MobDetailPopup({
  mob,
  onClose,
  onFight,
}: {
  mob: any;
  onClose: () => void;
  onFight: (mob: any) => void;
}) {
  if (!mob) return null;
  const stats: { label: string; value: number; icon: keyof typeof MaterialIcons.glyphMap }[] = [
    { label: 'Уровень', value: mob.level, icon: 'military-tech' },
    { label: 'Здоровье', value: mob.hp, icon: 'favorite' },
    { label: 'Физ. урон', value: mob.physicalAttack, icon: 'sports-martial-arts' },
    { label: 'Маг. урон', value: mob.magicAttack, icon: 'whatshot' },
    { label: 'Броня', value: mob.armor, icon: 'security' },
    { label: 'Опыт', value: mob.xp, icon: 'star' },
  ];

  return (
    <Popup visible={!!mob} onClose={onClose}>
      <View style={styles.mobPopupHeader}>
        <View style={styles.mobPopupAvatar}>
          <MaterialIcons name={gameIcon(mob.icon)} size={32} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.mobPopupName}>{mob.name}</Text>
          <Text style={styles.mobPopupLevel}>Монстр · Ур. {mob.level}</Text>
        </View>
      </View>

      {mob.description ? <Text style={styles.mobPopupDesc}>{mob.description}</Text> : null}

      <View style={styles.mobStatsGrid}>
        {stats.map((s) => (
          <View key={s.label} style={styles.mobStatCell}>
            <MaterialIcons name={s.icon} size={16} color={colors.onSurfaceVariant} />
            <Text style={styles.mobStatLabel}>{s.label}</Text>
            <Text style={styles.mobStatValue}>{s.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.mobPopupActions}>
        <PrimaryButton label="Закрыть" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
        <PrimaryButton label="В бой" onPress={() => onFight(mob)} style={{ flex: 1 }} />
      </View>
    </Popup>
  );
}

function TravelProgressBar({
  traveling,
  locations,
  onCancel,
}: {
  traveling: { to: string; startedAt?: number; endsAt: number; durationMs?: number };
  locations: Record<string, any>;
  onCancel: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const startedAt = traveling.startedAt ?? traveling.endsAt - (traveling.durationMs ?? 8000);
      const total = traveling.durationMs ?? Math.max(1, traveling.endsAt - startedAt);
      const elapsed = now - startedAt;
      setProgress(Math.min(100, Math.max(0, (elapsed / total) * 100)));
      setSecondsLeft(Math.max(0, Math.ceil((traveling.endsAt - now) / 1000)));
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [traveling]);

  const destName = locations[traveling.to]?.name ?? traveling.to;

  return (
    <View style={styles.travelBar}>
      <View style={styles.travelHeader}>
        <MaterialIcons name="directions-walk" size={18} color={colors.primary} />
        <Text style={styles.travelDest}>
          Идём в: {destName} · {secondsLeft} сек
        </Text>
        <TouchableOpacity style={styles.travelCancel} onPress={onCancel} activeOpacity={0.8}>
          <MaterialIcons name="close" size={16} color={colors.onErrorContainer} />
          <Text style={styles.travelCancelText}>Отменить</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.travelTrack}>
        <View style={[styles.travelFill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.travelHint}>Выберите другой переход ниже, чтобы сменить направление.</Text>
    </View>
  );
}

function LocationExitsList({ disabled }: { disabled: boolean }) {
  const { player, location, locations, send } = useGame();
  const traveling = player?.traveling;

  if (!location?.exits?.length) return null;

  return (
    <View style={styles.exitsSection}>
      <Text style={styles.exitsLabel}>Переходы</Text>
      {location.exits.map((exitId: string) => {
        const isActive = traveling?.to === exitId;
        const isDisabled = disabled && !isActive;
        const travelSec = location.travel?.[exitId];
        return (
          <TouchableOpacity
            key={exitId}
            style={[styles.exitRow, isActive && styles.exitRowActive, isDisabled && styles.exitRowDisabled]}
            disabled={isDisabled}
            onPress={() => send('travel', { targetLocationId: exitId })}
            activeOpacity={0.85}
          >
            <View style={styles.exitLeft}>
              <MaterialIcons name="place" size={20} color={isActive ? colors.primary : colors.onSurfaceVariant} />
              <Text style={[styles.exitName, isActive && styles.exitNameActive]}>
                {locations[exitId]?.name ?? exitId}
              </Text>
            </View>
            <Text style={styles.exitTime}>
              {isActive ? 'В пути...' : travelSec ? `${travelSec} сек` : '7–10 сек'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundPage },
  header: {
    height: spacing.touchPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundPage,
    ...shadow.card,
  },
  appTitle: { fontSize: 18, fontWeight: '700', color: colors.primary },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.px, gap: spacing.rowGap },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  hpBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.error,
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: colors.backgroundPage,
  },
  hpBadgeText: { fontSize: 9, fontWeight: '700', color: colors.onPrimary },
  statusPills: { flexDirection: 'row', gap: 8, flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' },
  hpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.errorContainer,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: radius.pill,
  },
  hpText: { color: colors.onErrorContainer, fontSize: 12, fontWeight: '600' },
  manaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: radius.pill,
  },
  manaText: { color: colors.onPrimaryContainer, fontSize: 12, fontWeight: '600' },
  invPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: radius.pill,
    ...shadow.card,
  },
  invText: { color: colors.textPrimary, fontSize: 12, fontWeight: '600' },
  travelBar: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.input,
    padding: 16,
    gap: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    ...shadow.card,
  },
  travelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  travelDest: { fontSize: 15, fontWeight: '700', color: colors.primary, flex: 1 },
  travelCancel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.errorContainer,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  travelCancelText: { fontSize: 12, fontWeight: '600', color: colors.onErrorContainer },
  travelHint: { fontSize: 12, color: colors.textSecondary },
  travelTrack: {
    height: 14,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 7,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  travelFill: { height: '100%', backgroundColor: colors.primaryContainer, borderRadius: 7 },
  locCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.py,
    paddingHorizontal: spacing.px,
    ...shadow.card,
  },
  locName: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  locType: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  exitsSection: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
  },
  exitsLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  exitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
  },
  exitRowActive: { backgroundColor: colors.primaryFixed },
  exitRowDisabled: { opacity: 0.45 },
  exitLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  exitName: { fontSize: 16, color: colors.textPrimary, fontWeight: '500' },
  exitNameActive: { color: colors.primary, fontWeight: '700' },
  exitTime: { fontSize: 13, color: colors.textSecondary },
  description: { fontSize: 16, lineHeight: 24, color: colors.onSurfaceVariant, paddingHorizontal: 8 },
  mobRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mobAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobInfo: { flex: 1 },
  mobName: { fontSize: 16, color: colors.textPrimary, fontWeight: '500' },
  mobSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  mobPopupHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: spacing.itemGap },
  mobPopupAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobPopupName: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  mobPopupLevel: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  mobPopupDesc: { fontSize: 15, lineHeight: 22, color: colors.onSurfaceVariant, marginBottom: spacing.itemGap },
  mobStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.itemGap },
  mobStatCell: {
    width: '31%',
    flexGrow: 1,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.input,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
  },
  mobStatLabel: { fontSize: 11, color: colors.textSecondary },
  mobStatValue: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  mobPopupActions: { flexDirection: 'row', gap: spacing.itemGap },
  cityActions: { gap: 0 },
  section: { gap: 8 },
  listCard: { gap: spacing.rowGap },
  chatBar: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    height: spacing.touchPrimary,
    backgroundColor: colors.inverseSurface,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  chatPreview: { flex: 1, color: colors.inverseOnSurface, fontSize: 14 },
});
