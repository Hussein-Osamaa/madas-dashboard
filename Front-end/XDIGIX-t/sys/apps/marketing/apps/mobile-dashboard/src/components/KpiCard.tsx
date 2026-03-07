import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../theme';

type Props = {
  title: string;
  value: string;
  subtitle?: string;
  color?: string;
  icon?: React.ReactNode;
};

export const KpiCard = ({ title, value, subtitle, color = colors.primary, icon }: Props) => (
  <View style={[styles.card, { borderLeftColor: color }]}>
    <View style={styles.header}>
    {icon ? <View style={[styles.iconWrap, { backgroundColor: color + '20' }]}>{icon}</View> : null}
    <Text style={styles.title}>{title}</Text>
    </View>
    <Text style={[styles.value, { color }]}>{value}</Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
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
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    marginBottom: 2,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
});
