import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useBusiness } from '../contexts/BusinessContext';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useOrders } from '../hooks/useOrders';
import { KpiCard } from '../components/KpiCard';
import { QuickAction } from '../components/QuickAction';
import { StatusBadge } from '../components/StatusBadge';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, radius, fontSize, fontWeight } from '../theme';
import type { Order } from '../types';

export const HomeScreen = () => {
  const { colors, isDark } = useTheme();
  const nav = useNavigation<any>();
  const { businessName, formatCurrency } = useBusiness();
  const { logout } = useAuth();
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useDashboardStats();
  const { data: orders, refetch: refetchOrders } = useOrders();
  const insets = useSafeAreaInsets();

  const cardShadow = !isDark
    ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
      }
    : {};

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchOrders()]);
    setRefreshing(false);
  };

  const recentOrders = (orders || []).slice(0, 5);
  const pendingCount = (orders || []).filter((o) => o.status === 'pending').length;

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bgPrimary }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.textMuted }]}>Welcome back</Text>
          <Text style={[styles.businessName, { color: colors.textPrimary }]}>{businessName}</Text>
        </View>
        <TouchableOpacity
          onPress={logout}
          style={[styles.logoutBtn, { backgroundColor: colors.bgCard }, cardShadow]}
        >
          <Ionicons name="log-out-outline" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* KPI Cards */}
      <View style={styles.kpiRow}>
        <KpiCard
          title="Sales"
          value={formatCurrency(stats?.totalSales || 0)}
          color={colors.success}
          icon={<Ionicons name="trending-up" size={16} color={colors.success} />}
        />
        <KpiCard
          title="Orders"
          value={String(stats?.orders || 0)}
          subtitle={pendingCount > 0 ? String(pendingCount) + ' pending' : undefined}
          color={colors.info}
          icon={<Ionicons name="receipt-outline" size={16} color={colors.info} />}
        />
      </View>
      <View style={styles.kpiRow}>
        <KpiCard
          title="Products"
          value={String(stats?.products || 0)}
          color={colors.primary}
          icon={<Ionicons name="cube-outline" size={16} color={colors.primary} />}
        />
        <KpiCard
          title="Customers"
          value={String(stats?.customers || 0)}
          color={colors.accent}
          icon={<Ionicons name="people-outline" size={16} color={colors.accent} />}
        />
      </View>

      {/* Quick Actions */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        <QuickAction
          title="Orders"
          icon={<Ionicons name="receipt-outline" size={22} color={colors.info} />}
          color={colors.info}
          onPress={() => nav.navigate('Orders')}
        />
        <QuickAction
          title="Inventory"
          icon={<Ionicons name="cube-outline" size={22} color={colors.primary} />}
          color={colors.primary}
          onPress={() => nav.navigate('Inventory')}
        />
        <QuickAction
          title="Finance"
          icon={<Ionicons name="wallet-outline" size={22} color={colors.success} />}
          color={colors.success}
          onPress={() => nav.navigate('Finance')}
        />
        <QuickAction
          title="Analytics"
          icon={<Ionicons name="bar-chart-outline" size={22} color={colors.accent} />}
          color={colors.accent}
          onPress={() => nav.navigate('Analytics')}
        />
      </View>

      {/* Recent Orders */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Orders</Text>
        <TouchableOpacity onPress={() => nav.navigate('Orders')}>
          <Text style={[styles.seeAll, { color: colors.accent }]}>See All</Text>
        </TouchableOpacity>
      </View>

      {recentOrders.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.bgCard }, cardShadow]}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No orders yet</Text>
        </View>
      ) : (
        recentOrders.map((order: Order) => (
          <View
            key={order.id}
            style={[styles.orderCard, { backgroundColor: colors.bgCard }, cardShadow]}
          >
            <View style={styles.orderTop}>
              <Text style={[styles.orderCustomer, { color: colors.textPrimary }]} numberOfLines={1}>
                {order.customerName}
              </Text>
              <Text style={[styles.orderTotal, { color: colors.accent }]}>
                {formatCurrency(order.total)}
              </Text>
            </View>
            <View style={styles.orderBottom}>
              <StatusBadge status={order.status} />
              <Text style={[styles.orderItems, { color: colors.textMuted }]}>
                {String(order.productCount) + ' item' + (order.productCount !== 1 ? 's' : '')}
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxl,
    paddingTop: spacing.sm,
  },
  greeting: {
    fontSize: fontSize.sm,
  },
  businessName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seeAll: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  orderCard: {
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  orderCustomer: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    flex: 1,
    marginRight: spacing.md,
  },
  orderTotal: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  orderBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderItems: {
    fontSize: fontSize.xs,
  },
  emptyCard: {
    borderRadius: radius.md,
    padding: spacing.xxxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
  },
});
