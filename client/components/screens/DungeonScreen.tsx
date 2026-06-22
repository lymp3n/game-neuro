import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useGame } from '@/context/GameContext';
import { FullScreenOverlay, PrimaryButton, RowItem } from '@/components/ui';
import { colors, shadow, spacing } from '@/theme/colors';

const DUNGEON_ID = 'shadow_caves';

export function DungeonScreen() {
  const { player, dungeonGroups, closeOverlay, send } = useGame();

  useEffect(() => {
    send('get_dungeon_groups', { dungeonId: DUNGEON_ID });
    const interval = setInterval(() => send('get_dungeon_groups', { dungeonId: DUNGEON_ID }), 3000);
    return () => clearInterval(interval);
  }, [send]);

  if (!player) return null;

  const myGroup = player.dungeonGroupId
    ? dungeonGroups.find((g) => g.id === player.dungeonGroupId)
    : null;
  const isLeader = myGroup?.isLeader;

  return (
    <FullScreenOverlay title="Пещеры теней" onClose={closeOverlay}>
      <Text style={styles.desc}>Нужна группа из 3 игроков. Пропуск расходуется при запуске подземелья.</Text>

      {!myGroup ? (
        <PrimaryButton
          label="Создать группу"
          onPress={() => send('create_dungeon_group', { dungeonId: DUNGEON_ID })}
          style={styles.createBtn}
        />
      ) : (
        <View style={styles.myGroup}>
          <Text style={styles.myGroupTitle}>Ваша группа</Text>
          <Text style={styles.myGroupMeta}>
            {myGroup.memberCount}/{myGroup.requiredSize} участников
          </Text>
          {isLeader ? (
            <PrimaryButton
              label="Запустить подземелье"
              onPress={() => send('launch_dungeon')}
              disabled={myGroup.memberCount < myGroup.requiredSize}
              style={{ marginTop: 12 }}
            />
          ) : (
            <Text style={styles.waiting}>Ожидание лидера...</Text>
          )}
          <PrimaryButton label="Покинуть группу" variant="secondary" onPress={() => send('leave_dungeon_group')} style={{ marginTop: 8 }} />
        </View>
      )}

      <Text style={styles.sectionLabel}>Группы в лобби</Text>
      <ScrollView contentContainerStyle={styles.list}>
        {dungeonGroups.length === 0 ? (
          <Text style={styles.empty}>Нет активных групп</Text>
        ) : (
          dungeonGroups.map((g) => (
            <View key={g.id} style={styles.groupCard}>
              <RowItem
                icon="groups"
                title={`Лидер: ${g.leaderName}`}
                subtitle={`${g.memberCount}/${g.requiredSize}`}
                actionLabel={g.isMember ? undefined : 'Join'}
                onAction={g.isMember ? undefined : () => send('join_dungeon_group', { groupId: g.id })}
                disabled={g.memberCount >= g.requiredSize}
              />
            </View>
          ))
        )}
      </ScrollView>
    </FullScreenOverlay>
  );
}

const styles = StyleSheet.create({
  desc: { fontSize: 15, color: colors.textSecondary, marginBottom: 16, lineHeight: 22 },
  createBtn: { marginBottom: 20 },
  myGroup: {
    backgroundColor: colors.primaryFixed,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    ...shadow.card,
  },
  myGroupTitle: { fontSize: 16, fontWeight: '700', color: colors.primary },
  myGroupMeta: { fontSize: 14, color: colors.onSurfaceVariant, marginTop: 4 },
  waiting: { fontSize: 13, color: colors.textSecondary, marginTop: 12 },
  sectionLabel: { fontSize: 14, fontWeight: '500', color: colors.onSurfaceVariant, marginBottom: 8 },
  list: { gap: 10, paddingBottom: 40 },
  empty: { color: colors.textSecondary, textAlign: 'center' },
  groupCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 8, ...shadow.card },
});
