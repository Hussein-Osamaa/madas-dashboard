// Business Module for MADAS Dashboard
class BusinessModule {
    constructor() {
        this.businessData = null;
        this.init();
    }

    init() {
        console.log('🏢 Business module initialized');
        this.loadBusinessData();
    }

    async loadBusinessData() {
        try {
            // Load business data from localStorage or Firestore
            const storedData = localStorage.getItem('businessData');
            if (storedData) {
                this.businessData = JSON.parse(storedData);
                console.log('🏢 Business data loaded from localStorage:', this.businessData);
                this.updateBusinessInterface();
            } else {
                // Load from Firestore if available
                await this.loadFromFirestore();
            }
        } catch (error) {
            console.error('❌ Error loading business data:', error);
        }
    }

    async loadFromFirestore() {
        if (!window.db) return;

        try {
            const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
            const businessSnapshot = await getDocs(collection(window.db, "businesses"));
            
            if (!businessSnapshot.empty) {
                const businessData = businessSnapshot.docs[0].data();
                this.businessData = businessData;
                localStorage.setItem('businessData', JSON.stringify(businessData));
                console.log('🏢 Business data loaded from Firestore:', businessData);
                this.updateBusinessInterface();
            }
        } catch (error) {
            console.error('❌ Error loading from Firestore:', error);
        }
    }

    updateBusinessInterface() {
        if (!this.businessData) return;

        // Update business name
        const businessNameElements = document.querySelectorAll('[data-business-name]');
        businessNameElements.forEach(element => {
            element.textContent = this.businessData.name || 'Business Name';
        });

        // Update business email
        const businessEmailElements = document.querySelectorAll('[data-business-email]');
        businessEmailElements.forEach(element => {
            element.textContent = this.businessData.email || 'business@example.com';
        });

        // Update business plan
        const businessPlanElements = document.querySelectorAll('[data-business-plan]');
        businessPlanElements.forEach(element => {
            element.textContent = this.businessData.plan || 'Starter';
        });

        // Update business stats
        this.updateBusinessStats();
    }

    updateBusinessStats() {
        if (!this.businessData) return;

        // Update dashboard statistics
        const stats = this.businessData.stats || {};
        
        const totalSalesElement = document.getElementById('total-sales');
        if (totalSalesElement) {
            totalSalesElement.textContent = `$${stats.totalSales || 0}`;
        }

        const totalOrdersElement = document.getElementById('total-orders');
        if (totalOrdersElement) {
            totalOrdersElement.textContent = stats.totalOrders || 0;
        }

        const totalCustomersElement = document.getElementById('total-customers');
        if (totalCustomersElement) {
            totalCustomersElement.textContent = stats.totalCustomers || 0;
        }

        const totalProductsElement = document.getElementById('total-products');
        if (totalProductsElement) {
            totalProductsElement.textContent = stats.totalProducts || 0;
        }
    }

    async saveBusinessData(data) {
        try {
            this.businessData = { ...this.businessData, ...data };
            localStorage.setItem('businessData', JSON.stringify(this.businessData));
            
            // Save to Firestore if available
            if (window.db) {
                await this.saveToFirestore(data);
            }
            
            console.log('💾 Business data saved:', data);
            this.updateBusinessInterface();
        } catch (error) {
            console.error('❌ Error saving business data:', error);
        }
    }

    async saveToFirestore(data) {
        if (!window.db) return;

        try {
            const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
            const businessRef = doc(window.db, "businesses", this.businessData.id || "default");
            await updateDoc(businessRef, data);
            console.log('💾 Business data saved to Firestore');
        } catch (error) {
            console.error('❌ Error saving to Firestore:', error);
        }
    }

    getBusinessData() {
        return this.businessData;
    }

    getBusinessStats() {
        return this.businessData?.stats || {};
    }

    updateBusinessStats(stats) {
        if (!this.businessData) {
            this.businessData = {};
        }
        this.businessData.stats = { ...this.businessData.stats, ...stats };
        this.saveBusinessData({ stats: this.businessData.stats });
    }
}

// Initialize business module
window.businessModule = new BusinessModule();

console.log('✅ Business module loaded');
