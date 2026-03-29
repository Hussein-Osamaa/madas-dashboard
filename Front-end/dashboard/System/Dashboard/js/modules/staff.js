// Staff Module for MADAS Dashboard
class StaffModule {
    constructor() {
        this.staffData = [];
        this.currentUser = null;
        this.init();
    }

    init() {
        console.log('👥 Staff module initialized');
        this.loadStaffData();
    }

    async loadStaffData() {
        try {
            // Load staff data from localStorage or Firestore
            const storedData = localStorage.getItem('staffData');
            if (storedData) {
                this.staffData = JSON.parse(storedData);
                console.log('👥 Staff data loaded from localStorage:', this.staffData);
                this.updateStaffInterface();
            } else {
                // Load from Firestore if available
                await this.loadFromFirestore();
            }
        } catch (error) {
            console.error('❌ Error loading staff data:', error);
        }
    }

    async loadFromFirestore() {
        if (!window.db) return;

        try {
            // Firebase removed - using backend API
            const staffSnapshot = await getDocs(collection(window.db, "staff"));
            
            this.staffData = [];
            staffSnapshot.forEach(doc => {
                this.staffData.push({ id: doc.id, ...doc.data() });
            });
            
            localStorage.setItem('staffData', JSON.stringify(this.staffData));
            console.log('👥 Staff data loaded from Firestore:', this.staffData);
            this.updateStaffInterface();
        } catch (error) {
            console.error('❌ Error loading from Firestore:', error);
        }
    }

    updateStaffInterface() {
        // Update staff list in the interface
        const staffListElement = document.getElementById('staff-list');
        if (staffListElement) {
            this.renderStaffList(staffListElement);
        }

        // Update staff statistics
        this.updateStaffStats();
    }

    renderStaffList(container) {
        if (!this.staffData || this.staffData.length === 0) {
            container.innerHTML = '<p class="text-gray-500">No staff members found</p>';
            return;
        }

        const staffHTML = this.staffData.map(staff => `
            <div class="staff-member p-4 bg-white rounded-lg shadow-sm border">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span class="text-blue-600 font-semibold">${staff.name?.charAt(0) || 'S'}</span>
                        </div>
                        <div>
                            <h3 class="font-semibold text-gray-900">${staff.name || 'Staff Member'}</h3>
                            <p class="text-sm text-gray-600">${staff.email || 'No email'}</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="px-2 py-1 text-xs rounded-full ${this.getRoleColor(staff.role)}">
                            ${staff.role || 'Staff'}
                        </span>
                        <span class="px-2 py-1 text-xs rounded-full ${this.getStatusColor(staff.status)}">
                            ${staff.status || 'Active'}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = staffHTML;
    }

    getRoleColor(role) {
        const colors = {
            'admin': 'bg-red-100 text-red-800',
            'manager': 'bg-blue-100 text-blue-800',
            'staff': 'bg-green-100 text-green-800',
            'viewer': 'bg-gray-100 text-gray-800'
        };
        return colors[role] || 'bg-gray-100 text-gray-800';
    }

    getStatusColor(status) {
        const colors = {
            'active': 'bg-green-100 text-green-800',
            'inactive': 'bg-red-100 text-red-800',
            'pending': 'bg-yellow-100 text-yellow-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    }

    updateStaffStats() {
        const totalStaff = this.staffData.length;
        const activeStaff = this.staffData.filter(staff => staff.status === 'active').length;
        const adminCount = this.staffData.filter(staff => staff.role === 'admin').length;

        // Update statistics in the interface
        const totalStaffElement = document.getElementById('total-staff');
        if (totalStaffElement) {
            totalStaffElement.textContent = totalStaff;
        }

        const activeStaffElement = document.getElementById('active-staff');
        if (activeStaffElement) {
            activeStaffElement.textContent = activeStaff;
        }

        const adminCountElement = document.getElementById('admin-count');
        if (adminCountElement) {
            adminCountElement.textContent = adminCount;
        }
    }

    async addStaff(staffData) {
        try {
            const newStaff = {
                id: Date.now().toString(),
                ...staffData,
                createdAt: new Date().toISOString(),
                status: 'active'
            };

            this.staffData.push(newStaff);
            localStorage.setItem('staffData', JSON.stringify(this.staffData));

            // Save to Firestore if available
            if (window.db) {
                await this.saveToFirestore(newStaff);
            }

            console.log('👥 Staff member added:', newStaff);
            this.updateStaffInterface();
            return newStaff;
        } catch (error) {
            console.error('❌ Error adding staff member:', error);
            throw error;
        }
    }

    async saveToFirestore(staffData) {
        if (!window.db) return;

        try {
            // Firebase removed - using backend API
            await addDoc(collection(window.db, "staff"), staffData);
            console.log('💾 Staff data saved to Firestore');
        } catch (error) {
            console.error('❌ Error saving to Firestore:', error);
        }
    }

    async updateStaff(staffId, updateData) {
        try {
            const staffIndex = this.staffData.findIndex(staff => staff.id === staffId);
            if (staffIndex !== -1) {
                this.staffData[staffIndex] = { ...this.staffData[staffIndex], ...updateData };
                localStorage.setItem('staffData', JSON.stringify(this.staffData));

                // Update in Firestore if available
                if (window.db) {
                    await this.updateInFirestore(staffId, updateData);
                }

                console.log('👥 Staff member updated:', this.staffData[staffIndex]);
                this.updateStaffInterface();
                return this.staffData[staffIndex];
            }
        } catch (error) {
            console.error('❌ Error updating staff member:', error);
            throw error;
        }
    }

    async updateInFirestore(staffId, updateData) {
        if (!window.db) return;

        try {
            // Firebase removed - using backend API
            const staffRef = doc(window.db, "staff", staffId);
            await updateDoc(staffRef, updateData);
            console.log('💾 Staff data updated in Firestore');
        } catch (error) {
            console.error('❌ Error updating in Firestore:', error);
        }
    }

    async removeStaff(staffId) {
        try {
            this.staffData = this.staffData.filter(staff => staff.id !== staffId);
            localStorage.setItem('staffData', JSON.stringify(this.staffData));

            // Remove from Firestore if available
            if (window.db) {
                await this.removeFromFirestore(staffId);
            }

            console.log('👥 Staff member removed:', staffId);
            this.updateStaffInterface();
        } catch (error) {
            console.error('❌ Error removing staff member:', error);
            throw error;
        }
    }

    async removeFromFirestore(staffId) {
        if (!window.db) return;

        try {
            // Firebase removed - using backend API
            const staffRef = doc(window.db, "staff", staffId);
            await deleteDoc(staffRef);
            console.log('💾 Staff data removed from Firestore');
        } catch (error) {
            console.error('❌ Error removing from Firestore:', error);
        }
    }

    getStaffData() {
        return this.staffData;
    }

    getStaffById(id) {
        return this.staffData.find(staff => staff.id === id);
    }

    getStaffByRole(role) {
        return this.staffData.filter(staff => staff.role === role);
    }

    getActiveStaff() {
        return this.staffData.filter(staff => staff.status === 'active');
    }
}

// Initialize staff module
window.staffModule = new StaffModule();

console.log('✅ Staff module loaded');
