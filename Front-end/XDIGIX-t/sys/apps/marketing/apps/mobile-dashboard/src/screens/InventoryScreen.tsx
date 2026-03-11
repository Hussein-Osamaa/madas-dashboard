import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useProducts, getTotalStock, isLowStock, isOutOfStock } from '../hooks/useProducts';
import { useBusiness } from '../contexts/BusinessContext';
import { useTheme } from '../contexts/ThemeContext';
import { SearchBar } from '../components/SearchBar';
import { EmptyState } from '../components/EmptyState';
import { spacing, radius, fontSize, fontWeight } from '../theme';
import type { Product } from '../types';

type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

const STOCK_FILTERS: { label: string; value: StockFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'In Stock', value: 'in_stock' },
  { label: 'Low Stock', value: 'low_stock' },
  { label: 'Out', value: 'out_of_stock' },
];

export const InventoryScreen = () => {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const { formatCurrency } = useBusiness();
  const { data: products, isLoading, refetch } = useProducts();
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    let list = products || [];

    if (stockFilter === 'low_stock') list = list.filter(isLowStock);
    else if (stockFilter === 'out_of_stock') list = list.filter(isOutOfStock);
    else if (stockFilter === 'in_stock') list = list.filter((p) => !isOutOfStock(p) && !isLowStock(p));

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.barcode?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, stockFilter, search]);

  const stockCounts = useMemo(() => {
    const all = products || [];
    return {
      all: all.length,
      in_stock: all.filter((p) => !isOutOfStock(p) && !isLowStock(p)).length,
      low_stock: all.filter(isLowStock).length,
      out_of_stock: all.filter(isOutOfStock).length,
    };
  }, [products]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getStockColor = (product: Product) => {
    if (isOutOfStock(product)) return colors.danger;
    if (isLowStock(product)) return colors.warning;
    return colors.success;
  };

  const getStockLabel = (product: Product) => {
    const total = getTotalStock(product);
    if (isOutOfStock(product)) return 'Out of stock';
    if (isLowStock(product)) return `Low stock (${total})`;
    return `${total} in stock`;
  };

  const cardShadow = !isDark
    ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
      }
    : {};

  const renderProduct = ({ item }: { item: Product }) => {
    const stockColor = getStockColor(item);
    const stockLabel = getStockLabel(item);
    const displayPrice = item.sellingPrice || item.price;

    return (
      <TouchableOpacity
        style={[
          styles.productCard,
          { backgroundColor: colors.bgCard },
          cardShadow,
        ]}
        onPress={() => navigation.navigate('ProductDetails', { product: item })}
        activeOpacity={0.7}
      >
        <View style={styles.productRow}>
          {item.images && item.images.length > 0 ? (
            <Image source={{ uri: item.images[0] }} style={styles.productImage} />
          ) : (
            <View style={[styles.productImage, styles.placeholderImage, { backgroundColor: colors.bgSecondary }]}>
              <Ionicons name="cube-outline" size={24} color={colors.textMuted} />
            </View>
          )}

          <View style={styles.productInfo}>
            <Text style={[styles.productName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
            {item.sku ? <Text style={[styles.sku, { color: colors.textMuted }]}>{'SKU: ' + item.sku}</Text> : null}
            <View style={styles.priceRow}>
              <Text style={[styles.price, { color: colors.accent }]}>{formatCurrency(displayPrice)}</Text>
              {item.sellingPrice != null && item.sellingPrice !== item.price ? (
                <Text style={[styles.originalPrice, { color: colors.textMuted }]}>{formatCurrency(item.price)}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.stockBadge}>
            <View style={[styles.stockDot, { backgroundColor: stockColor }]} />
            <Text style={[styles.stockText, { color: stockColor }]}>{stockLabel}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </View>

        {/* Size breakdown */}
        {item.stock != null && Object.keys(item.stock).length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.sizesRow}
            contentContainerStyle={styles.sizesContent}
          >
            {Object.entries(item.stock).map(([size, qty]) => (
              <View
                key={size}
                style={[
                  styles.sizeChip,
                  { borderColor: (qty || 0) === 0 ? colors.danger + '50' : colors.border },
                ]}
              >
                <Text style={[styles.sizeLabel, { color: colors.textMuted }]}>{size}</Text>
                <Text
                  style={[
                    styles.sizeQty,
                    { color: (qty || 0) === 0 ? colors.danger : colors.textPrimary },
                  ]}
                >
                  {String(qty || 0)}
                </Text>
              </View>
            ))}
          </ScrollView>
        ) : null}
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
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search products..." />
      </View>

      {/* Stock filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersRow}
      >
        {STOCK_FILTERS.map((f) => {
          const active = stockFilter === f.value;
          const count = stockCounts[f.value];
          return (
            <TouchableOpacity
              key={f.value}
              style={[
                styles.filterChip,
                { backgroundColor: active ? colors.accent : colors.bgCard },
              ]}
              onPress={() => setStockFilter(f.value)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: active ? colors.textInverse : colors.textSecondary },
                ]}
              >
                {f.label}
              </Text>
              <View
                style={[
                  styles.countBadge,
                  { backgroundColor: active ? 'rgba(0,0,0,0.2)' : colors.bgSecondary },
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    { color: active ? colors.textInverse : colors.textMuted },
                  ]}
                >
                  {String(count)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Summary stats */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.bgCard, borderLeftColor: colors.success }, cardShadow]}>
          <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{String(stockCounts.in_stock)}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>In Stock</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.bgCard, borderLeftColor: colors.warning }, cardShadow]}>
          <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{String(stockCounts.low_stock)}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Low Stock</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.bgCard, borderLeftColor: colors.danger }, cardShadow]}>
          <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{String(stockCounts.out_of_stock)}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Out</Text>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="cube-outline"
            title="No products found"
            subtitle={search ? 'Try a different search' : 'Add products from the web dashboard'}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 0,
    marginBottom: -4,
  },
  filtersScroll: { marginBottom: -4 },
  filtersRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: 0,
    paddingBottom: 0,
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
  countBadge: { borderRadius: radius.full, paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: 'center' },
  countText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    lineHeight: 14,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginTop: -2,
    marginBottom: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    borderRadius: radius.sm,
    padding: spacing.md,
    borderLeftWidth: 3,
    alignItems: 'center',
  },
  summaryValue: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  summaryLabel: { fontSize: fontSize.xs, marginTop: 2 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100, paddingTop: 0 },
  productCard: { borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  productImage: { width: 52, height: 52, borderRadius: radius.sm },
  placeholderImage: { alignItems: 'center', justifyContent: 'center' },
  productInfo: { flex: 1 },
  productName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  sku: { fontSize: fontSize.xs, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  price: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  originalPrice: { fontSize: fontSize.xs, textDecorationLine: 'line-through' },
  stockBadge: { alignItems: 'flex-end', gap: 4 },
  stockDot: { width: 8, height: 8, borderRadius: 4 },
  stockText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  sizesRow: { marginTop: spacing.sm, marginLeft: -spacing.xs },
  sizesContent: { gap: spacing.sm, paddingLeft: spacing.xs },
  sizeChip: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    minWidth: 44,
  },
  sizeLabel: { fontSize: fontSize.xs },
  sizeQty: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginTop: 1 },
});
