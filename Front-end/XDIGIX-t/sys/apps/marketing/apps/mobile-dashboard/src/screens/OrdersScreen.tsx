import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOrders, useUpdateOrderStatus } from '../hooks/useOrders';
import { useBusiness } from '../contexts/BusinessContext';
import { SearchBar } from '../components/SearchBar';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, radius, fontSize, fontWeight } from '../theme';
import type { Order, OrderStatus } from '../types';

const STATUS_FILTERS: { label: string; value: OrderStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Processing', value: 'processing' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'processing',
  processing: 'shipped',
  shipped: 'delivered',
  delivered: 'completed',
};

export const OrdersScreen = () => {
  const { colors, isDark } = useTheme();
  const { formatCurrency } = useBusiness();
  const { data: orders, isLoading, refetch } = useOrders();
  const updateStatus = useUpdateOrderStatus();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    let list = orders || [];
    if (statusFilter !== 'all') {
      list = list.filter((o) => o.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.customerName?.toLowerCase().includes(q) ||
          o.id?.toLowerCase().includes(q) ||
          o.customerContact?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, statusFilter, search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleAdvanceStatus = (order: Order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    Alert.alert(
      'Update Status',
      `Move order to "${next.replace(/_/g, ' ')}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => updateStatus.mutate({ orderId: order.id, status: next }),
        },
      ]
    );
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: (orders || []).length };
    (orders || []).forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return counts;
  }, [orders]);

  const renderOrder = ({ item }: { item: Order }) => {
    const expanded = expandedId === item.id;
    const canAdvance = !!NEXT_STATUS[item.status];
    const cardStyle = [
      styles.orderCard,
      { backgroundColor: colors.bgCard },
      !isDark && {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
      },
    ];

    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={() => setExpandedId(expanded ? null : item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.customerName, { color: colors.textPrimary }]} numberOfLines={1}>{item.customerName}</Text>
            {item.customerContact ? (
              <Text style={[styles.contactText, { color: colors.textMuted }]}>{item.customerContact}</Text>
            ) : null}
          </View>
          <Text style={[styles.totalText, { color: colors.accent }]}>{formatCurrency(item.total)}</Text>
        </View>

        <View style={styles.orderMeta}>
          <StatusBadge status={item.status} />
            <Text style={[styles.itemCount, { color: colors.textMuted }]}>
            {String(item.productCount) + ' item' + (item.productCount !== 1 ? 's' : '')}
          </Text>
          {item.date ? (
            <Text style={[styles.dateText, { color: colors.textMuted }]}>
              {new Date(item.date).toLocaleDateString()}
            </Text>
          ) : null}
        </View>

        {expanded && (
          <View style={[styles.expandedSection, { borderTopColor: colors.border }]}>
            {item.items && item.items.length > 0 ? (
              <View style={styles.itemsList}>
                {item.items.map((it, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <Text style={[styles.itemName, { color: colors.textSecondary }]} numberOfLines={1}>
                      {it.name}
                    </Text>
                    <Text style={[styles.itemQty, { color: colors.textMuted }]}>{'x' + String(it.quantity)}</Text>
                    <Text style={[styles.itemPrice, { color: colors.textPrimary }]}>{formatCurrency(it.price)}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {item.shippingAddress?.city ? (
              <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                <Text style={[styles.addressText, { color: colors.textMuted }]}>
                  {[item.shippingAddress.address, item.shippingAddress.city]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
              </View>
            ) : null}

            {item.bostaTrackingNumber ? (
              <View style={styles.trackingRow}>
                <Ionicons name="navigate-outline" size={14} color={colors.info} />
                <Text style={[styles.trackingText, { color: colors.info }]}>
                  {'Tracking: ' + item.bostaTrackingNumber}
                </Text>
              </View>
            ) : null}

            {canAdvance ? (
              <TouchableOpacity
                style={[styles.advanceBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleAdvanceStatus(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-forward-circle" size={18} color={colors.textInverse} />
                <Text style={[styles.advanceBtnText, { color: colors.textPrimary }]}>
                  {'Move to ' + (NEXT_STATUS[item.status]?.replace(/_/g, ' ') || '')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingWrap, { backgroundColor: colors.bgPrimary }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <View style={styles.searchWrap}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search orders..." />
      </View>

      {/* Status filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
      >
        {STATUS_FILTERS.map((f) => {
          const active = statusFilter === f.value;
          const count = statusCounts[f.value] || 0;
          return (
            <TouchableOpacity
              key={f.value}
              style={[
                styles.filterChip,
                { backgroundColor: active ? colors.accent : colors.bgCard },
              ]}
              onPress={() => setStatusFilter(f.value)}
            >
              <Text style={[styles.filterChipText, { color: active ? colors.textInverse : colors.textSecondary }]}>
                {f.label}
              </Text>
              {count > 0 ? (
                <View style={[
                  styles.countBadge,
                  { backgroundColor: active ? 'rgba(0,0,0,0.2)' : colors.bgSecondary },
                ]}
                >
                  <Text style={[styles.countText, { color: active ? colors.textInverse : colors.textMuted }]}>
                    {String(count)}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderOrder}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="No orders found"
            subtitle={search ? 'Try a different search' : 'Orders will appear here'}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  filtersRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    paddingRight: 48,
    gap: spacing.md,
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    alignSelf: 'center',
    minHeight: 36,
    minWidth: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: 0,
    borderRadius: radius.full,
    gap: 6,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  countBadge: {
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  countText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    lineHeight: 14,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
    paddingTop: spacing.xs,
  },
  orderCard: {
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.md,
    paddingRight: spacing.xs,
  },
  customerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  contactText: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  totalText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  orderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  itemCount: {
    fontSize: fontSize.xs,
  },
  dateText: {
    fontSize: fontSize.xs,
    marginLeft: 'auto',
  },
  expandedSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  itemsList: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemName: {
    fontSize: fontSize.sm,
    flex: 1,
  },
  itemQty: {
    fontSize: fontSize.sm,
    marginHorizontal: spacing.md,
  },
  itemPrice: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  addressText: {
    fontSize: fontSize.sm,
  },
  trackingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  trackingText: {
    fontSize: fontSize.sm,
  },
  advanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  advanceBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textTransform: 'capitalize',
  },
});
