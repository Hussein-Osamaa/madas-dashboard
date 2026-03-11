import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, radius, fontSize, fontWeight } from '../theme';

type Props = {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  color?: string;
  onPress: () => void;
};

export const QuickAction = ({ title, subtitle, icon, color, onPress }: Props) => {
  const { colors, isDark } = useTheme();
  const tint = color || colors.primary;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.bgCard,
          ...(isDark
            ? {}
            : {
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: 2,
              }),
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrap, { backgroundColor: tint + '15' }]}>{icon}</View>
      <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>{subtitle}</Text> : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 90,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
});
