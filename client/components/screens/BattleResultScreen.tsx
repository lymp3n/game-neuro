import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useGame } from '@/context/GameContext';
import { FullScreenOverlay, PrimaryButton } from '@/components/ui';
import { colors, radius, shadow, spacing } from '@/theme/colors';

export function BattleResultScreen() {
  const { battle, player, items, closeAllOverlays } = useGame();
  if (!battle || !player) return null;

  const isVictory = battle.result === 'victory' || battle.status === 'won';
  const xp = battle.rewards?.xp ?? 0;
  const loot: string[] = battle.rewards?.loot ?? [];

  return (
    <FullScreenOverlay title={isVictory ? 'Победа!' : 'Поражение'} onClose={closeAllOverlays}>
      <View style={styles.body}>
        <View style={[styles.iconCircle, isVictory ? styles.iconVictory : styles.iconDefeat]}>
          <MaterialIcons
            name={isVictory ? 'emoji-events' : 'heart-broken'}
            size={56}
            color={isVictory ? colors.primary : colors.error}
          />
        </View>

        <Text style={styles.title}>{isVictory ? 'Победа!' : 'Вы повержены'}</Text>
        <Text style={styles.subtitle}>
          {isVictory ? `${battle.mobName} повержен` : `Бой с ${battle.mobName ?? 'противником'} проигран`}
        </Text>

        {isVictory ? (
          <View style={styles.rewardsCard}>
            <Text style={styles.rewardsTitle}>Награды</Text>
            {xp > 0 ? (
              <View style={styles.rewardRow}>
                <MaterialIcons name="star" size={22} color={colors.tertiaryContainer} />
                <Text style={styles.rewardText}>+{xp} опыта</Text>
              </View>
            ) : null}
            {loot.length > 0 ? (
              loot.map((itemId, i) => (
                <View key={`${itemId}-${i}`} style={styles.rewardRow}>
                  <MaterialIcons name="inventory" size={22} color={colors.onSurfaceVariant} />
                  <Text style={styles.rewardText}>{items[itemId]?.name ?? itemId}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noLoot}>Лут выпал на локацию</Text>
            )}
            <Text style={styles.playerStats}>
              HP: {player.hp}/{player.maxHp} · Ур. {player.level}
            </Text>
          </View>
        ) : (
          <View style={styles.rewardsCard}>
            <Text style={styles.defeatHint}>Вы возвращаетесь на локацию. Восстановите HP и попробуйте снова.</Text>
            <Text style={styles.playerStats}>
              HP: {player.hp}/{player.maxHp}
            </Text>
          </View>
        )}

        <PrimaryButton label="Продолжить" onPress={closeAllOverlays} style={styles.continueBtn} />
      </View>
    </FullScreenOverlay>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', paddingTop: 24, gap: 16 },
  iconCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  iconVictory: { backgroundColor: colors.primaryFixed },
  iconDefeat: { backgroundColor: colors.errorContainer },
  title: { fontSize: 28, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 16, color: colors.textSecondary, textAlign: 'center' },
  rewardsCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.py,
    gap: 12,
    ...shadow.card,
  },
  rewardsTitle: { fontSize: 16, fontWeight: '700', color: colors.primary },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rewardText: { fontSize: 16, color: colors.textPrimary },
  noLoot: { fontSize: 14, color: colors.textSecondary },
  defeatHint: { fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
  playerStats: { fontSize: 14, color: colors.onSurfaceVariant, marginTop: 4 },
  continueBtn: { width: '100%', marginTop: 8 },
});
