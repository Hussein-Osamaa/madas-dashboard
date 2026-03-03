// Admin Enhanced Script - User Management for Business Data Access
console.log('👥 Admin enhanced script loaded');

// User Management System
class UserManagement {
    constructor() {
        this.users = this.loadUsers();
        this.currentUser = null;
        this.isInitialized = false;
    }

    // Initialize user management
    init() {
        console.log('🔐 Initializing user management...');
        this.setupEventListeners();
        this.loadUserTable();
        this.updateStats();
        this.isInitialized = true;
        console.log('✅ User management initialized');
    }

    // Load users from localStorage
    loadUsers() {
        const storedUsers = localStorage.getItem('business_users');
        return storedUsers ? JSON.parse(storedUsers) : [];
    }

    // Save users to localStorage
    saveUsers() {
        localStorage.setItem('business_users', JSON.stringify(this.users));
    }

    // Setup event listeners
    setupEventListeners() {
        // Add user button
        const addUserBtn = document.getElementById('addStaffBtn');
        if (addUserBtn) {
            addUserBtn.addEventListener('click', () => this.showAddUserModal());
        }

        // Sidebar add user button
        const addUserBtnSidebar = document.getElementById('addStaffBtnSidebar');
        if (addUserBtnSidebar) {
            addUserBtnSidebar.addEventListener('click', () => this.showAddUserModal());
        }

        // Export users button
        const exportBtn = document.getElementById('exportStaffBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportUsers());
        }

        // Sidebar export button
        const exportBtnSidebar = document.getElementById('exportStaffBtn');
        if (exportBtnSidebar) {
            exportBtnSidebar.addEventListener('click', () => this.exportUsers());
        }

        // Bulk actions button
        const bulkBtn = document.getElementById('bulkActionsBtn');
        if (bulkBtn) {
            bulkBtn.addEventListener('click', () => this.showBulkActionsModal());
        }

        // Sidebar bulk actions button
        const bulkBtnSidebar = document.getElementById('bulkActionsBtn');
        if (bulkBtnSidebar) {
            bulkBtnSidebar.addEventListener('click', () => this.showBulkActionsModal());
        }

        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filterUsers(e.target.value));
        }

        // Status filter
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => this.filterUsersByStatus(e.target.value));
        }

        // Role filter
        const roleFilter = document.getElementById('roleFilter');
        if (roleFilter) {
            roleFilter.addEventListener('change', (e) => this.filterUsersByRole(e.target.value));
        }

        // Clear filters
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearFilters());
        }

        // Modal close buttons
        this.setupModalListeners();
    }

    // Setup modal event listeners
    setupModalListeners() {
        // Staff modal
        const closeStaffModalBtn = document.getElementById('closeStaffModalBtn');
        if (closeStaffModalBtn) {
            closeStaffModalBtn.addEventListener('click', () => this.hideAddUserModal());
        }

        const cancelStaffBtn = document.getElementById('cancelStaffBtn');
        if (cancelStaffBtn) {
            cancelStaffBtn.addEventListener('click', () => this.hideAddUserModal());
        }

        // Staff form submission
        const staffForm = document.getElementById('staffForm');
        if (staffForm) {
            staffForm.addEventListener('submit', (e) => this.handleUserFormSubmit(e));
        }

        // Bulk actions modal
        const closeBulkModalBtn = document.getElementById('closeBulkModalBtn');
        if (closeBulkModalBtn) {
            closeBulkModalBtn.addEventListener('click', () => this.hideBulkActionsModal());
        }

        const cancelBulkBtn = document.getElementById('cancelBulkBtn');
        if (cancelBulkBtn) {
            cancelBulkBtn.addEventListener('click', () => this.hideBulkActionsModal());
        }

        const applyBulkBtn = document.getElementById('applyBulkBtn');
        if (applyBulkBtn) {
            applyBulkBtn.addEventListener('click', () => this.applyBulkActions());
        }

        // Select all checkbox
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => this.toggleSelectAll(e.target.checked));
        }
    }

    // Show add user modal
    showAddUserModal() {
        const modal = document.getElementById('staffModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            this.resetUserForm();
        }
    }

    // Hide add user modal
    hideAddUserModal() {
        const modal = document.getElementById('staffModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    }

    // Show bulk actions modal
    showBulkActionsModal() {
        const modal = document.getElementById('bulkActionsModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            this.updateBulkActionDetails();
        }
    }

    // Hide bulk actions modal
    hideBulkActionsModal() {
        const modal = document.getElementById('bulkActionsModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    }

    // Reset user form
    resetUserForm() {
        const form = document.getElementById('staffForm');
        if (form) {
            form.reset();
            document.getElementById('staffId').value = '';
            document.getElementById('modalTitle').textContent = 'Add New Staff Member';
            document.getElementById('passwordChangeSection').classList.add('hidden');
        }
    }

    // Handle user form submission
    handleUserFormSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const userData = {
            id: this.generateUserId(),
            firstName: formData.get('staffFirstName'),
            lastName: formData.get('staffLastName'),
            email: formData.get('staffEmail'),
            contact: formData.get('staffContact'),
            role: formData.get('staffRole'),
            status: formData.get('staffStatus'),
            permissions: this.getSelectedPermissions(),
            createdAt: new Date().toISOString(),
            lastLogin: null
        };

        // Validate required fields
        if (!userData.firstName || !userData.lastName || !userData.email || !userData.role || !userData.status) {
            alert('Please fill in all required fields.');
            return;
        }

        // Check if email already exists
        if (this.users.find(user => user.email === userData.email)) {
            alert('A user with this email already exists.');
            return;
        }

        // Add user
        this.users.push(userData);
        this.saveUsers();
        this.loadUserTable();
        this.updateStats();
        this.hideAddUserModal();
        
        alert('User added successfully!');
    }

    // Generate unique user ID
    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Get selected permissions
    getSelectedPermissions() {
        const permissions = {};
        const permissionCategories = ['dashboard', 'orders', 'inventory', 'customers', 'employees', 'finance', 'analytics', 'reports', 'insights', 'settings'];
        
        permissionCategories.forEach(category => {
            permissions[category] = [];
            const checkboxes = document.querySelectorAll(`input[name="${category}"]:checked`);
            checkboxes.forEach(checkbox => {
                permissions[category].push(checkbox.value);
            });
        });
        
        return permissions;
    }

    // Load user table
    loadUserTable() {
        const tbody = document.getElementById('staffTableBody');
        if (!tbody) return;

        if (this.users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-8 text-center text-gray-500">
                        <div class="flex flex-col items-center">
                            <span class="material-icons text-4xl mb-2">group</span>
                            <p>No users found. Add your first team member!</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.users.map(user => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4">
                    <input type="checkbox" class="user-checkbox w-4 h-4 rounded" data-user-id="${user.id}">
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center">
                        <div class="w-10 h-10 bg-[var(--madas-primary)] rounded-full flex items-center justify-center text-white font-bold">
                            ${user.firstName.charAt(0)}${user.lastName.charAt(0)}
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">${user.firstName} ${user.lastName}</div>
                            <div class="text-sm text-gray-500">${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm text-gray-900">${user.email}</div>
                    <div class="text-sm text-gray-500">${user.contact || 'No contact info'}</div>
                </td>
                <td class="px-6 py-4">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${this.getRoleColor(user.role)}">
                        ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                </td>
                <td class="px-6 py-4">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${this.getStatusColor(user.status)}">
                        ${user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                    </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">
                    ${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center space-x-2">
                        <button onclick="userManagement.editUser('${user.id}')" class="text-blue-600 hover:text-blue-900 text-sm">
                            <span class="material-icons text-sm">edit</span>
                        </button>
                        <button onclick="userManagement.deleteUser('${user.id}')" class="text-red-600 hover:text-red-900 text-sm">
                            <span class="material-icons text-sm">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Get role color class
    getRoleColor(role) {
        const colors = {
            'owner': 'bg-purple-100 text-purple-800',
            'admin': 'bg-red-100 text-red-800',
            'manager': 'bg-blue-100 text-blue-800',
            'staff': 'bg-green-100 text-green-800'
        };
        return colors[role] || 'bg-gray-100 text-gray-800';
    }

    // Get status color class
    getStatusColor(status) {
        const colors = {
            'active': 'bg-green-100 text-green-800',
            'pending': 'bg-yellow-100 text-yellow-800',
            'suspended': 'bg-red-100 text-red-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    }

    // Edit user
    editUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        // Populate form with user data
        document.getElementById('staffId').value = user.id;
        document.getElementById('staffFirstName').value = user.firstName;
        document.getElementById('staffLastName').value = user.lastName;
        document.getElementById('staffEmail').value = user.email;
        document.getElementById('staffContact').value = user.contact || '';
        document.getElementById('staffRole').value = user.role;
        document.getElementById('staffStatus').value = user.status;

        // Set permissions
        this.setUserPermissions(user.permissions);

        // Show modal
        document.getElementById('modalTitle').textContent = 'Edit Staff Member';
        document.getElementById('passwordChangeSection').classList.remove('hidden');
        this.showAddUserModal();
    }

    // Set user permissions in form
    setUserPermissions(permissions) {
        Object.keys(permissions).forEach(category => {
            permissions[category].forEach(permission => {
                const checkbox = document.querySelector(`input[name="${category}"][value="${permission}"]`);
                if (checkbox) checkbox.checked = true;
            });
        });
    }

    // Delete user
    deleteUser(userId) {
        if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            this.users = this.users.filter(user => user.id !== userId);
            this.saveUsers();
            this.loadUserTable();
            this.updateStats();
            alert('User deleted successfully!');
        }
    }

    // Filter users by search term
    filterUsers(searchTerm) {
        const filteredUsers = this.users.filter(user => 
            user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.role.toLowerCase().includes(searchTerm.toLowerCase())
        );
        this.displayFilteredUsers(filteredUsers);
    }

    // Filter users by status
    filterUsersByStatus(status) {
        if (!status) {
            this.loadUserTable();
            return;
        }
        const filteredUsers = this.users.filter(user => user.status === status);
        this.displayFilteredUsers(filteredUsers);
    }

    // Filter users by role
    filterUsersByRole(role) {
        if (!role) {
            this.loadUserTable();
            return;
        }
        const filteredUsers = this.users.filter(user => user.role === role);
        this.displayFilteredUsers(filteredUsers);
    }

    // Display filtered users
    displayFilteredUsers(users) {
        const tbody = document.getElementById('staffTableBody');
        if (!tbody) return;

        if (users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-8 text-center text-gray-500">
                        <div class="flex flex-col items-center">
                            <span class="material-icons text-4xl mb-2">search_off</span>
                            <p>No users found matching your criteria.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        // Update the table with filtered users
        tbody.innerHTML = users.map(user => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4">
                    <input type="checkbox" class="user-checkbox w-4 h-4 rounded" data-user-id="${user.id}">
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center">
                        <div class="w-10 h-10 bg-[var(--madas-primary)] rounded-full flex items-center justify-center text-white font-bold">
                            ${user.firstName.charAt(0)}${user.lastName.charAt(0)}
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">${user.firstName} ${user.lastName}</div>
                            <div class="text-sm text-gray-500">${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm text-gray-900">${user.email}</div>
                    <div class="text-sm text-gray-500">${user.contact || 'No contact info'}</div>
                </td>
                <td class="px-6 py-4">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${this.getRoleColor(user.role)}">
                        ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                </td>
                <td class="px-6 py-4">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${this.getStatusColor(user.status)}">
                        ${user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                    </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">
                    ${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center space-x-2">
                        <button onclick="userManagement.editUser('${user.id}')" class="text-blue-600 hover:text-blue-900 text-sm">
                            <span class="material-icons text-sm">edit</span>
                        </button>
                        <button onclick="userManagement.deleteUser('${user.id}')" class="text-red-600 hover:text-red-900 text-sm">
                            <span class="material-icons text-sm">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Clear filters
    clearFilters() {
        document.getElementById('searchInput').value = '';
        document.getElementById('statusFilter').value = '';
        document.getElementById('roleFilter').value = '';
        this.loadUserTable();
    }

    // Toggle select all
    toggleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.user-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
        });
        this.updateBulkActionDetails();
    }

    // Update bulk action details
    updateBulkActionDetails() {
        const selectedCount = document.querySelectorAll('.user-checkbox:checked').length;
        const selectedCountElement = document.getElementById('selectedCount');
        const bulkActionDetails = document.getElementById('bulkActionDetails');
        
        if (selectedCountElement) {
            selectedCountElement.textContent = selectedCount;
        }
        
        if (bulkActionDetails) {
            bulkActionDetails.classList.toggle('hidden', selectedCount === 0);
        }
    }

    // Apply bulk actions
    applyBulkActions() {
        const action = document.getElementById('bulkAction').value;
        const selectedUsers = Array.from(document.querySelectorAll('.user-checkbox:checked'))
            .map(checkbox => checkbox.dataset.userId);

        if (!action) {
            alert('Please select an action.');
            return;
        }

        if (selectedUsers.length === 0) {
            alert('Please select at least one user.');
            return;
        }

        switch (action) {
            case 'approve':
                this.bulkApproveUsers(selectedUsers);
                break;
            case 'suspend':
                this.bulkSuspendUsers(selectedUsers);
                break;
            case 'delete':
                this.bulkDeleteUsers(selectedUsers);
                break;
            case 'export':
                this.bulkExportUsers(selectedUsers);
                break;
        }

        this.hideBulkActionsModal();
    }

    // Bulk approve users
    bulkApproveUsers(userIds) {
        userIds.forEach(userId => {
            const user = this.users.find(u => u.id === userId);
            if (user) user.status = 'active';
        });
        this.saveUsers();
        this.loadUserTable();
        this.updateStats();
        alert(`${userIds.length} users approved successfully!`);
    }

    // Bulk suspend users
    bulkSuspendUsers(userIds) {
        userIds.forEach(userId => {
            const user = this.users.find(u => u.id === userId);
            if (user) user.status = 'suspended';
        });
        this.saveUsers();
        this.loadUserTable();
        this.updateStats();
        alert(`${userIds.length} users suspended successfully!`);
    }

    // Bulk delete users
    bulkDeleteUsers(userIds) {
        if (confirm(`Are you sure you want to delete ${userIds.length} users? This action cannot be undone.`)) {
            this.users = this.users.filter(user => !userIds.includes(user.id));
            this.saveUsers();
            this.loadUserTable();
            this.updateStats();
            alert(`${userIds.length} users deleted successfully!`);
        }
    }

    // Bulk export users
    bulkExportUsers(userIds) {
        const selectedUsers = this.users.filter(user => userIds.includes(user.id));
        this.exportUsersToCSV(selectedUsers);
    }

    // Export users
    exportUsers() {
        this.exportUsersToCSV(this.users);
    }

    // Export users to CSV
    exportUsersToCSV(users) {
        const csvContent = [
            ['Name', 'Email', 'Contact', 'Role', 'Status', 'Created At', 'Last Login'],
            ...users.map(user => [
                `${user.firstName} ${user.lastName}`,
                user.email,
                user.contact || '',
                user.role,
                user.status,
                new Date(user.createdAt).toLocaleDateString(),
                user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `business-users-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    // Update statistics
    updateStats() {
        const totalStaff = this.users.length;
        const activeStaff = this.users.filter(user => user.status === 'active').length;
        const pendingStaff = this.users.filter(user => user.status === 'pending').length;
        const adminStaff = this.users.filter(user => user.role === 'admin' || user.role === 'owner').length;

        // Update stats elements
        const totalStaffElement = document.getElementById('total-staff');
        const activeStaffElement = document.getElementById('active-staff');
        const pendingStaffElement = document.getElementById('pending-staff');
        const adminStaffElement = document.getElementById('admin-staff');

        if (totalStaffElement) totalStaffElement.textContent = totalStaff;
        if (activeStaffElement) activeStaffElement.textContent = activeStaff;
        if (pendingStaffElement) pendingStaffElement.textContent = pendingStaff;
        if (adminStaffElement) adminStaffElement.textContent = adminStaff;
    }
}

// Initialize user management when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.userManagement = new UserManagement();
    window.userManagement.init();
});

// Export for use in other scripts
window.UserManagement = UserManagement;
