import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useGame } from '@/context/GameContext';
import { FullScreenOverlay, PrimaryButton } from '@/components/ui';
import { Popup } from '@/components/ui/Popup';
import { gameIcon } from '@/utils/icons';
import { colors, shadow, spacing } from '@/theme/colors';

export function MerchantScreen() {
  const { player, merchant, items, closeOverlay, send } = useGame();
  const [tab, setTab] = useState<'buy' | 'sell'>('buy');
  const [selected, setSelected] = useState<any>(null);

  if (!player) return null;

  const buyItem = selected?.mode === 'buy' ? items[selected.itemId] : null;
  const sellItem = selected?.mode === 'sell' ? items[selected.itemId] : null;

  return (
    <FullScreenOverlay title="Торговец" onClose={closeOverlay}>
      <Text style={styles.gold}>Золото: {player.gold}</Text>
      <View style={styles.tabs}>
        <PrimaryButton label="Купить" variant={tab === 'buy' ? 'primary' : 'secondary'} onPress={() => setTab('buy')} style={styles.tab} />
        <PrimaryButton label="Продать" variant={tab === 'sell' ? 'primary' : 'secondary'} onPress={() => setTab('sell')} style={styles.tab} />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {tab === 'buy' ? (
          merchant.map((m: any) => (
            <View key={m.itemId} style={styles.row}>
              <View style={styles.rowLeft}>
                <MaterialIcons name={gameIcon(m.icon)} size={22} color={colors.onSurfaceVariant} />
                <View>
                  <Text style={styles.itemName}>{m.name}</Text>
                  <Text style={styles.price}>{m.buyPrice} золота</Text>
                </View>
              </View>
              <PrimaryButton
                label="Купить"
                onPress={() => setSelected({ mode: 'buy', itemId: m.itemId })}
                disabled={player.gold < m.buyPrice}
                style={styles.actionBtn}
              />
            </View>
          ))
        ) : (
          player.inventory.map((inv: any) => {
            const it = items[inv.itemId];
            if (!it?.sellPrice) return null;
            return (
              <View key={inv.itemId} style={styles.row}>
                <View style={styles.rowLeft}>
                  <MaterialIcons name={gameIcon(it.icon)} size={22} color={colors.onSurfaceVariant} />
                  <View>
                    <Text style={styles.itemName}>{it.name} x{inv.count}</Text>
                    <Text style={styles.price}>{it.sellPrice} золота</Text>
                  </View>
                </View>
                <PrimaryButton label="Продать" variant="secondary" onPress={() => setSelected({ mode: 'sell', itemId: inv.itemId })} style={styles.actionBtn} />
              </View>
            );
          })
        )}
      </ScrollView>

      <Popup visible={!!selected} onClose={() => setSelected(null)} title={buyItem?.name ?? sellItem?.name}>
        {selected?.mode === 'buy' && buyItem ? (
          <View style={styles.popupActions}>
            <Text style={styles.popupPrice}>Цена: {buyItem.buyPrice} золота</Text>
            <PrimaryButton label="Купить" onPress={() => { send('buy', { itemId: buyItem.id }); setSelected(null); }} />
            <PrimaryButton label="Отмена" variant="ghost" onPress={() => setSelected(null)} />
          </View>
        ) : null}
        {selected?.mode === 'sell' && sellItem ? (
          <View style={styles.popupActions}>
            <Text style={styles.popupPrice}>Получите: {sellItem.sellPrice} золота</Text>
            <PrimaryButton label="Продать" onPress={() => { send('sell', { itemId: sellItem.id }); setSelected(null); }} />
            <PrimaryButton label="Отмена" variant="ghost" onPress={() => setSelected(null)} />
          </View>
        ) : null}
      </Popup>
    </FullScreenOverlay>
  );
}

const styles = StyleSheet.create({
  gold: { fontSize: 16, fontWeight: '600', color: colors.tertiaryContainer, marginBottom: 12 },
  tabs: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  tab: { flex: 1 },
  list: { gap: 10, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    ...shadow.card,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  itemName: { fontSize: 16, fontWeight: '500', color: colors.textPrimary },
  price: { fontSize: 13, color: colors.textSecondary },
  actionBtn: { paddingHorizontal: 16 },
  popupActions: { gap: 10 },
  popupPrice: { textAlign: 'center', color: colors.textSecondary },
});
