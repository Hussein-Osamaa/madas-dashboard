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
import { Ionicons } from '@expo/vector-icons';
import { useProducts, getTotalStock, isLowStock, isOutOfStock } from '../hooks/useProducts';
import { useBusiness } from '../contexts/BusinessContext';
import { SearchBar } from '../components/SearchBar';
import { EmptyState } from '../components/EmptyState';
import { colors, spacing, radius, fontSize, fontWeight } from '../theme';
import type { Product } from '../types';

type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

const STOCK_FILTERS: { label: string; value: StockFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'In Stock', value: 'in_stock' },
  { label: 'Low Stock', value: 'low_stock' },
  { label: 'Out of Stock', value: 'out_of_stock' },
];

export const InventoryScreen = () => {
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

  const renderProduct = ({ item }: { item: Product }) => {
    const stockColor = getStockColor(item);
    const stockLabel = getStockLabel(item);
    const displayPrice = item.sellingPrice || item.price;

    return (
      <View style={styles.productCard}>
        <View style={styles.productRow}>
          {item.images && item.images.length > 0 ? (
            <Image source={{ uri: item.images[0] }} style={styles.productImage} />
          ) : (
            <View style={[styles.productImage, styles.placeholderImage]}>
              <Ionicons name="cube-outline" size={24} color={colors.textMuted} />
            </View>
          )}

          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
            {item.sku ? <Text style={styles.sku}>{'SKU: ' + item.sku}</Text> : null}
            <View style={styles.priceRow}>
              <Text style={styles.price}>{formatCurrency(displayPrice)}</Text>
              {item.sellingPrice != null && item.sellingPrice !== item.price ? (
                <Text style={styles.originalPrice}>{formatCurrency(item.price)}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.stockBadge}>
            <View style={[styles.stockDot, { backgroundColor: stockColor }]} />
            <Text style={[styles.stockText, { color: stockColor }]}>{stockLabel}</Text>
          </View>
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
                <Text style={styles.sizeLabel}>{size}</Text>
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
      </View>
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
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search products..." />
      </View>

      {/* Stock filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
      >
        {STOCK_FILTERS.map((f) => {
          const active = stockFilter === f.value;
          const count = stockCounts[f.value];
          return (
            <TouchableOpacity
              key={f.value}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setStockFilter(f.value)}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {f.label}
              </Text>
              <View style={[styles.countBadge, active && styles.countBadgeActive]}>
                <Text style={[styles.countText, active && styles.countTextActive]}>{String(count)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Summary stats */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderLeftColor: colors.success }]}>
          <Text style={styles.summaryValue}>{String(stockCounts.in_stock)}</Text>
          <Text style={styles.summaryLabel}>In Stock</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: colors.warning }]}>
          <Text style={styles.summaryValue}>{String(stockCounts.low_stock)}</Text>
          <Text style={styles.summaryLabel}>Low Stock</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: colors.danger }]}>
          <Text style={styles.summaryValue}>{String(stockCounts.out_of_stock)}</Text>
          <Text style={styles.summaryLabel}>Out</Text>
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
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  loadingWrap: { flex: 1, backgroundColor: colors.bgPrimary, justifyContent: 'center', alignItems: 'center' },
  searchWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  filtersRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.bgCard,
    gap: 6,
  },
  filterChipActive: { backgroundColor: colors.accent },
  filterChipText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  filterChipTextActive: { color: colors.textInverse },
  countBadge: { backgroundColor: colors.bgSecondary, borderRadius: radius.full, paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: 'center' },
  countBadgeActive: { backgroundColor: 'rgba(0,0,0,0.2)' },
  countText: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  countTextActive: { color: colors.textInverse },
  summaryRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.sm },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.sm,
    padding: spacing.md,
    borderLeftWidth: 3,
    alignItems: 'center',
  },
  summaryValue: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  summaryLabel: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  productCard: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  productImage: { width: 52, height: 52, borderRadius: radius.sm },
  placeholderImage: { backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' },
  productInfo: { flex: 1 },
  productName: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  sku: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  price: { color: colors.accent, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  originalPrice: { color: colors.textMuted, fontSize: fontSize.xs, textDecorationLine: 'line-through' },
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
  sizeLabel: { color: colors.textMuted, fontSize: fontSize.xs },
  sizeQty: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginTop: 1 },
});
