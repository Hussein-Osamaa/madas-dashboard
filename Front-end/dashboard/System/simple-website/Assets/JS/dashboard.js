// Dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    // Dashboard elements
    const totalClientsEl = document.getElementById('totalClients');
    const activeSubscriptionsEl = document.getElementById('activeSubscriptions');
    const revenueEl = document.getElementById('revenue');
    const newThisMonthEl = document.getElementById('newThisMonth');
    const clientsTableBody = document.getElementById('clientsTableBody');
    const accessMatrix = document.getElementById('accessMatrix');
    const refreshBtn = document.getElementById('refreshBtn');
    const exportBtn = document.getElementById('exportBtn');
    const businessEmailsGrid = document.getElementById('businessEmailsGrid');
    const refreshBusinessEmailsBtn = document.getElementById('refreshBusinessEmailsBtn');
    const exportBusinessEmailsBtn = document.getElementById('exportBusinessEmailsBtn');

    // Plan access definitions
    const planAccess = {
        starter: {
            name: 'Starter',
            price: 29,
            features: {
                'Website Builder': true,
                'Basic Analytics': true,
                'Email Support': true,
                '5GB Storage': true,
                'Custom Domain': false,
                'Advanced Analytics': false,
                'Priority Support': false,
                'API Access': false,
                'White Label': false,
                'Custom Integrations': false
            }
        },
        professional: {
            name: 'Professional',
            price: 79,
            features: {
                'Website Builder': true,
                'Basic Analytics': true,
                'Email Support': true,
                '5GB Storage': true,
                'Custom Domain': true,
                'Advanced Analytics': true,
                'Priority Support': true,
                'API Access': true,
                'White Label': false,
                'Custom Integrations': false
            }
        },
        enterprise: {
            name: 'Enterprise',
            price: 199,
            features: {
                'Website Builder': true,
                'Basic Analytics': true,
                'Email Support': true,
                '5GB Storage': true,
                'Custom Domain': true,
                'Advanced Analytics': true,
                'Priority Support': true,
                'API Access': true,
                'White Label': true,
                'Custom Integrations': true
            }
        }
    };

    // Load dashboard data
    function loadDashboardData() {
        const clients = JSON.parse(localStorage.getItem('nextgen_clients') || '[]');
        
        // Update statistics
        updateStatistics(clients);
        
        // Update clients table
        updateClientsTable(clients);
        
        // Update access matrix
        updateAccessMatrix();
        
        console.log('📊 Dashboard data loaded successfully');
        console.log('👥 Total clients:', clients.length);
    }

    // Update statistics
    function updateStatistics(clients) {
        const totalClients = clients.length;
        const activeSubscriptions = clients.filter(client => client.status === 'active').length;
        
        // Calculate revenue
        const revenue = clients.reduce((total, client) => {
            const planPrice = planAccess[client.plan]?.price || 0;
            return total + planPrice;
        }, 0);
        
        // Calculate new clients this month
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const newThisMonth = clients.filter(client => {
            const clientDate = new Date(client.createdAt);
            return clientDate.getMonth() === currentMonth && clientDate.getFullYear() === currentYear;
        }).length;

        // Update DOM elements
        totalClientsEl.textContent = totalClients;
        activeSubscriptionsEl.textContent = activeSubscriptions;
        revenueEl.textContent = `$${revenue}`;
        newThisMonthEl.textContent = newThisMonth;
    }

    // Update clients table
    function updateClientsTable(clients) {
        clientsTableBody.innerHTML = '';
        
        if (clients.length === 0) {
            clientsTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="no-data">
                        <i class="fas fa-users"></i>
                        <span>No clients registered yet</span>
                    </td>
                </tr>
            `;
            return;
        }

        clients.forEach(client => {
            const row = document.createElement('tr');
            const joinDate = new Date(client.createdAt).toLocaleDateString();
            const statusClass = client.status === 'active' ? 'status-active' : 'status-inactive';
            
            row.innerHTML = `
                <td class="client-id">${client.id}</td>
                <td class="client-name">${client.firstName} ${client.lastName}</td>
                <td class="client-email">${client.email}</td>
                <td class="client-company">${client.company}</td>
                <td class="client-plan">
                    <span class="plan-badge plan-${client.plan}">${planAccess[client.plan]?.name || client.plan}</span>
                </td>
                <td class="client-status">
                    <span class="status-badge ${statusClass}">${client.status}</span>
                </td>
                <td class="client-joined">${joinDate}</td>
                <td class="client-actions">
                    <button class="action-btn view-btn" onclick="viewClient('${client.id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit-btn" onclick="editClient('${client.id}')" title="Edit Client">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteClient('${client.id}')" title="Delete Client">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            clientsTableBody.appendChild(row);
        });
    }

    // Update access matrix
    function updateAccessMatrix() {
        const features = Object.keys(planAccess.starter.features);
        
        let matrixHTML = `
            <div class="matrix-header">
                <div class="feature-column">Feature</div>
                <div class="plan-column">Starter ($29)</div>
                <div class="plan-column">Professional ($79)</div>
                <div class="plan-column">Enterprise ($199)</div>
            </div>
        `;
        
        features.forEach(feature => {
            matrixHTML += `
                <div class="matrix-row">
                    <div class="feature-name">${feature}</div>
                    <div class="feature-access">
                        <i class="fas ${planAccess.starter.features[feature] ? 'fa-check' : 'fa-times'} ${planAccess.starter.features[feature] ? 'access-yes' : 'access-no'}"></i>
                    </div>
                    <div class="feature-access">
                        <i class="fas ${planAccess.professional.features[feature] ? 'fa-check' : 'fa-times'} ${planAccess.professional.features[feature] ? 'access-yes' : 'access-no'}"></i>
                    </div>
                    <div class="feature-access">
                        <i class="fas ${planAccess.enterprise.features[feature] ? 'fa-check' : 'fa-times'} ${planAccess.enterprise.features[feature] ? 'access-yes' : 'access-no'}"></i>
                    </div>
                </div>
            `;
        });
        
        accessMatrix.innerHTML = matrixHTML;
    }

    // View client details
    window.viewClient = function(clientId) {
        const clients = JSON.parse(localStorage.getItem('nextgen_clients') || '[]');
        const client = clients.find(c => c.id === clientId);
        
        if (client) {
            const clientInfo = `
Client ID: ${client.id}
Name: ${client.firstName} ${client.lastName}
Email: ${client.email}
Phone: ${client.phone}
Company: ${client.company}
Plan: ${planAccess[client.plan]?.name || client.plan}
Status: ${client.status}
Newsletter: ${client.newsletter ? 'Yes' : 'No'}
Joined: ${new Date(client.createdAt).toLocaleString()}
            `;
            
            alert(`Client Details:\n\n${clientInfo}`);
        }
    };

    // Edit client
    window.editClient = function(clientId) {
        const clients = JSON.parse(localStorage.getItem('nextgen_clients') || '[]');
        const clientIndex = clients.findIndex(c => c.id === clientId);
        
        if (clientIndex !== -1) {
            const newStatus = clients[clientIndex].status === 'active' ? 'inactive' : 'active';
            clients[clientIndex].status = newStatus;
            localStorage.setItem('nextgen_clients', JSON.stringify(clients));
            loadDashboardData();
            
            alert(`Client status updated to: ${newStatus}`);
        }
    };

    // Delete client
    window.deleteClient = function(clientId) {
        if (confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
            const clients = JSON.parse(localStorage.getItem('nextgen_clients') || '[]');
            const filteredClients = clients.filter(c => c.id !== clientId);
            localStorage.setItem('nextgen_clients', JSON.stringify(filteredClients));
            loadDashboardData();
            
            alert('Client deleted successfully');
        }
    };

    // Export data
    function exportData() {
        const clients = JSON.parse(localStorage.getItem('nextgen_clients') || '[]');
        
        if (clients.length === 0) {
            alert('No data to export');
            return;
        }
        
        // Convert to CSV
        const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Plan', 'Status', 'Newsletter', 'Created At'];
        const csvContent = [
            headers.join(','),
            ...clients.map(client => [
                client.id,
                client.firstName,
                client.lastName,
                client.email,
                client.phone,
                client.company,
                client.plan,
                client.status,
                client.newsletter,
                client.createdAt
            ].join(','))
        ].join('\n');
        
        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nextgen_clients_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        console.log('📊 Data exported successfully');
    }

    // Event listeners
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            loadDashboardData();
            console.log('🔄 Dashboard refreshed');
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            exportData();
        });
    }

    // Business email functions
    function loadBusinessEmails() {
        const clients = JSON.parse(localStorage.getItem('nextgen_clients') || '[]');
        const businessEmails = clients.filter(client => client.businessEmail);
        
        if (businessEmails.length === 0) {
            businessEmailsGrid.innerHTML = `
                <div class="no-business-emails">
                    <i class="fas fa-envelope"></i>
                    <p>No business emails found. Businesses need to sign up to see their main emails here.</p>
                </div>
            `;
            return;
        }
        
        businessEmailsGrid.innerHTML = businessEmails.map(client => `
            <div class="business-email-card">
                <div class="business-email-header">
                    <div class="business-email-icon">
                        ${client.company.charAt(0).toUpperCase()}
                    </div>
                    <div class="business-email-info">
                        <h3>${client.company}</h3>
                        <p>${client.firstName} ${client.lastName}</p>
                    </div>
                </div>
                <div class="business-email-details">
                    <div class="business-email-detail">
                        <span class="business-email-detail-label">Business Email:</span>
                        <span class="business-email-detail-value">${client.businessEmail}</span>
                    </div>
                    <div class="business-email-detail">
                        <span class="business-email-detail-label">Personal Email:</span>
                        <span class="business-email-detail-value">${client.email}</span>
                    </div>
                    <div class="business-email-detail">
                        <span class="business-email-detail-label">Plan:</span>
                        <span class="business-email-detail-value">${client.plan.toUpperCase()}</span>
                    </div>
                    <div class="business-email-detail">
                        <span class="business-email-detail-label">Client ID:</span>
                        <span class="business-email-detail-value">${client.id}</span>
                    </div>
                    <div class="business-email-detail">
                        <span class="business-email-detail-label">Joined:</span>
                        <span class="business-email-detail-value">${new Date(client.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="business-email-actions">
                    <button class="business-email-action-btn primary" onclick="sendEmailToBusiness('${client.businessEmail}', '${client.company}')">
                        <i class="fas fa-envelope"></i>
                        Send Email
                    </button>
                    <button class="business-email-action-btn secondary" onclick="viewBusinessDetails('${client.id}')">
                        <i class="fas fa-eye"></i>
                        View Details
                    </button>
                </div>
            </div>
        `).join('');
    }

    function sendEmailToBusiness(email, company) {
        alert(`Email functionality would open for: ${email}\nCompany: ${company}\n\nIn a real application, this would open your email client or send an email through your system.`);
    }

    function viewBusinessDetails(clientId) {
        const clients = JSON.parse(localStorage.getItem('nextgen_clients') || '[]');
        const client = clients.find(c => c.id === clientId);
        
        if (client) {
            alert(`Business Details:\n\nCompany: ${client.company}\nBusiness Email: ${client.businessEmail}\nPersonal Email: ${client.email}\nName: ${client.firstName} ${client.lastName}\nPhone: ${client.phone}\nPlan: ${client.plan}\nClient ID: ${client.id}\nJoined: ${new Date(client.createdAt).toLocaleDateString()}`);
        }
    }

    function exportBusinessEmails() {
        const clients = JSON.parse(localStorage.getItem('nextgen_clients') || '[]');
        const businessEmails = clients.filter(client => client.businessEmail);
        
        if (businessEmails.length === 0) {
            alert('No business emails to export.');
            return;
        }
        
        const csvContent = [
            ['Company', 'Business Email', 'Personal Email', 'Contact Name', 'Plan', 'Client ID', 'Joined Date'],
            ...businessEmails.map(client => [
                client.company,
                client.businessEmail,
                client.email,
                `${client.firstName} ${client.lastName}`,
                client.plan,
                client.id,
                new Date(client.createdAt).toLocaleDateString()
            ])
        ].map(row => row.join(',')).join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `business-emails-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    // Event listeners for business emails
    if (refreshBusinessEmailsBtn) {
        refreshBusinessEmailsBtn.addEventListener('click', loadBusinessEmails);
    }

    if (exportBusinessEmailsBtn) {
        exportBusinessEmailsBtn.addEventListener('click', exportBusinessEmails);
    }

    // Initialize dashboard
    loadDashboardData();
    loadBusinessEmails();

    console.log('🚀 Dashboard functionality loaded successfully!');
    console.log('📊 Statistics tracking active');
    console.log('👥 Client management ready');
    console.log('📈 Access matrix displayed');
    console.log('💾 Data export functionality ready');
});
