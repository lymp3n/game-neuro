import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useGame } from '@/context/GameContext';
import { PrimaryButton } from '@/components/ui';
import { colors, radius, shadow, spacing } from '@/theme/colors';

const STEPS: { title: string; body: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  {
    title: 'Добро пожаловать в TextQuest!',
    body: 'Вы в городе Хейвен — безопасная база. Здесь можно торговать, хранить вещи и отдыхать.',
    icon: 'castle',
  },
  {
    title: 'Статус и ресурсы',
    body: 'Сверху: HP, мана и заполненность инвентаря. Нажмите на иконку персонажа — откроются характеристики.',
    icon: 'favorite',
  },
  {
    title: 'Путешествие',
    body: 'В блоке «Переходы» выберите «Тёмный лес». Дождитесь завершения пути — можно отменить или сменить направление.',
    icon: 'directions-walk',
  },
  {
    title: 'Монстры',
    body: 'Нажмите на строку моба — откроются характеристики. Красная кнопка с мечом — начать бой.',
    icon: 'pets',
  },
  {
    title: 'Бой: ближний и дальний удар',
    body: 'В бою используйте «Ближний» (Сила) или «Дальний» (Ловкость). Заклинания требуют маны — без маны ход не пройдёт.',
    icon: 'sports-martial-arts',
  },
  {
    title: 'Готово!',
    body: 'Побеждайте монстров, распределяйте характеристики и изучайте заклинания. Удачи!',
    icon: 'emoji-events',
  },
];

export function TutorialOverlay() {
  const { player, send, showToast } = useGame();
  if (!player || player.tutorialCompleted) return null;

  const step = Math.min(player.tutorialStep ?? 0, STEPS.length - 1);
  const data = STEPS[step];
  const isLast = step >= STEPS.length - 1;

  const next = () => {
    if (isLast) {
      send('tutorial_complete');
      showToast('Обучение завершено!');
    } else {
      send('tutorial_step', { step: step + 1 });
    }
  };

  const skip = () => send('tutorial_complete');

  return (
    <View style={styles.backdrop} pointerEvents="box-none">
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <MaterialIcons name={data.icon} size={36} color={colors.primary} />
        </View>
        <Text style={styles.stepLabel}>Обучение · шаг {step + 1}/{STEPS.length}</Text>
        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.body}>{data.body}</Text>
        <View style={styles.actions}>
          <TouchableOpacity onPress={skip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Пропустить</Text>
          </TouchableOpacity>
          <PrimaryButton
            label={isLast ? 'Начать игру' : 'Далее'}
            onPress={next}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    padding: spacing.px,
    paddingBottom: 32,
    zIndex: 100,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.card,
    padding: 24,
    ...shadow.card,
    gap: 8,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  stepLabel: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 22, color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  skipBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  skipText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
});
