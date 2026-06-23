import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGame } from '@/context/GameContext';
import { LoginScreen } from '@/components/screens/LoginScreen';
import { CharacterSelectScreen } from '@/components/screens/CharacterSelectScreen';
import { MainScreen } from '@/components/screens/MainScreen';
import { CharacterScreen } from '@/components/screens/CharacterScreen';
import { SpellScreen } from '@/components/screens/SpellScreen';
import { InventoryScreen } from '@/components/screens/InventoryScreen';
import { StashScreen } from '@/components/screens/StashScreen';
import { MerchantScreen } from '@/components/screens/MerchantScreen';
import { DungeonScreen } from '@/components/screens/DungeonScreen';
import { ChatScreen } from '@/components/screens/ChatScreen';
import { BattleScreen } from '@/components/screens/BattleScreen';
import { BattleResultScreen } from '@/components/screens/BattleResultScreen';
import { TutorialOverlay } from '@/components/TutorialOverlay';
import { colors, radius, shadow } from '@/theme/colors';

export function GameApp() {
  const { account, player, overlay, toast, connected } = useGame();

  if (!account) {
    return <LoginScreen />;
  }

  if (!player) {
    return <CharacterSelectScreen />;
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {overlay !== 'battle' && overlay !== 'chat' && overlay !== 'battle_result' ? <MainScreen /> : null}
      {overlay === 'character' ? <CharacterScreen /> : null}
      {overlay === 'spells' ? <SpellScreen /> : null}
      {overlay === 'inventory' ? <InventoryScreen /> : null}
      {overlay === 'stash' ? <StashScreen /> : null}
      {overlay === 'merchant' ? <MerchantScreen /> : null}
      {overlay === 'dungeon' ? <DungeonScreen /> : null}
      {overlay === 'chat' ? <ChatScreen /> : null}
      {overlay === 'battle' ? <BattleScreen /> : null}
      {overlay === 'battle_result' ? <BattleResultScreen /> : null}

      <TutorialOverlay />

      {!connected ? (
        <View style={styles.offline}>
          <Text style={styles.offlineText}>Переподключение...</Text>
        </View>
      ) : null}

      {toast ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundPage },
  offline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.errorContainer,
    padding: 8,
    alignItems: 'center',
  },
  offlineText: { color: colors.onErrorContainer, fontSize: 13 },
  toast: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: colors.inverseSurface,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.pill,
    ...shadow.card,
  },
  toastText: { color: colors.inverseOnSurface, fontSize: 14 },
});
