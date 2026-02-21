import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  updateDoc, 
  query, 
  orderBy, 
  where,
  Timestamp, 
  db,
  serverTimestamp,
  writeBatch
} from '../../lib/firebase';
import dayjs from 'dayjs';

/** Normalize Firestore/backend date (Timestamp, string, number, { seconds }) to Date. */
function toDate(v: unknown, fallback?: Date): Date {
  if (v == null) return fallback ?? new Date();
  if (v instanceof Date) return isNaN(v.getTime()) ? (fallback ?? new Date()) : v;
  if (typeof v === 'string') { const d = new Date(v); return isNaN(d.getTime()) ? (fallback ?? new Date()) : d; }
  if (typeof v === 'number') { const d = new Date(v < 1e12 ? v * 1000 : v); return isNaN(d.getTime()) ? (fallback ?? new Date()) : d; }
  if (typeof v === 'object' && v !== null && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  if (typeof v === 'object' && v !== null) {
    const sec = (v as { seconds?: number; _seconds?: number }).seconds ?? (v as { _seconds?: number })._seconds;
    if (typeof sec === 'number' && Number.isFinite(sec)) return new Date(sec * 1000);
  }
  return fallback ?? new Date();
}

// ============================================
// DATA MODELS / TYPES
// ============================================

export type Partner = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  profitSharePercentage: number; // e.g., 30 for 30%
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type PartnerPayment = {
  id: string;
  partnerId: string;
  partnerName: string;
  amount: number;
  type: 'payment' | 'adjustment' | 'settlement' | 'credit_applied';
  description?: string;
  reference?: string;
  periodStart?: Date;
  periodEnd?: Date;
  createdAt: Date;
  createdBy: string;
  // Audit fields - payments cannot be deleted, only adjusted
  isVoided: boolean;
  voidedAt?: Date;
  voidedBy?: string;
  voidReason?: string;
};

export type ProfitCalculation = {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  calculatedAt: Date;
  calculatedBy: string;
  status: 'draft' | 'finalized' | 'settled' | 'voided';
  distributions: PartnerDistribution[];
  // Void fields
  voidedAt?: Date;
  voidedBy?: string;
  voidReason?: string;
};

export type PartnerDistribution = {
  partnerId: string;
  partnerName: string;
  sharePercentage: number;
  profitDue: number;
  previousBalance: number; // Credit (+) or Outstanding (-)
  totalDue: number; // profitDue - previousBalance (if credit)
  amountPaid: number;
  remainingBalance: number; // Positive = due, Negative = credit/overpaid
};

export type AuditLog = {
  id: string;
  action: 'create' | 'update' | 'void' | 'calculate' | 'payment' | 'adjustment' | 'settlement';
  entityType: 'partner' | 'payment' | 'calculation';
  entityId: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  description: string;
  performedBy: string;
  performedAt: Date;
  ipAddress?: string;
};

export type PartnerSummary = {
  partner: Partner;
  totalProfitDue: number;
  totalPaid: number;
  totalAdjustments: number;
  creditBalance: number; // Overpayments
  outstandingBalance: number; // Unpaid amount
  netBalance: number; // Positive = due, Negative = credit
  lastPaymentDate?: Date;
  paymentHistory: PartnerPayment[];
};

// ============================================
// FIRESTORE COLLECTION HELPERS
// ============================================

const partnersCollection = (businessId: string) =>
  collection(db, 'businesses', businessId, 'profit_partners');

const paymentsCollection = (businessId: string) =>
  collection(db, 'businesses', businessId, 'partner_payments');

const calculationsCollection = (businessId: string) =>
  collection(db, 'businesses', businessId, 'profit_calculations');

const auditCollection = (businessId: string) =>
  collection(db, 'businesses', businessId, 'profit_audit_log');

// ============================================
// PARTNER MANAGEMENT
// ============================================

export const fetchPartners = async (businessId: string): Promise<Partner[]> => {
  // Fetch all and sort in memory to avoid index issues
  const q = query(partnersCollection(businessId));
  const snapshot = await getDocs(q);
  
  const partners = snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: data.name || 'Unnamed Partner',
      email: data.email,
      phone: data.phone,
      profitSharePercentage: data.profitSharePercentage || 0,
      isActive: data.isActive !== false,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt)
    };
  });
  
  // Sort by name ascending
  partners.sort((a, b) => a.name.localeCompare(b.name));
  
  return partners;
};

