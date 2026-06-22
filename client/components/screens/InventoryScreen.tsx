import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useGame } from '@/context/GameContext';
import { FullScreenOverlay, PrimaryButton } from '@/components/ui';
import { Popup } from '@/components/ui/Popup';
import { gameIcon } from '@/utils/icons';
import { colors, shadow, spacing } from '@/theme/colors';

export function InventoryScreen() {
  const { player, items, location, inventoryFilter, closeOverlay, send } = useGame();
  const [selected, setSelected] = useState<any>(null);
  const [sellConfirm, setSellConfirm] = useState(false);

  if (!player) return null;

  const isCity = location?.type === 'city';
  let inventory = player.inventory;

  if (inventoryFilter) {
    inventory = inventory.filter((inv: any) => {
      const item = items[inv.itemId];
      return item?.slot === inventoryFilter;
    });
  }

  const item = selected ? items[selected.itemId] : null;

  return (
    <FullScreenOverlay title="Инвентарь" onClose={closeOverlay}>
      <Text style={styles.counter}>
        {player.inventoryCount}/{player.inventoryLimit}
        {inventoryFilter ? ` · слот: ${inventoryFilter}` : ''}
      </Text>
      <ScrollView contentContainerStyle={styles.list}>
        {inventory.length === 0 ? (
          <Text style={styles.empty}>Инвентарь пуст</Text>
        ) : (
          inventory.map((inv: any) => {
            const it = items[inv.itemId];
            return (
              <View key={inv.itemId} style={styles.row}>
                <View style={styles.rowLeft}>
                  <MaterialIcons name={gameIcon(it?.icon)} size={22} color={colors.onSurfaceVariant} />
                  <View>
                    <Text style={styles.itemName}>{it?.name ?? inv.itemId}</Text>
                    <Text style={styles.itemCount}>x{inv.count}</Text>
                  </View>
                </View>
                <PrimaryButton label="..." onPress={() => setSelected(inv)} style={styles.infoBtn} />
              </View>
            );
          })
        )}
      </ScrollView>

      <Popup
        visible={!!selected}
        onClose={() => { setSelected(null); setSellConfirm(false); }}
        title={item?.name}
      >
        {item ? (
          <View style={styles.actions}>
            {item.type === 'potion' ? (
              <PrimaryButton label="Использовать" onPress={() => { send('use_item', { itemId: item.id }); setSelected(null); }} />
            ) : null}
            {item.slot ? (
              <PrimaryButton label="Экипировать" onPress={() => { send('equip', { itemId: item.id }); setSelected(null); }} />
            ) : null}
            {isCity && item.sellPrice > 0 ? (
              sellConfirm ? (
                <View style={styles.sellRow}>
                  <Text style={styles.sellPrice}>Продать за {item.sellPrice} золота?</Text>
                  <PrimaryButton label="Продать" onPress={() => { send('sell', { itemId: item.id }); setSelected(null); setSellConfirm(false); }} />
                  <PrimaryButton label="Отмена" variant="secondary" onPress={() => setSellConfirm(false)} />
                </View>
              ) : (
                <PrimaryButton label={`Продать (${item.sellPrice})`} variant="secondary" onPress={() => setSellConfirm(true)} />
              )
            ) : null}
            <PrimaryButton label="Закрыть" variant="ghost" onPress={() => setSelected(null)} />
          </View>
        ) : null}
      </Popup>
    </FullScreenOverlay>
  );
}

const styles = StyleSheet.create({
  counter: { fontSize: 13, color: colors.textSecondary, marginBottom: 12 },
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
  itemName: { fontSize: 16, fontWeight: '500', color: colors.textPrimary },
  itemCount: { fontSize: 13, color: colors.textSecondary },
  infoBtn: { paddingHorizontal: 16 },
  actions: { gap: 10 },
  sellRow: { gap: 8 },
  sellPrice: { textAlign: 'center', color: colors.textSecondary },
});
