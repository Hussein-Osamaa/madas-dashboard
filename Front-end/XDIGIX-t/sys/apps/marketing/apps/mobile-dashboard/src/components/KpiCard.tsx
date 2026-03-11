import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, radius, fontSize, fontWeight } from '../theme';

type Props = {
  title: string;
  value: string;
  subtitle?: string;
  color?: string;
  icon?: React.ReactNode;
};

export const KpiCard = ({ title, value, subtitle, color, icon }: Props) => {
  const { colors, isDark } = useTheme();
  const accentColor = color || colors.primary;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.bgCard,
          borderLeftColor: accentColor,
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
    >
      <View style={styles.header}>
        {icon ? (
          <View style={[styles.iconWrap, { backgroundColor: accentColor + '15' }]}>{icon}</View>
        ) : null}
        <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
      </View>
      <Text
        style={[styles.value, { color: accentColor }]}
        numberOfLines={1}
        ellipsizeMode="tail"
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value}
      </Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    padding: spacing.lg,
    borderLeftWidth: 3,
    flex: 1,
    minWidth: 140,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    marginBottom: 2,
    flexShrink: 1,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  subtitle: {
    fontSize: fontSize.xs,
  },
});
