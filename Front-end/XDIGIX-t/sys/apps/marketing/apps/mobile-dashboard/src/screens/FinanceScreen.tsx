import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useFinanceOverview,
  useExpenses,
  useDeposits,
  useAddExpense,
  useAddDeposit,
} from '../hooks/useFinance';
import { useBusiness } from '../contexts/BusinessContext';
import { KpiCard } from '../components/KpiCard';
import { EmptyState } from '../components/EmptyState';
import { colors, spacing, radius, fontSize, fontWeight } from '../theme';
import type { ExpenseCategory } from '../types';

type Tab = 'overview' | 'expenses' | 'deposits';

const EXPENSE_CATEGORIES: { label: string; value: ExpenseCategory; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Shipping', value: 'shipping', icon: 'car-outline' },
  { label: 'Marketing', value: 'marketing', icon: 'megaphone-outline' },
  { label: 'Supplies', value: 'supplies', icon: 'cart-outline' },
  { label: 'Rent', value: 'rent', icon: 'home-outline' },
  { label: 'Salary', value: 'salary', icon: 'people-outline' },
  { label: 'Utilities', value: 'utilities', icon: 'flash-outline' },
  { label: 'Other', value: 'other', icon: 'ellipsis-horizontal' },
];

export const FinanceScreen = () => {
  const { formatCurrency } = useBusiness();
  const { data: overview, isLoading, refetch: refetchOverview } = useFinanceOverview();
  const { data: expenses, refetch: refetchExpenses } = useExpenses();
  const { data: deposits, refetch: refetchDeposits } = useDeposits();
  const addExpense = useAddExpense();
  const addDeposit = useAddDeposit();

  const [tab, setTab] = useState<Tab>('overview');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Expense form
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('other');
  const [expDescription, setExpDescription] = useState('');
  const [expVendor, setExpVendor] = useState('');

  // Deposit form
  const [depAmount, setDepAmount] = useState('');
  const [depSource, setDepSource] = useState('');
  const [depDescription, setDepDescription] = useState('');
  const [depReference, setDepReference] = useState('');

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchOverview(), refetchExpenses(), refetchDeposits()]);
    setRefreshing(false);
  };

  const resetExpenseForm = () => {
    setExpAmount('');
    setExpCategory('other');
    setExpDescription('');
    setExpVendor('');
  };

  const resetDepositForm = () => {
    setDepAmount('');
    setDepSource('');
    setDepDescription('');
    setDepReference('');
  };

  const handleAddExpense = () => {
    const amount = parseFloat(expAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (!expDescription.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }
    addExpense.mutate(
      {
        amount,
        category: expCategory,
        description: expDescription.trim(),
        vendor: expVendor.trim() || undefined,
        date: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          setShowExpenseModal(false);
          resetExpenseForm();
          Alert.alert('Success', 'Expense added');
        },
        onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to add expense'),
      }
    );
  };

  const handleAddDeposit = () => {
    const amount = parseFloat(depAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (!depSource.trim()) {
      Alert.alert('Error', 'Please enter a source');
      return;
    }
    addDeposit.mutate(
      {
        amount,
        source: depSource.trim(),
        description: depDescription.trim() || undefined,
        reference: depReference.trim() || undefined,
        date: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          setShowDepositModal(false);
          resetDepositForm();
          Alert.alert('Success', 'Deposit added');
        },
        onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to add deposit'),
      }
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
      {/* Tab Selector */}
      <View style={styles.tabRow}>
        {(['overview', 'expenses', 'deposits'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {tab === 'overview' && (
          <>
            <View style={styles.kpiRow}>
              <KpiCard
                title="Total Sales"
                value={formatCurrency(overview?.totalSales || 0)}
                color={colors.success}
                icon={<Ionicons name="trending-up" size={16} color={colors.success} />}
              />
              <KpiCard
                title="Net Profit"
                value={formatCurrency(overview?.netProfit || 0)}
                color={overview && overview.netProfit >= 0 ? colors.success : colors.danger}
                icon={<Ionicons name="cash-outline" size={16} color={overview && overview.netProfit >= 0 ? colors.success : colors.danger} />}
              />
            </View>
            <View style={styles.kpiRow}>
              <KpiCard
                title="Expenses"
                value={formatCurrency(overview?.totalExpenses || 0)}
                color={colors.danger}
                icon={<Ionicons name="arrow-down-circle-outline" size={16} color={colors.danger} />}
              />
              <KpiCard
                title="Deposits"
                value={formatCurrency(overview?.totalDeposits || 0)}
                color={colors.info}
                icon={<Ionicons name="arrow-up-circle-outline" size={16} color={colors.info} />}
              />
            </View>

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>Quick Add</Text>
            <View style={styles.quickRow}>
              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: colors.dangerBg, borderColor: colors.danger + '30' }]}
                onPress={() => setShowExpenseModal(true)}
              >
                <Ionicons name="remove-circle-outline" size={28} color={colors.danger} />
                <Text style={[styles.quickBtnText, { color: colors.danger }]}>Add Expense</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: colors.successBg, borderColor: colors.success + '30' }]}
                onPress={() => setShowDepositModal(true)}
              >
                <Ionicons name="add-circle-outline" size={28} color={colors.success} />
                <Text style={[styles.quickBtnText, { color: colors.success }]}>Add Deposit</Text>
              </TouchableOpacity>
            </View>

            {/* Recent Expenses */}
            <Text style={styles.sectionTitle}>Recent Expenses</Text>
            {(expenses || []).length === 0 ? (
              <View style={styles.emptyCard}><Text style={styles.emptyText}>No expenses yet</Text></View>
            ) : (
              (expenses || []).slice(0, 5).map((exp) => (
                <View key={exp.id} style={styles.transactionCard}>
                  <View style={[styles.txIconWrap, { backgroundColor: colors.dangerBg }]}>
                    <Ionicons
                      name={EXPENSE_CATEGORIES.find((c) => c.value === exp.category)?.icon || 'ellipsis-horizontal'}
                      size={18}
                      color={colors.danger}
                    />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txDesc} numberOfLines={1}>{exp.description}</Text>
                    <Text style={styles.txMeta}>
                      {exp.category + (exp.vendor ? ' • ' + exp.vendor : '')}
                    </Text>
                  </View>
                  <Text style={[styles.txAmount, { color: colors.danger }]}>
                    {'-' + formatCurrency(exp.amount)}
                  </Text>
                </View>
              ))
            )}

            {/* Recent Deposits */}
            <Text style={styles.sectionTitle}>Recent Deposits</Text>
            {(deposits || []).length === 0 ? (
              <View style={styles.emptyCard}><Text style={styles.emptyText}>No deposits yet</Text></View>
            ) : (
              (deposits || []).slice(0, 5).map((dep) => (
                <View key={dep.id} style={styles.transactionCard}>
                  <View style={[styles.txIconWrap, { backgroundColor: colors.successBg }]}>
                    <Ionicons name="arrow-up-circle-outline" size={18} color={colors.success} />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txDesc} numberOfLines={1}>{dep.source}</Text>
                    {dep.description ? <Text style={styles.txMeta}>{dep.description}</Text> : null}
                  </View>
                  <Text style={[styles.txAmount, { color: colors.success }]}>
                    {'+' + formatCurrency(dep.amount)}
                  </Text>
                </View>
              ))
            )}
          </>
        )}

        {tab === 'expenses' && (
          <>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setShowExpenseModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle" size={22} color={colors.textInverse} />
              <Text style={styles.addBtnText}>Add Expense</Text>
            </TouchableOpacity>

            {(expenses || []).length === 0 ? (
              <EmptyState icon="wallet-outline" title="No expenses" subtitle="Add your first expense" />
            ) : (
              (expenses || []).map((exp) => (
                <View key={exp.id} style={styles.transactionCard}>
                  <View style={[styles.txIconWrap, { backgroundColor: colors.dangerBg }]}>
                    <Ionicons
                      name={EXPENSE_CATEGORIES.find((c) => c.value === exp.category)?.icon || 'ellipsis-horizontal'}
                      size={18}
                      color={colors.danger}
                    />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txDesc} numberOfLines={1}>{exp.description}</Text>
                    <Text style={styles.txMeta}>
                      {exp.category + (exp.vendor ? ' • ' + exp.vendor : '') + ' • ' + new Date(exp.date).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={[styles.txAmount, { color: colors.danger }]}>
                    {'-' + formatCurrency(exp.amount)}
                  </Text>
                </View>
              ))
            )}
          </>
        )}

        {tab === 'deposits' && (
          <>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.success }]}
              onPress={() => setShowDepositModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle" size={22} color={colors.textPrimary} />
              <Text style={styles.addBtnText}>Add Deposit</Text>
            </TouchableOpacity>

            {(deposits || []).length === 0 ? (
              <EmptyState icon="wallet-outline" title="No deposits" subtitle="Add your first deposit" />
            ) : (
              (deposits || []).map((dep) => (
                <View key={dep.id} style={styles.transactionCard}>
                  <View style={[styles.txIconWrap, { backgroundColor: colors.successBg }]}>
                    <Ionicons name="arrow-up-circle-outline" size={18} color={colors.success} />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txDesc} numberOfLines={1}>{dep.source}</Text>
                    <Text style={styles.txMeta}>
                      {(dep.description || '') + (dep.reference ? ' Ref: ' + dep.reference : '') + ' • ' + new Date(dep.date).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={[styles.txAmount, { color: colors.success }]}>
                    {'+' + formatCurrency(dep.amount)}
                  </Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Floating Quick Add Buttons */}
      <View style={styles.fabRow}>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.danger }]}
          onPress={() => setShowExpenseModal(true)}
        >
          <Ionicons name="remove" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.success }]}
          onPress={() => setShowDepositModal(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Add Expense Modal */}
      <Modal visible={showExpenseModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Expense</Text>
              <TouchableOpacity onPress={() => { setShowExpenseModal(false); resetExpenseForm(); }}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Amount *</Text>
              <TextInput
                style={styles.formInput}
                value={expAmount}
                onChangeText={setExpAmount}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[styles.categoryChip, expCategory === cat.value && styles.categoryChipActive]}
                    onPress={() => setExpCategory(cat.value)}
                  >
                    <Ionicons
                      name={cat.icon}
                      size={16}
                      color={expCategory === cat.value ? colors.textInverse : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        expCategory === cat.value && styles.categoryChipTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description *</Text>
              <TextInput
                style={styles.formInput}
                value={expDescription}
                onChangeText={setExpDescription}
                placeholder="What was this expense for?"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Vendor (optional)</Text>
              <TextInput
                style={styles.formInput}
                value={expVendor}
                onChangeText={setExpVendor}
                placeholder="Vendor name"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.danger }]}
              onPress={handleAddExpense}
              disabled={addExpense.isPending}
            >
              {addExpense.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Add Expense</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Deposit Modal */}
      <Modal visible={showDepositModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Deposit</Text>
              <TouchableOpacity onPress={() => { setShowDepositModal(false); resetDepositForm(); }}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Amount *</Text>
              <TextInput
                style={styles.formInput}
                value={depAmount}
                onChangeText={setDepAmount}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Source *</Text>
              <TextInput
                style={styles.formInput}
                value={depSource}
                onChangeText={setDepSource}
                placeholder="e.g. Bank Transfer, Cash, Client Payment"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description (optional)</Text>
              <TextInput
                style={styles.formInput}
                value={depDescription}
                onChangeText={setDepDescription}
                placeholder="Notes about this deposit"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Reference (optional)</Text>
              <TextInput
                style={styles.formInput}
                value={depReference}
                onChangeText={setDepReference}
                placeholder="Transaction reference number"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.success }]}
              onPress={handleAddDeposit}
              disabled={addDeposit.isPending}
            >
              {addDeposit.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Add Deposit</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  loadingWrap: { flex: 1, backgroundColor: colors.bgPrimary, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.lg, paddingBottom: 100 },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: colors.accent },
  tabBtnText: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  tabBtnTextActive: { color: colors.textInverse },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  kpiRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  quickRow: { flexDirection: 'row', gap: spacing.md },
  quickBtn: {
    flex: 1,
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
  },
  quickBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.danger,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  addBtnText: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  txIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: { flex: 1 },
  txDesc: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  txMeta: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2, textTransform: 'capitalize' },
  txAmount: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  emptyCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.xxxl,
    alignItems: 'center',
  },
  emptyText: { color: colors.textMuted, fontSize: fontSize.md },
  fabRow: {
    position: 'absolute',
    bottom: 90,
    right: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    backgroundColor: colors.bgModal,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xxl,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  modalTitle: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  formGroup: { marginBottom: spacing.lg },
  formLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  formInput: {
    backgroundColor: colors.bgInput,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 48,
    color: colors.textPrimary,
    fontSize: fontSize.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryRow: { gap: spacing.sm },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.bgCard,
  },
  categoryChipActive: { backgroundColor: colors.accent },
  categoryChipText: { color: colors.textSecondary, fontSize: fontSize.sm },
  categoryChipTextActive: { color: colors.textInverse },
  submitBtn: {
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  submitBtnText: { color: '#fff', fontSize: fontSize.lg, fontWeight: fontWeight.bold },
});