export const createPartner = async (
  businessId: string,
  payload: Omit<Partner, 'id' | 'createdAt' | 'updatedAt'>,
  userId: string
): Promise<string> => {
  const partnerRef = doc(partnersCollection(businessId));
  const now = new Date();
  
  await setDoc(partnerRef, {
    ...payload,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now)
  });
  
  // Create audit log
  await createAuditLog(businessId, {
    action: 'create',
    entityType: 'partner',
    entityId: partnerRef.id,
    newValue: payload as Record<string, unknown>,
    description: `Created partner: ${payload.name} with ${payload.profitSharePercentage}% share`,
    performedBy: userId
  });
  
  return partnerRef.id;
};

export const updatePartner = async (
  businessId: string,
  partnerId: string,
  payload: Partial<Omit<Partner, 'id' | 'createdAt' | 'updatedAt'>>,
  userId: string
): Promise<void> => {
  const partnerRef = doc(db, 'businesses', businessId, 'profit_partners', partnerId);
  const partnerSnap = await getDoc(partnerRef);
  const previousValue = partnerSnap.exists() ? partnerSnap.data() : {};
  
  await updateDoc(partnerRef, {
    ...payload,
    updatedAt: Timestamp.fromDate(new Date())
  });
  
  // Create audit log
  await createAuditLog(businessId, {
    action: 'update',
    entityType: 'partner',
    entityId: partnerId,
    previousValue: previousValue as Record<string, unknown>,
    newValue: payload as Record<string, unknown>,
    description: `Updated partner: ${payload.name || 'Unknown'}`,
    performedBy: userId
  });
};

// ============================================
// PAYMENT MANAGEMENT
// ============================================

export const fetchPayments = async (
  businessId: string,
  partnerId?: string
): Promise<PartnerPayment[]> => {
  // Fetch all payments and filter/sort in memory to avoid composite index requirement
  const q = query(paymentsCollection(businessId));
  const snapshot = await getDocs(q);
  
  let payments = snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      partnerId: data.partnerId,
      partnerName: data.partnerName,
      amount: data.amount || 0,
      type: data.type || 'payment',
      description: data.description,
      reference: data.reference,
      periodStart: data.periodStart != null ? toDate(data.periodStart) : undefined,
      periodEnd: data.periodEnd != null ? toDate(data.periodEnd) : undefined,
      createdAt: toDate(data.createdAt),
      createdBy: data.createdBy || 'Unknown',
      isVoided: data.isVoided || false,
      voidedAt: data.voidedAt != null ? toDate(data.voidedAt) : undefined,
      voidedBy: data.voidedBy,
      voidReason: data.voidReason
    };
  });
  
  // Filter by partnerId if specified
  if (partnerId) {
    payments = payments.filter(p => p.partnerId === partnerId);
  }
  
  // Sort by createdAt descending
  payments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  
  return payments;
};

export const recordPayment = async (
  businessId: string,
  payload: {
    partnerId: string;
    partnerName: string;
    amount: number;
    type: PartnerPayment['type'];
    description?: string;
    reference?: string;
    periodStart?: Date;
    periodEnd?: Date;
  },
  userId: string
): Promise<string> => {
  const paymentRef = doc(paymentsCollection(businessId));
  const now = new Date();
  
  const paymentData = {
    ...payload,
    createdAt: Timestamp.fromDate(now),
    createdBy: userId,
    isVoided: false,
    ...(payload.periodStart && { periodStart: Timestamp.fromDate(payload.periodStart) }),
    ...(payload.periodEnd && { periodEnd: Timestamp.fromDate(payload.periodEnd) })
  };
  
  await setDoc(paymentRef, paymentData);
  
  // Create audit log
  await createAuditLog(businessId, {
    action: 'payment',
    entityType: 'payment',
    entityId: paymentRef.id,
    newValue: paymentData as unknown as Record<string, unknown>,
    description: `Recorded ${payload.type} of ${payload.amount} for ${payload.partnerName}`,
    performedBy: userId
  });
  
  return paymentRef.id;
};

