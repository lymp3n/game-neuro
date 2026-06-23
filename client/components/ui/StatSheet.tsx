import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { STAT_LABELS, STAT_ORDER, STAT_ICONS } from '@/constants/game';
import { colors, radius } from '@/theme/colors';

function pct(x: number | undefined) {
  return `${Math.round((x ?? 0) * 100)}%`;
}

export function StatSheet({
  stats,
  derived,
  debuffs,
}: {
  stats: Record<string, number>;
  derived: Record<string, number>;
  debuffs?: { type: string; stat?: string; amount?: number; turnsLeft: number }[];
}) {
  if (!stats || !derived) return null;

  const combat: { label: string; value: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
    { label: 'Здоровье', value: String(derived.maxHp), icon: 'favorite' },
    { label: 'Мана', value: String(derived.maxMana), icon: 'water-drop' },
    { label: 'Ближний урон', value: String(derived.meleeDamage ?? derived.physDamage), icon: 'sports-martial-arts' },
    { label: 'Дальний урон', value: String(derived.rangedDamage ?? derived.physDamage), icon: 'my-location' },
    { label: 'Маг. урон', value: String(derived.magDamage), icon: 'auto-fix-high' },
    { label: 'Физ. защита', value: String(derived.physArmor), icon: 'shield' },
    { label: 'Маг. защита', value: String(derived.magArmor), icon: 'security' },
    { label: 'Уклонение', value: pct(derived.dodgeChance), icon: 'directions-run' },
    { label: 'Шанс крита', value: pct(derived.critChance), icon: 'bolt' },
    { label: 'Защита от крита', value: pct(derived.critDamageTakenReduction), icon: 'verified-user' },
    { label: 'Сопр. дебаффам', value: pct(derived.debuffResist), icon: 'block' },
  ];

  return (
    <View style={styles.wrap}>
      {debuffs && debuffs.length > 0 ? (
        <View style={styles.debuffRow}>
          {debuffs.map((d, i) => (
            <View key={i} style={styles.debuffChip}>
              <MaterialIcons
                name={d.type === 'madness' ? 'psychology' : 'trending-down'}
                size={13}
                color={colors.onErrorContainer}
              />
              <Text style={styles.debuffText}>
                {d.type === 'madness' ? 'Безумие' : `−${d.amount} ${STAT_LABELS[d.stat ?? ''] ?? ''}`} ({d.turnsLeft})
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.section}>Характеристики</Text>
      <View style={styles.grid}>
        {STAT_ORDER.map((s) => (
          <View key={s} style={styles.statCell}>
            <MaterialIcons name={(STAT_ICONS[s] as any) ?? 'star'} size={15} color={colors.primary} />
            <Text style={styles.statLabel} numberOfLines={1}>{STAT_LABELS[s]}</Text>
            <Text style={styles.statValue}>{stats[s] ?? 0}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.section}>Боевые показатели</Text>
      <View style={styles.combatList}>
        {combat.map((c) => (
          <View key={c.label} style={styles.combatRow}>
            <MaterialIcons name={c.icon} size={16} color={colors.onSurfaceVariant} />
            <Text style={styles.combatLabel}>{c.label}</Text>
            <Text style={styles.combatValue}>{c.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  section: { fontSize: 13, fontWeight: '700', color: colors.onSurfaceVariant, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statCell: {
    width: '31%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.input,
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  statLabel: { flex: 1, fontSize: 11, color: colors.textSecondary },
  statValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  combatList: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.input,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  combatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  combatLabel: { flex: 1, fontSize: 13, color: colors.onSurfaceVariant },
  combatValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  debuffRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  debuffChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.errorContainer,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  debuffText: { fontSize: 11, fontWeight: '600', color: colors.onErrorContainer },
});
