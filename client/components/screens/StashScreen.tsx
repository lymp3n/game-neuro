import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useGame } from '@/context/GameContext';
import { FullScreenOverlay, PrimaryButton } from '@/components/ui';
import { Popup } from '@/components/ui/Popup';
import { gameIcon } from '@/utils/icons';
import { colors, shadow, spacing } from '@/theme/colors';

export function StashScreen() {
  const { player, items, closeOverlay, send } = useGame();
  const [tab, setTab] = useState<'stash' | 'inventory'>('stash');
  const [selected, setSelected] = useState<any>(null);

  if (!player) return null;

  const list = tab === 'stash' ? player.stash : player.inventory;
  const item = selected ? items[selected.itemId] : null;

  return (
    <FullScreenOverlay title="Личный сундук" onClose={closeOverlay}>
      <View style={styles.tabs}>
        <PrimaryButton label="Сундук" variant={tab === 'stash' ? 'primary' : 'secondary'} onPress={() => setTab('stash')} style={styles.tab} />
        <PrimaryButton label="Инвентарь" variant={tab === 'inventory' ? 'primary' : 'secondary'} onPress={() => setTab('inventory')} style={styles.tab} />
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {list.length === 0 ? (
          <Text style={styles.empty}>Пусто</Text>
        ) : (
          list.map((inv: any) => {
            const it = items[inv.itemId];
            return (
              <View key={`${tab}-${inv.itemId}`} style={styles.row}>
                <View style={styles.rowLeft}>
                  <MaterialIcons name={gameIcon(it?.icon)} size={22} color={colors.onSurfaceVariant} />
                  <Text style={styles.itemName}>{it?.name ?? inv.itemId} x{inv.count}</Text>
                </View>
                <PrimaryButton label="..." onPress={() => setSelected({ ...inv, from: tab })} style={styles.infoBtn} />
              </View>
            );
          })
        )}
      </ScrollView>

      <Popup visible={!!selected} onClose={() => setSelected(null)} title={item?.name}>
        {selected?.from === 'stash' ? (
          <PrimaryButton label="Взять" onPress={() => { send('stash_withdraw', { itemId: selected.itemId }); setSelected(null); }} />
        ) : (
          <PrimaryButton label="Положить" onPress={() => { send('stash_deposit', { itemId: selected.itemId }); setSelected(null); }} />
        )}
      </Popup>
    </FullScreenOverlay>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  tab: { flex: 1 },
  list: { gap: 10, paddingBottom: 40 },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    ...shadow.card,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemName: { fontSize: 16, color: colors.textPrimary },
  infoBtn: { paddingHorizontal: 16 },
});