export const voidPayment = async (
  businessId: string,
  paymentId: string,
  reason: string,
  userId: string
): Promise<void> => {
  const paymentRef = doc(db, 'businesses', businessId, 'partner_payments', paymentId);
  const paymentSnap = await getDoc(paymentRef);
  
  if (!paymentSnap.exists()) {
    throw new Error('Payment not found');
  }
  
  const previousValue = paymentSnap.data();
  
  await updateDoc(paymentRef, {
    isVoided: true,
    voidedAt: Timestamp.fromDate(new Date()),
    voidedBy: userId,
    voidReason: reason
  });
  
  // Create audit log
  await createAuditLog(businessId, {
    action: 'void',
    entityType: 'payment',
    entityId: paymentId,
    previousValue: previousValue as Record<string, unknown>,
    newValue: { isVoided: true, voidReason: reason },
    description: `Voided payment: ${reason}`,
    performedBy: userId
  });
};

// ============================================
// PROFIT CALCULATION
// ============================================

export const calculateProfit = async (
  businessId: string,
  periodStart: Date,
  periodEnd: Date,
  userId: string
): Promise<ProfitCalculation> => {
  // Fetch all active partners
  const partners = await fetchPartners(businessId);
  const activePartners = partners.filter(p => p.isActive);
  
  // Validate total percentage
  const totalPercentage = activePartners.reduce((sum, p) => sum + p.profitSharePercentage, 0);
  if (totalPercentage > 100) {
    throw new Error(`Total partner shares exceed 100% (${totalPercentage}%)`);
  }
  
  // Fetch revenue (from deposits)
  const depositsRef = collection(db, 'businesses', businessId, 'deposits');
  const startTs = Timestamp.fromDate(periodStart);
  const endTs = Timestamp.fromDate(periodEnd);
  
  // Fetch all deposits and filter in memory to avoid index issues
  const depositsSnapshot = await getDocs(depositsRef);
  let totalRevenue = 0;
  
  depositsSnapshot.docs.forEach((docSnap) => {
    const data = docSnap.data();
    const depositDate = data.date != null ? toDate(data.date) : data.createdAt != null ? toDate(data.createdAt) : undefined;
    
    // Check if deposit is within the selected period
    if (depositDate && depositDate >= periodStart && depositDate <= periodEnd) {
      totalRevenue += data.amount || 0;
    }
  });
  
  // Fetch expenses
  const expensesRef = collection(db, 'businesses', businessId, 'expenses');
  const expensesQuery = query(
    expensesRef,
    where('createdAt', '>=', startTs),
    where('createdAt', '<=', endTs)
  );
  
  const expensesSnapshot = await getDocs(expensesQuery);
  let totalExpenses = 0;
  
  expensesSnapshot.docs.forEach((docSnap) => {
    const data = docSnap.data();
    totalExpenses += data.amount || 0;
  });
  
  // Calculate profits
  const grossProfit = totalRevenue;
  const netProfit = totalRevenue - totalExpenses;
  
  // Fetch existing payments to calculate balances
  const allPayments = await fetchPayments(businessId);
  const validPayments = allPayments.filter(p => !p.isVoided);
  
  // Calculate distributions
  const distributions: PartnerDistribution[] = await Promise.all(
    activePartners.map(async (partner) => {
      const profitDue = (netProfit * partner.profitSharePercentage) / 100;
      
      // Calculate total paid to this partner (all time)
      const partnerPayments = validPayments.filter(p => p.partnerId === partner.id);
      const totalPaid = partnerPayments
        .filter(p => p.type === 'payment' || p.type === 'settlement')
        .reduce((sum, p) => sum + p.amount, 0);
      const totalAdjustments = partnerPayments
        .filter(p => p.type === 'adjustment')
        .reduce((sum, p) => sum + p.amount, 0);
      const creditsApplied = partnerPayments
        .filter(p => p.type === 'credit_applied')
        .reduce((sum, p) => sum + p.amount, 0);
      
      // Get previous profit calculations to determine total profit due
      const previousCalculations = await fetchCalculations(businessId);
      const previousProfitDue = previousCalculations
        .filter(c => c.status === 'finalized' || c.status === 'settled')
        .reduce((sum, c) => {
          const dist = c.distributions.find(d => d.partnerId === partner.id);
          return sum + (dist?.profitDue || 0);
        }, 0);
      
      const totalProfitDue = previousProfitDue + profitDue;
      const amountPaid = totalPaid + totalAdjustments - creditsApplied;
      const remainingBalance = totalProfitDue - amountPaid;
      
      // Previous balance: negative means credit, positive means outstanding
      const previousBalance = (previousProfitDue - amountPaid);
      
      return {
        partnerId: partner.id,
        partnerName: partner.name,
        sharePercentage: partner.profitSharePercentage,
        profitDue,
        previousBalance: previousBalance > 0 ? 0 : Math.abs(previousBalance), // Credit balance
        totalDue: profitDue - (previousBalance > 0 ? 0 : Math.abs(previousBalance)),
        amountPaid,
        remainingBalance
      };
    })
  );
  
  // Check if a calculation already exists for this period
  const existingCalculations = await fetchCalculations(businessId);
  const existingCalc = existingCalculations.find(c => {
    const sameStart = c.periodStart.toDateString() === periodStart.toDateString();
    const sameEnd = c.periodEnd.toDateString() === periodEnd.toDateString();
    return sameStart && sameEnd;
  });
  
  const calculation: Omit<ProfitCalculation, 'id'> = {
    periodStart,
    periodEnd,
    totalRevenue,
    totalExpenses,
    grossProfit,
    netProfit,
    calculatedAt: new Date(),
    calculatedBy: userId,
    status: existingCalc?.status || 'draft', // Keep existing status if updating
    distributions
  };
  
  let calcRef;
  if (existingCalc) {
    // Update existing calculation
    calcRef = doc(db, 'businesses', businessId, 'profit_calculations', existingCalc.id);
    await updateDoc(calcRef, {
      ...calculation,
      periodStart: Timestamp.fromDate(periodStart),
      periodEnd: Timestamp.fromDate(periodEnd),
      calculatedAt: serverTimestamp()
    });
  } else {
    // Create new calculation
    calcRef = doc(calculationsCollection(businessId));
    await setDoc(calcRef, {
      ...calculation,
      periodStart: Timestamp.fromDate(periodStart),
      periodEnd: Timestamp.fromDate(periodEnd),
      calculatedAt: serverTimestamp()
    });
  }
  
  // Create audit log
  const calcId = existingCalc ? existingCalc.id : calcRef.id;
  await createAuditLog(businessId, {
    action: existingCalc ? 'update' : 'calculate',
    entityType: 'calculation',
    entityId: calcId,
    newValue: calculation as unknown as Record<string, unknown>,
    description: `${existingCalc ? 'Updated' : 'Calculated'} profit for period ${dayjs(periodStart).format('MMM D, YYYY')} - ${dayjs(periodEnd).format('MMM D, YYYY')}. Net profit: ${netProfit}`,
    performedBy: userId
  });
  
  return {
    id: calcId,
    ...calculation
  };
};

