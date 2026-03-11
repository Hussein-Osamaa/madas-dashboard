import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useBusiness } from '../contexts/BusinessContext';
import { useTheme } from '../contexts/ThemeContext';
import { getTotalStock, isLowStock, isOutOfStock } from '../hooks/useProducts';
import { spacing, radius, fontSize, fontWeight } from '../theme';
import type { Product } from '../types';

type ProductDetailsParams = { product: Product };

export const ProductDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ ProductDetails: ProductDetailsParams }, 'ProductDetails'>>();
  const { formatCurrency } = useBusiness();
  const { colors, isDark } = useTheme();
  const product = route.params?.product;

  if (!product) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bgPrimary }]}>
        <Text style={[styles.errorText, { color: colors.textMuted }]}>Product not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={[styles.backBtnText, { color: colors.accent }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalStock = getTotalStock(product);
  const stockColor = isOutOfStock(product) ? colors.danger : isLowStock(product) ? colors.warning : colors.success;
  const stockLabel = isOutOfStock(product)
    ? 'Out of stock'
    : isLowStock(product)
      ? `Low stock (${totalStock})`
      : `${totalStock} in stock`;
  const displayPrice = product.sellingPrice ?? product.price;
  const hasMultipleSizes = product.stock != null && Object.keys(product.stock).length > 1;

  const cardShadow = !isDark
    ? { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }
    : {};

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bgPrimary }]} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backBar} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        <Text style={[styles.backLabel, { color: colors.textPrimary }]}>Back to Inventory</Text>
      </TouchableOpacity>

      {/* Image */}
      <View style={[styles.imageWrap, cardShadow]}>
        {product.images && product.images.length > 0 ? (
          <Image source={{ uri: product.images[0] }} style={[styles.image, { backgroundColor: colors.bgSecondary }]} resizeMode="cover" />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: colors.bgCard }]}>
            <Ionicons name="cube-outline" size={64} color={colors.textMuted} />
          </View>
        )}
      </View>

      {/* Name & price */}
      <Text style={[styles.name, { color: colors.textPrimary }]}>{product.name}</Text>
      <View style={styles.priceRow}>
        <Text style={[styles.price, { color: colors.accent }]}>{formatCurrency(displayPrice)}</Text>
        {product.sellingPrice != null && product.sellingPrice !== product.price ? (
          <Text style={[styles.originalPrice, { color: colors.textMuted }]}>{formatCurrency(product.price)}</Text>
        ) : null}
      </View>

      {/* Stock badge */}
      <View style={[styles.stockBadge, { backgroundColor: stockColor + '20', borderColor: stockColor + '60' }]}>
        <View style={[styles.stockDot, { backgroundColor: stockColor }]} />
        <Text style={[styles.stockText, { color: stockColor }]}>{stockLabel}</Text>
      </View>

      {/* Meta */}
      <View style={[styles.section, cardShadow]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Details</Text>
        {product.sku ? (
          <View style={[styles.metaRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>SKU</Text>
            <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{product.sku}</Text>
          </View>
        ) : null}
        {product.category ? (
          <View style={[styles.metaRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Category</Text>
            <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{product.category}</Text>
          </View>
        ) : null}
        {product.barcode ? (
          <View style={[styles.metaRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Barcode</Text>
            <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{product.barcode}</Text>
          </View>
        ) : null}
      </View>

      {/* Description */}
      {product.description ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Description</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{product.description}</Text>
        </View>
      ) : null}

      {/* Size breakdown */}
      {hasMultipleSizes ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Stock by size</Text>
          <View style={styles.sizesGrid}>
            {Object.entries(product.stock!).map(([size, qty]) => (
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
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: 100 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: fontSize.md },
  backBtn: { marginTop: spacing.lg, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  backBtnText: { fontSize: fontSize.md },
  backBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  backLabel: { fontSize: fontSize.md },
  imageWrap: { marginBottom: spacing.lg, borderRadius: radius.md, overflow: 'hidden' },
  image: { width: '100%', aspectRatio: 1 },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.sm,
  },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  price: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  originalPrice: { fontSize: fontSize.md, textDecorationLine: 'line-through' },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    marginBottom: spacing.xl,
  },
  stockDot: { width: 10, height: 10, borderRadius: 5 },
  stockText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  section: { marginBottom: spacing.xl },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1 },
  metaLabel: { fontSize: fontSize.sm },
  metaValue: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  description: { fontSize: fontSize.md, lineHeight: 22 },
  sizesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sizeChip: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minWidth: 72,
    alignItems: 'center',
  },
  sizeLabel: { fontSize: fontSize.xs },
  sizeQty: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginTop: 2 },
});
