import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { gameIcon } from '@/utils/icons';
import { colors, radius, spacing } from '@/theme/colors';

export function PrimaryButton({
  label,
  onPress,
  disabled,
  variant = 'primary',
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  style?: ViewStyle;
}) {
  const bg =
    variant === 'primary'
      ? colors.primary
      : variant === 'secondary'
        ? colors.surfaceContainer
        : 'transparent';
  const fg =
    variant === 'primary'
      ? colors.onPrimary
      : variant === 'secondary'
        ? colors.onSurfaceVariant
        : colors.textSecondary;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.btn, { backgroundColor: bg, opacity: disabled ? 0.5 : 1 }, style]}
      activeOpacity={0.85}
    >
      <Text style={[styles.btnText, { color: fg }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  filled,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
  label?: string;
  filled?: boolean;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.iconBtn} activeOpacity={0.85}>
      <MaterialIcons name={icon} size={22} color={colors.primary} />
      {label ? <Text style={styles.iconLabel}>{label}</Text> : null}
    </TouchableOpacity>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ title, count }: { title: string; count?: number }) {
  return (
    <Text style={styles.sectionTitle}>
      {title}
      {count !== undefined ? ` (${count})` : ''}
    </Text>
  );
}

export function RowItem({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  actionVariant = 'primary',
  disabled,
}: {
  icon: keyof typeof MaterialIcons.glyphMap | string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionVariant?: 'primary' | 'secondary';
  disabled?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={styles.rowIcon}>
          <MaterialIcons name={gameIcon(icon as string)} size={22} color={colors.onSurfaceVariant} />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {actionLabel && onAction ? (
        <PrimaryButton
          label={actionLabel}
          onPress={onAction}
          variant={actionVariant === 'secondary' ? 'secondary' : 'primary'}
          disabled={disabled}
          style={styles.rowAction}
        />
      ) : null}
    </View>
  );
}

export function TopBar({
  title,
  onClose,
  onBack,
}: {
  title: string;
  onClose?: () => void;
  onBack?: () => void;
}) {
  return (
    <View style={styles.topBar}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.topBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
      ) : (
        <View style={styles.topBtn} />
      )}
      <Text style={styles.topTitle} numberOfLines={1}>
        {title}
      </Text>
      {onClose ? (
        <TouchableOpacity onPress={onClose} style={styles.topBtn}>
          <MaterialIcons name="close" size={24} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
      ) : (
        <View style={styles.topBtn} />
      )}
    </View>
  );
}

export function FullScreenOverlay({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.overlay}>
      <TopBar title={title} onClose={onClose} />
      <View style={styles.overlayBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: spacing.touchMin,
    paddingHorizontal: 24,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.py,
    paddingHorizontal: spacing.px,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  rowIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 16, color: colors.textPrimary, fontWeight: '500' },
  rowSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  rowAction: { paddingHorizontal: 20 },
  topBar: {
    height: spacing.touchPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.px,
    backgroundColor: colors.backgroundPage,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceContainerHighest,
  },
  topBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.backgroundPage,
    zIndex: 100,
  },
  overlayBody: { flex: 1, padding: spacing.px },
});