export const fetchCalculations = async (businessId: string): Promise<ProfitCalculation[]> => {
  // Fetch all and sort in memory to avoid index issues
  const q = query(calculationsCollection(businessId));
  const snapshot = await getDocs(q);
  
  const calculations = snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      periodStart: toDate(data.periodStart),
      periodEnd: toDate(data.periodEnd),
      totalRevenue: data.totalRevenue || 0,
      totalExpenses: data.totalExpenses || 0,
      grossProfit: data.grossProfit || 0,
      netProfit: data.netProfit || 0,
      calculatedAt: toDate(data.calculatedAt),
      calculatedBy: data.calculatedBy || 'Unknown',
      status: data.status || 'draft',
      distributions: data.distributions || [],
      voidedAt: data.voidedAt != null ? toDate(data.voidedAt) : undefined,
      voidedBy: data.voidedBy,
      voidReason: data.voidReason
    };
  });
  
  // Sort by calculatedAt descending
  calculations.sort((a, b) => b.calculatedAt.getTime() - a.calculatedAt.getTime());
  
  return calculations;
};

export const finalizeCalculation = async (
  businessId: string,
  calculationId: string,
  userId: string
): Promise<void> => {
  const calcRef = doc(db, 'businesses', businessId, 'profit_calculations', calculationId);
  
  await updateDoc(calcRef, {
    status: 'finalized'
  });
  
  await createAuditLog(businessId, {
    action: 'update',
    entityType: 'calculation',
    entityId: calculationId,
    newValue: { status: 'finalized' },
    description: 'Finalized profit calculation',
    performedBy: userId
  });
};

