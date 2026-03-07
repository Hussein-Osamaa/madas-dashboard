import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../theme';

type Props = {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  color?: string;
  onPress: () => void;
};

export const QuickAction = ({ title, subtitle, icon, color = colors.primary, onPress }: Props) => (
  <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.iconWrap, { backgroundColor: color + '20' }]}>{icon}</View>
    <Text style={styles.title} numberOfLines={1}>{title}</Text>
    {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgCard,
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
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
});
