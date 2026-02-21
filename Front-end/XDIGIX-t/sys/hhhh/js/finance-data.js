/**
 * Shared Finance Data Module
 * Provides centralized finance data management for all finance pages
 * Handles expenses, deposits, and financial calculations
 */

import { 
    getFirestore, 
    collection, 
    getDocs, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    query, 
    orderBy, 
    where, 
    Timestamp,
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

class FinanceDataManager {
    constructor(db, businessId) {
        this.db = db;
        this.businessId = businessId;
        this.expenses = [];
        this.deposits = [];
        this.listeners = [];
        this.isInitialized = false;
        this.unsubscribeExpenses = null;
        this.unsubscribeDeposits = null;
    }

    /**
     * Initialize and set up real-time listeners
     */
    async initialize() {
        if (this.isInitialized) return;
        
        if (!this.businessId) {
            console.error('FinanceDataManager: No businessId provided.');
            return;
        }
        
        try {
            this.startListeningForExpenses();
            this.startListeningForDeposits();
            this.isInitialized = true;
        } catch (error) {
            console.error('Error initializing finance data:', error);
            throw error;
        }
    }

    /**
     * Start real-time listener for expenses
     */
    startListeningForExpenses() {
        if (!this.businessId) return;
        
        const expensesRef = collection(this.db, 'businesses', this.businessId, 'expenses');
        const q = query(expensesRef, orderBy('date', 'desc'));
        
        this.unsubscribeExpenses = onSnapshot(q, (snapshot) => {
            this.expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.notifyListeners();
        }, (error) => {
            console.error("Error listening to expenses:", error);
        });
    }

    /**
     * Start real-time listener for deposits
     */
    startListeningForDeposits() {
        if (!this.businessId) return;
        
        const depositsRef = collection(this.db, 'businesses', this.businessId, 'deposits');
        const q = query(depositsRef, orderBy('recordedAt', 'desc'));
        
        this.unsubscribeDeposits = onSnapshot(q, (snapshot) => {
            this.deposits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.notifyListeners();
        }, (error) => {
            console.error("Error listening to deposits:", error);
        });
    }

    /**
     * Unsubscribe from all listeners
     */
    unsubscribeAll() {
        if (this.unsubscribeExpenses) {
            this.unsubscribeExpenses();
            this.unsubscribeExpenses = null;
        }
        if (this.unsubscribeDeposits) {
            this.unsubscribeDeposits();
            this.unsubscribeDeposits = null;
        }
    }

    /**
     * Add a new expense
     */
    async addExpense(expenseData) {
        if (!this.businessId) throw new Error('No business ID provided');

        try {
            const expensesRef = collection(this.db, 'businesses', this.businessId, 'expenses');
            const expense = {
                ...expenseData,
                date: expenseData.date || new Date().toISOString().split('T')[0],
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };
            const docRef = await addDoc(expensesRef, expense);
            // Data will be updated automatically via real-time listener
            return docRef.id;
        } catch (error) {
            console.error('Error adding expense:', error);
            throw error;
        }
    }

    /**
     * Update an existing expense
     */
    async updateExpense(expenseId, expenseData) {
        if (!this.businessId) throw new Error('No business ID provided');

        try {
            const expenseRef = doc(this.db, 'businesses', this.businessId, 'expenses', expenseId);
            await updateDoc(expenseRef, {
                ...expenseData,
                updatedAt: Timestamp.now()
            });
            // Data will be updated automatically via real-time listener
        } catch (error) {
            console.error('Error updating expense:', error);
            throw error;
        }
    }

    /**
     * Delete an expense
     */
    async deleteExpense(expenseId) {
        if (!this.businessId) throw new Error('No business ID provided');

        try {
            const expenseRef = doc(this.db, 'businesses', this.businessId, 'expenses', expenseId);
            await deleteDoc(expenseRef);
            // Data will be updated automatically via real-time listener
        } catch (error) {
            console.error('Error deleting expense:', error);
            throw error;
        }
    }

    /**
     * Add a new deposit
     */
    async addDeposit(depositData) {
        if (!this.businessId) throw new Error('No business ID provided');

        try {
            const depositsRef = collection(this.db, 'businesses', this.businessId, 'deposits');
            const deposit = {
                ...depositData,
                date: depositData.date || new Date().toISOString().split('T')[0],
                type: depositData.type || 'transfer',
                status: depositData.status || 'completed',
                recordedAt: Timestamp.now(),
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };
            const docRef = await addDoc(depositsRef, deposit);
            // Data will be updated automatically via real-time listener
            return docRef.id;
        } catch (error) {
            console.error('Error adding deposit:', error);
            throw error;
        }
    }

    /**
     * Update an existing deposit
     */
    async updateDeposit(depositId, depositData) {
        if (!this.businessId) throw new Error('No business ID provided');

        try {
            const depositRef = doc(this.db, 'businesses', this.businessId, 'deposits', depositId);
            await updateDoc(depositRef, {
                ...depositData,
                updatedAt: Timestamp.now()
            });
            // Data will be updated automatically via real-time listener
        } catch (error) {
            console.error('Error updating deposit:', error);
            throw error;
        }
    }

    /**
     * Delete a deposit
     */
    async deleteDeposit(depositId) {
        if (!this.businessId) throw new Error('No business ID provided');

        try {
            const depositRef = doc(this.db, 'businesses', this.businessId, 'deposits', depositId);
            await deleteDoc(depositRef);
            // Data will be updated automatically via real-time listener
        } catch (error) {
            console.error('Error deleting deposit:', error);
            throw error;
        }
    }

    /**
     * Calculate total expenses
     */
    getTotalExpenses(dateRange = null) {
        let expenses = this.expenses || [];
        
        if (dateRange) {
            expenses = this.filterByDateRange(expenses, dateRange.startDate, dateRange.endDate);
        }
        
        return expenses.reduce((total, expense) => total + (parseFloat(expense.amount) || 0), 0);
    }

    /**
     * Calculate total deposits
     */
    getTotalDeposits(dateRange = null) {
        let deposits = this.deposits || [];
        
        if (dateRange) {
            deposits = this.filterByDateRange(deposits, dateRange.startDate, dateRange.endDate);
        }
        
        return deposits.reduce((total, deposit) => total + (parseFloat(deposit.amount) || 0), 0);
    }

    /**
     * Calculate net balance (deposits - expenses)
     */
    getNetBalance(dateRange = null) {
        return this.getTotalDeposits(dateRange) - this.getTotalExpenses(dateRange);
    }

    /**
     * Get expenses by category
     */
    getExpensesByCategory(dateRange = null) {
        let expenses = this.expenses || [];
        
        if (dateRange) {
            expenses = this.filterByDateRange(expenses, dateRange.startDate, dateRange.endDate);
        }
        
        const categoryMap = {};
        expenses.forEach(expense => {
            const category = expense.category || 'Uncategorized';
            if (!categoryMap[category]) {
                categoryMap[category] = 0;
            }
            categoryMap[category] += parseFloat(expense.amount) || 0;
        });
        
        return categoryMap;
    }

    /**
     * Get expenses grouped by date
     */
    getExpensesByDate(dateRange = null) {
        let expenses = this.expenses || [];
        
        if (dateRange) {
            expenses = this.filterByDateRange(expenses, dateRange.startDate, dateRange.endDate);
        }
        
        const dateMap = {};
        expenses.forEach(expense => {
            let date;
            if (expense.date instanceof Timestamp) {
                date = expense.date.toDate().toISOString().split('T')[0];
            } else if (expense.date) {
                date = expense.date;
            } else if (expense.createdAt?.toDate) {
                date = expense.createdAt.toDate().toISOString().split('T')[0];
            } else {
                date = 'Unknown';
            }
            
            if (!dateMap[date]) {
                dateMap[date] = 0;
            }
            dateMap[date] += parseFloat(expense.amount) || 0;
        });
        
        return dateMap;
    }

    /**
     * Get deposits grouped by date
     */
    getDepositsByDate(dateRange = null) {
        let deposits = this.deposits || [];
        
        if (dateRange) {
            deposits = this.filterByDateRange(deposits, dateRange.startDate, dateRange.endDate);
        }
        
        const dateMap = {};
        deposits.forEach(deposit => {
            let date;
            if (deposit.date instanceof Timestamp) {
                date = deposit.date.toDate().toISOString().split('T')[0];
            } else if (deposit.date) {
                date = deposit.date;
            } else if (deposit.recordedAt instanceof Timestamp) {
                date = deposit.recordedAt.toDate().toISOString().split('T')[0];
            } else if (deposit.createdAt?.toDate) {
                date = deposit.createdAt.toDate().toISOString().split('T')[0];
            } else {
                date = 'Unknown';
            }
            
            if (!dateMap[date]) {
                dateMap[date] = 0;
            }
            dateMap[date] += parseFloat(deposit.amount) || 0;
        });
        
        return dateMap;
    }

    /**
     * Filter items by date range
     */
    filterByDateRange(items, startDate, endDate) {
        if (!startDate && !endDate) return items;
        
        return items.filter(item => {
            let itemDate;
            if (item.date instanceof Timestamp) {
                itemDate = item.date.toDate();
            } else if (item.date) {
                itemDate = new Date(item.date);
            } else if (item.recordedAt instanceof Timestamp) {
                itemDate = item.recordedAt.toDate();
            } else if (item.createdAt?.toDate) {
                itemDate = item.createdAt.toDate();
            } else {
                return false;
            }
            
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            end?.setHours(23, 59, 59, 999); // Include the entire end day
            
            if (start && end) {
                return itemDate >= start && itemDate <= end;
            } else if (start) {
                return itemDate >= start;
            } else if (end) {
                return itemDate <= end;
            }
            
            return true;
        });
    }

    /**
     * Subscribe to data changes
     */
    subscribe(callback) {
        this.listeners.push(callback);
        // Immediately send current data (will have safe defaults if no data yet)
        try {
            callback(this.getData());
        } catch (error) {
            console.error('Error in subscribe callback:', error);
        }
        
        // Return unsubscribe function
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    /**
     * Unsubscribe from data changes
     */
    unsubscribe(callback) {
        this.listeners = this.listeners.filter(l => l !== callback);
    }

    /**
     * Get current data
     */
    getData() {
        try {
            return {
                expenses: this.expenses || [],
                deposits: this.deposits || [],
                summary: this.getSummary() || {
                    totalExpenses: 0,
                    totalDeposits: 0,
                    netBalance: 0,
                    expenseCount: 0,
                    depositCount: 0,
                    expensesByCategory: {},
                    expensesByDate: {},
                    depositsByDate: {}
                }
            };
        } catch (error) {
            console.error('Error getting finance data:', error);
            return {
                expenses: [],
                deposits: [],
                summary: {
                    totalExpenses: 0,
                    totalDeposits: 0,
                    netBalance: 0,
                    expenseCount: 0,
                    depositCount: 0,
                    expensesByCategory: {},
                    expensesByDate: {},
                    depositsByDate: {}
                }
            };
        }
    }

    /**
     * Notify all listeners of data changes
     */
    notifyListeners() {
        const data = this.getData();
        this.listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('Error in finance data listener:', error);
            }
        });
    }

    /**
     * Refresh all data (real-time listeners handle this automatically)
     */
    async refresh() {
        // Real-time listeners automatically keep data fresh
        // This method can trigger a manual refresh if needed
        this.notifyListeners();
    }

    /**
     * Get summary statistics
     */
    getSummary(dateRange = null) {
        const totalExpenses = this.getTotalExpenses(dateRange) || 0;
        const totalDeposits = this.getTotalDeposits(dateRange) || 0;
        const netBalance = this.getNetBalance(dateRange) || 0;
        
        return {
            totalExpenses: totalExpenses,
            totalDeposits: totalDeposits,
            netBalance: netBalance,
            expenseCount: dateRange 
                ? (this.filterByDateRange(this.expenses || [], dateRange.startDate, dateRange.endDate).length || 0)
                : (this.expenses?.length || 0),
            depositCount: dateRange
                ? (this.filterByDateRange(this.deposits || [], dateRange.startDate, dateRange.endDate).length || 0)
                : (this.deposits?.length || 0),
            expensesByCategory: this.getExpensesByCategory(dateRange) || {},
            expensesByDate: this.getExpensesByDate(dateRange) || {},
            depositsByDate: this.getDepositsByDate(dateRange) || {}
        };
    }
}

// Global finance data manager instance
window.FinanceDataManager = FinanceDataManager;

// Create and export a singleton instance getter
let instance = null;
function getFinanceDataManager(db, businessId) {
    if (!instance || instance.businessId !== businessId) {
        if (instance) {
            instance.unsubscribeAll(); // Clean up old listeners
        }
        instance = new FinanceDataManager(db, businessId);
    }
    return instance;
}

// Also attach to window for global access
window.getFinanceDataManager = getFinanceDataManager;

// Export both default and named export
export default FinanceDataManager;
export { getFinanceDataManager };