export const voidCalculation = async (
  businessId: string,
  calculationId: string,
  reason: string,
  userId: string
): Promise<void> => {
  const calcRef = doc(db, 'businesses', businessId, 'profit_calculations', calculationId);
  const calcSnap = await getDoc(calcRef);
  
  if (!calcSnap.exists()) {
    throw new Error('Calculation not found');
  }
  
  const previousValue = calcSnap.data();
  
  await updateDoc(calcRef, {
    status: 'voided',
    voidedAt: Timestamp.fromDate(new Date()),
    voidedBy: userId,
    voidReason: reason
  });
  
  await createAuditLog(businessId, {
    action: 'void',
    entityType: 'calculation',
    entityId: calculationId,
    previousValue: previousValue as Record<string, unknown>,
    newValue: { status: 'voided', voidReason: reason },
    description: `Voided profit calculation: ${reason}`,
    performedBy: userId
  });
};

// ============================================
// PARTNER SUMMARY
// ============================================

export const getPartnerSummary = async (
  businessId: string,
  partnerId: string
): Promise<PartnerSummary | null> => {
  // Fetch partner
  const partnerRef = doc(db, 'businesses', businessId, 'profit_partners', partnerId);
  const partnerSnap = await getDoc(partnerRef);
  
  if (!partnerSnap.exists()) return null;
  
  const partnerData = partnerSnap.data();
  const partner: Partner = {
    id: partnerSnap.id,
    name: partnerData.name,
    email: partnerData.email,
    phone: partnerData.phone,
    profitSharePercentage: partnerData.profitSharePercentage || 0,
    isActive: partnerData.isActive !== false,
    createdAt: toDate(partnerData.createdAt),
    updatedAt: toDate(partnerData.updatedAt)
  };
  
  // Fetch all payments for this partner
  const payments = await fetchPayments(businessId, partnerId);
  const validPayments = payments.filter(p => !p.isVoided);
  
  // Fetch all calculations (including drafts) - this is the source of truth for profit due
  const allCalculations = await fetchCalculations(businessId);
  // Exclude voided calculations
  const calculations = allCalculations.filter(c => c.status !== 'voided');
  
  // Calculate totals from all calculations - sum up partner's share of each calculation's net profit
  // Only count positive profits (don't let losses reduce total profit due)
  let totalProfitDue = 0;
  
  console.log(`[getPartnerSummary] Partner: ${partner.name}, Calculations count: ${calculations.length} (excluding voided)`);
  
  calculations.forEach(calc => {
    // Find this partner's distribution in the calculation
    const dist = calc.distributions?.find(d => d.partnerId === partnerId);
    
    if (dist && dist.profitDue !== undefined) {
      // Use stored profitDue from calculation
      const profitFromCalc = Math.max(0, dist.profitDue); // Only add positive profits
      totalProfitDue += profitFromCalc;
      console.log(`[getPartnerSummary] Calc ${calc.id}: profitDue=${dist.profitDue}, added=${profitFromCalc}`);
    } else if (calc.netProfit > 0) {
      // If no distribution found but net profit is positive, calculate based on partner's share
      const partnerShare = (calc.netProfit * partner.profitSharePercentage) / 100;
      totalProfitDue += partnerShare;
      console.log(`[getPartnerSummary] Calc ${calc.id}: No dist, calculated share=${partnerShare}`);
    }
  });
  
  console.log(`[getPartnerSummary] Final totalProfitDue: ${totalProfitDue}`);
  
  const totalPaid = validPayments
    .filter(p => p.type === 'payment' || p.type === 'settlement')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const totalAdjustments = validPayments
    .filter(p => p.type === 'adjustment')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const netBalance = totalProfitDue - totalPaid - totalAdjustments;
  
  // Credit balance (overpayments or if they paid during a loss period)
  const creditBalance = netBalance < 0 ? Math.abs(netBalance) : 0;
  // Outstanding balance (what's still owed to partner)
  const outstandingBalance = netBalance > 0 ? netBalance : 0;
  
  // Last payment date
  const lastPayment = validPayments
    .filter(p => p.type === 'payment' || p.type === 'settlement')
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  
  return {
    partner,
    totalProfitDue, // Already ensured to be >= 0
    totalPaid,
    totalAdjustments,
    creditBalance,
    outstandingBalance,
    netBalance,
    lastPaymentDate: lastPayment?.createdAt,
    paymentHistory: validPayments
  };
};

