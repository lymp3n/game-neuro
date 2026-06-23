import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useGame } from '@/context/GameContext';
import { PrimaryButton } from '@/components/ui';
import { gameIcon } from '@/utils/icons';
import { colors, radius, shadow, spacing } from '@/theme/colors';

const STITCH_BLUE = '#3B82F6';

export function BattleResultScreen() {
  const { battle, player, items, closeAllOverlays } = useGame();
  if (!battle || !player) return null;

  const isVictory = battle.result === 'victory' || battle.status === 'won';
  const xp = battle.rewards?.xp ?? 0;
  const loot: string[] = battle.rewards?.loot ?? [];

  return (
    <View style={styles.overlay}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <MaterialIcons
            name={isVictory ? 'emoji-events' : 'heart-broken'}
            size={64}
            color={isVictory ? STITCH_BLUE : colors.error}
          />
          <Text style={[styles.title, isVictory && styles.titleVictory]}>
            {isVictory ? 'Победа!' : 'Поражение'}
          </Text>
          <Text style={styles.subtitle}>
            {isVictory
              ? `Вы победили ${battle.mobName}`
              : `Бой с ${battle.mobName ?? 'противником'} проигран`}
          </Text>
        </View>

        {isVictory && xp > 0 ? (
          <View style={styles.xpBanner}>
            <MaterialIcons name="star" size={22} color={STITCH_BLUE} />
            <Text style={styles.xpText}>
              Опыт: <Text style={styles.xpValue}>+{xp}</Text>
            </Text>
          </View>
        ) : null}

        {isVictory ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ЛУТ</Text>
            <View style={styles.lootCard}>
              {loot.length > 0 ? (
                loot.map((itemId, i) => (
                  <View key={`${itemId}-${i}`} style={styles.lootRow}>
                    <View style={styles.lootIcon}>
                      <MaterialIcons
                        name={gameIcon(items[itemId]?.icon) || 'inventory'}
                        size={22}
                        color={colors.onSurfaceVariant}
                      />
                    </View>
                    <Text style={styles.lootName}>{items[itemId]?.name ?? itemId}</Text>
                    <View style={styles.lootBadge}>
                      <Text style={styles.lootBadgeText}>Предмет</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.noLoot}>Лут выпал на локацию — подберите с земли.</Text>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.defeatCard}>
            <MaterialIcons name="info-outline" size={22} color={colors.onSurfaceVariant} />
            <Text style={styles.defeatHint}>
              Вы возвращаетесь на локацию. Восстановите HP в городе или с помощью зелий и попробуйте снова.
            </Text>
          </View>
        )}

        <View style={styles.statsRow}>
          <Text style={styles.statsText}>
            HP {player.hp}/{player.maxHp}
            {isVictory ? ` · Ур. ${player.level}` : ''}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label="Продолжить"
          onPress={closeAllOverlays}
          style={styles.continueBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.backgroundPage,
    zIndex: 50,
  },
  scroll: {
    paddingHorizontal: spacing.px,
    paddingTop: 48,
    paddingBottom: 120,
    gap: 16,
  },
  header: { alignItems: 'center', gap: 8, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: colors.textPrimary },
  titleVictory: { color: STITCH_BLUE },
  subtitle: { fontSize: 16, color: colors.onSurfaceVariant, textAlign: 'center' },
  xpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.input,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    ...shadow.card,
  },
  xpText: { fontSize: 15, color: colors.onSurfaceVariant, fontWeight: '500' },
  xpValue: { fontWeight: '700', color: colors.textPrimary },
  section: { gap: 8 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1,
    paddingHorizontal: 4,
  },
  lootCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
    ...shadow.card,
  },
  lootRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  lootIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lootName: { flex: 1, fontSize: 16, fontWeight: '500', color: colors.textPrimary },
  lootBadge: {
    backgroundColor: 'rgba(59,130,246,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  lootBadgeText: { fontSize: 12, fontWeight: '600', color: STITCH_BLUE },
  noLoot: { padding: 20, fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  defeatCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.errorContainer,
    borderRadius: radius.card,
    padding: 16,
    alignItems: 'flex-start',
  },
  defeatHint: { flex: 1, fontSize: 15, lineHeight: 22, color: colors.onErrorContainer },
  statsRow: { alignItems: 'center', marginTop: 8 },
  statsText: { fontSize: 14, color: colors.onSurfaceVariant },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.px,
    paddingBottom: 28,
    paddingTop: 12,
    backgroundColor: colors.backgroundPage,
  },
  continueBtn: {
    backgroundColor: STITCH_BLUE,
    borderRadius: radius.pill,
    height: 56,
  },
});
