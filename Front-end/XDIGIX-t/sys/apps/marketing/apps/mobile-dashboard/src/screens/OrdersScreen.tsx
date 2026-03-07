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
import { colors, spacing, radius, fontSize, fontWeight } from '../theme';
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

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => setExpandedId(expanded ? null : item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.customerName} numberOfLines={1}>{item.customerName}</Text>
            {item.customerContact ? (
              <Text style={styles.contactText}>{item.customerContact}</Text>
            ) : null}
          </View>
          <Text style={styles.totalText}>{formatCurrency(item.total)}</Text>
        </View>

        <View style={styles.orderMeta}>
          <StatusBadge status={item.status} />
            <Text style={styles.itemCount}>
            {String(item.productCount) + ' item' + (item.productCount !== 1 ? 's' : '')}
          </Text>
          {item.date ? (
            <Text style={styles.dateText}>
              {new Date(item.date).toLocaleDateString()}
            </Text>
          ) : null}
        </View>

        {expanded && (
          <View style={styles.expandedSection}>
            {item.items && item.items.length > 0 ? (
              <View style={styles.itemsList}>
                {item.items.map((it, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {it.name}
                    </Text>
                    <Text style={styles.itemQty}>{'x' + String(it.quantity)}</Text>
                    <Text style={styles.itemPrice}>{formatCurrency(it.price)}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {item.shippingAddress?.city ? (
              <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                <Text style={styles.addressText}>
                  {[item.shippingAddress.address, item.shippingAddress.city]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
              </View>
            ) : null}

            {item.bostaTrackingNumber ? (
              <View style={styles.trackingRow}>
                <Ionicons name="navigate-outline" size={14} color={colors.info} />
                <Text style={styles.trackingText}>
                  {'Tracking: ' + item.bostaTrackingNumber}
                </Text>
              </View>
            ) : null}

            {canAdvance ? (
              <TouchableOpacity
                style={styles.advanceBtn}
                onPress={() => handleAdvanceStatus(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-forward-circle" size={18} color={colors.textInverse} />
                <Text style={styles.advanceBtnText}>
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
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setStatusFilter(f.value)}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {f.label}
              </Text>
              {count > 0 ? (
                <View style={[styles.countBadge, active && styles.countBadgeActive]}>
                  <Text style={[styles.countText, active && styles.countTextActive]}>
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
    backgroundColor: colors.bgPrimary,
  },
  loadingWrap: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  filtersRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.bgCard,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: colors.accent,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  filterChipTextActive: {
    color: colors.textInverse,
  },
  countBadge: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  countText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  countTextActive: {
    color: colors.textInverse,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  orderCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  customerName: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  contactText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  totalText: {
    color: colors.accent,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  orderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  itemCount: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  dateText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginLeft: 'auto',
  },
  expandedSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    flex: 1,
  },
  itemQty: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginHorizontal: spacing.md,
  },
  itemPrice: {
    color: colors.textPrimary,
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
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  trackingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  trackingText: {
    color: colors.info,
    fontSize: fontSize.sm,
  },
  advanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  advanceBtnText: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textTransform: 'capitalize',
  },
});