export const getAllPartnerSummaries = async (businessId: string): Promise<PartnerSummary[]> => {
  const partners = await fetchPartners(businessId);
  const summaries = await Promise.all(
    partners.map(p => getPartnerSummary(businessId, p.id))
  );
  return summaries.filter((s): s is PartnerSummary => s !== null);
};

// ============================================
// SETTLEMENT
// ============================================

export const settlePartnerBalance = async (
  businessId: string,
  partnerId: string,
  amount: number,
  description: string,
  userId: string
): Promise<void> => {
  const summary = await getPartnerSummary(businessId, partnerId);
  if (!summary) throw new Error('Partner not found');
  
  const batch = writeBatch(db);
  
  // Record the settlement payment
  const paymentRef = doc(paymentsCollection(businessId));
  batch.set(paymentRef, {
    partnerId,
    partnerName: summary.partner.name,
    amount,
    type: 'settlement',
    description: description || 'Balance settlement',
    createdAt: serverTimestamp(),
    createdBy: userId,
    isVoided: false
  });
  
  // If this creates an overpayment (credit), we'll handle it in future calculations
  
  await batch.commit();
  
  // Create audit log
  await createAuditLog(businessId, {
    action: 'settlement',
    entityType: 'payment',
    entityId: paymentRef.id,
    newValue: { partnerId, amount, type: 'settlement' },
    description: `Settled ${amount} for ${summary.partner.name}. Previous balance: ${summary.netBalance}`,
    performedBy: userId
  });
};

// ============================================
// AUDIT LOG
// ============================================

export const createAuditLog = async (
  businessId: string,
  payload: Omit<AuditLog, 'id' | 'performedAt'>
): Promise<void> => {
  const auditRef = doc(auditCollection(businessId));
  await setDoc(auditRef, {
    ...payload,
    performedAt: serverTimestamp()
  });
};

export const fetchAuditLogs = async (
  businessId: string,
  limitCount = 100
): Promise<AuditLog[]> => {
  // Fetch all and sort in memory to avoid index issues
  const q = query(auditCollection(businessId));
  const snapshot = await getDocs(q);
  
  const logs = snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      previousValue: data.previousValue,
      newValue: data.newValue,
      description: data.description,
      performedBy: data.performedBy,
      performedAt: toDate(data.performedAt)
    };
  });
  
  // Sort by performedAt descending and limit
  logs.sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime());
  
  return logs.slice(0, limitCount);
};
