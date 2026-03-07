import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOrders } from '../hooks/useOrders';
import { useProducts, getTotalStock, isLowStock, isOutOfStock } from '../hooks/useProducts';
import { useFinanceOverview } from '../hooks/useFinance';
import { useBusiness } from '../contexts/BusinessContext';
import { KpiCard } from '../components/KpiCard';
import { colors, spacing, radius, fontSize, fontWeight } from '../theme';
import type { Order, OrderStatus } from '../types';

const STATUS_COLORS: Record<string, string> = {
  pending: colors.statusPending,
  processing: colors.statusProcessing,
  shipped: colors.statusShipped,
  delivered: colors.statusDelivered,
  completed: colors.success,
  cancelled: colors.statusCancelled,
  returned: colors.statusReturned,
};

export const AnalyticsScreen = () => {
  const { formatCurrency } = useBusiness();
  const { data: orders, isLoading: ordersLoading, refetch: refetchOrders } = useOrders();
  const { data: products, refetch: refetchProducts } = useProducts();
  const { data: finance, refetch: refetchFinance } = useFinanceOverview();

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchOrders(), refetchProducts(), refetchFinance()]);
    setRefreshing(false);
  };

  const orderStats = useMemo(() => {
    const list = orders || [];
    const statusMap: Record<string, number> = {};
    let totalRevenue = 0;
    let avgOrderValue = 0;

    list.forEach((o) => {
      statusMap[o.status] = (statusMap[o.status] || 0) + 1;
      if (!['cancelled', 'returned', 'damaged'].includes(o.status)) {
        totalRevenue += o.total || 0;
      }
    });

    const activeOrders = list.filter((o) => !['cancelled', 'returned', 'damaged'].includes(o.status));
    avgOrderValue = activeOrders.length > 0 ? totalRevenue / activeOrders.length : 0;

    return { statusMap, totalRevenue, avgOrderValue, total: list.length };
  }, [orders]);

  const inventoryStats = useMemo(() => {
    const list = products || [];
    const lowStock = list.filter(isLowStock).length;
    const outOfStock = list.filter(isOutOfStock).length;
    const totalItems = list.reduce((sum, p) => sum + getTotalStock(p), 0);
    const totalValue = list.reduce((sum, p) => {
      const price = p.sellingPrice || p.price || 0;
      return sum + price * getTotalStock(p);
    }, 0);
    return { total: list.length, lowStock, outOfStock, totalItems, totalValue };
  }, [products]);

  // Top products by stock level (lowest first)
  const lowStockProducts = useMemo(() => {
    return (products || [])
      .filter((p) => getTotalStock(p) <= (p.lowStockAlert ?? 5))
      .sort((a, b) => getTotalStock(a) - getTotalStock(b))
      .slice(0, 5);
  }, [products]);

  if (ordersLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      {/* Revenue & Profit */}
      <Text style={styles.sectionTitle}>Financial Overview</Text>
      <View style={styles.kpiRow}>
        <KpiCard
          title="Revenue"
          value={formatCurrency(finance?.totalSales || orderStats.totalRevenue)}
          color={colors.success}
          icon={<Ionicons name="trending-up" size={16} color={colors.success} />}
        />
        <KpiCard
          title="Net Profit"
          value={formatCurrency(finance?.netProfit || 0)}
          color={finance && finance.netProfit >= 0 ? colors.success : colors.danger}
          icon={<Ionicons name="cash-outline" size={16} color={finance && finance.netProfit >= 0 ? colors.success : colors.danger} />}
        />
      </View>
      <View style={styles.kpiRow}>
        <KpiCard
          title="Expenses"
          value={formatCurrency(finance?.totalExpenses || 0)}
          color={colors.danger}
          icon={<Ionicons name="arrow-down-circle-outline" size={16} color={colors.danger} />}
        />
        <KpiCard
          title="Avg Order"
          value={formatCurrency(orderStats.avgOrderValue)}
          color={colors.info}
          icon={<Ionicons name="calculator-outline" size={16} color={colors.info} />}
        />
      </View>

      {/* Order Breakdown */}
      <Text style={styles.sectionTitle}>Order Status Breakdown</Text>
      <View style={styles.breakdownCard}>
        {Object.entries(orderStats.statusMap)
          .sort((a, b) => b[1] - a[1])
          .map(([status, count]) => {
            const pct = orderStats.total > 0 ? (count / orderStats.total) * 100 : 0;
            return (
              <View key={status} style={styles.breakdownRow}>
                <View style={[styles.breakdownDot, { backgroundColor: STATUS_COLORS[status] || colors.textMuted }]} />
                <Text style={styles.breakdownLabel}>{status.replace(/_/g, ' ')}</Text>
                <View style={styles.barWrap}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.max(pct, 2)}%`,
                        backgroundColor: STATUS_COLORS[status] || colors.textMuted,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.breakdownCount}>{String(count)}</Text>
                <Text style={styles.breakdownPct}>{pct.toFixed(0) + '%'}</Text>
              </View>
            );
          })}
        {Object.keys(orderStats.statusMap).length === 0 && (
          <Text style={styles.noDataText}>No orders data</Text>
        )}
      </View>

      {/* Inventory Summary */}
      <Text style={styles.sectionTitle}>Inventory Summary</Text>
      <View style={styles.kpiRow}>
        <KpiCard
          title="Products"
          value={String(inventoryStats.total)}
          subtitle={String(inventoryStats.totalItems) + ' total units'}
          color={colors.primary}
          icon={<Ionicons name="cube-outline" size={16} color={colors.primary} />}
        />
        <KpiCard
          title="Inventory Value"
          value={formatCurrency(inventoryStats.totalValue)}
          color={colors.accent}
          icon={<Ionicons name="pricetag-outline" size={16} color={colors.accent} />}
        />
      </View>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Low Stock Alerts</Text>
          <View style={styles.alertCard}>
            {lowStockProducts.map((p) => {
              const total = getTotalStock(p);
              return (
                <View key={p.id} style={styles.alertRow}>
                  <View style={[styles.alertDot, { backgroundColor: total === 0 ? colors.danger : colors.warning }]} />
                  <Text style={styles.alertName} numberOfLines={1}>{p.name}</Text>
                  <Text
                    style={[
                      styles.alertStock,
                      { color: total === 0 ? colors.danger : colors.warning },
                    ]}
                  >
                    {total === 0 ? 'Out' : String(total) + ' left'}
                  </Text>
                </View>
              );
            })}
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  loadingWrap: { flex: 1, backgroundColor: colors.bgPrimary, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.lg, paddingBottom: 100 },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  kpiRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  breakdownCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  breakdownDot: { width: 8, height: 8, borderRadius: 4 },
  breakdownLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    width: 90,
    textTransform: 'capitalize',
  },
  barWrap: {
    flex: 1,
    height: 6,
    backgroundColor: colors.bgSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
  breakdownCount: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    width: 30,
    textAlign: 'right',
  },
  breakdownPct: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    width: 36,
    textAlign: 'right',
  },
  noDataText: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: 'center' },
  alertCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  alertDot: { width: 8, height: 8, borderRadius: 4 },
  alertName: { color: colors.textPrimary, fontSize: fontSize.sm, flex: 1 },
  alertStock: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
});
