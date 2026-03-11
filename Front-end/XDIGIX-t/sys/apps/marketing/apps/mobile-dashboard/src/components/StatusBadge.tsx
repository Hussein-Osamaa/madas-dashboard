import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, radius, fontSize, fontWeight } from '../theme';
import type { OrderStatus } from '../types';

const getConfig = (status: OrderStatus, colors: any) => {
  const map: Record<OrderStatus, { label: string; color: string; bg: string }> = {
    pending: { label: 'Pending', color: colors.statusPending, bg: colors.warningBg },
    preparing_for_pickup: { label: 'Preparing', color: colors.info, bg: colors.infoBg },
    ready_for_pickup: { label: 'Ready', color: colors.info, bg: colors.infoBg },
    shipped: { label: 'Shipped', color: colors.statusShipped, bg: 'rgba(139,92,246,0.12)' },
    processing: { label: 'Processing', color: colors.statusProcessing, bg: colors.infoBg },
    delivered: { label: 'Delivered', color: colors.statusDelivered, bg: colors.successBg },
    completed: { label: 'Completed', color: colors.success, bg: colors.successBg },
    returned: { label: 'Returned', color: colors.statusReturned, bg: 'rgba(249,115,22,0.12)' },
    damaged: { label: 'Damaged', color: colors.danger, bg: colors.dangerBg },
    cancelled: { label: 'Cancelled', color: colors.statusCancelled, bg: colors.dangerBg },
  };
  return map[status] || map.pending;
};

export const StatusBadge = ({ status }: { status: OrderStatus }) => {
  const { colors } = useTheme();
  const config = getConfig(status, colors);

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    gap: 5,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
});
