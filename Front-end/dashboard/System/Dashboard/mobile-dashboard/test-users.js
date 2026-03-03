// Test Users Setup for MADAS Mobile Dashboard
console.log('🧪 Test users setup loaded');

// Test Users Data
const testUsers = [
    {
        id: 'test_user_001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@test.com',
        password: 'test123',
        phone: '+1234567890',
        company: 'Test Company',
        businessEmail: 'business@testcompany.com',
        plan: 'professional',
        status: 'active',
        createdAt: new Date().toISOString(),
        newsletter: true,
        terms: true
    },
    {
        id: 'test_user_002',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@test.com',
        password: 'test123',
        phone: '+1234567891',
        company: 'Demo Business',
        businessEmail: 'contact@demobusiness.com',
        plan: 'enterprise',
        status: 'active',
        createdAt: new Date().toISOString(),
        newsletter: false,
        terms: true
    },
    {
        id: 'test_user_003',
        firstName: 'Mike',
        lastName: 'Johnson',
        email: 'mike.johnson@test.com',
        password: 'test123',
        phone: '+1234567892',
        company: 'Sample Corp',
        businessEmail: 'info@samplecorp.com',
        plan: 'starter',
        status: 'active',
        createdAt: new Date().toISOString(),
        newsletter: true,
        terms: true
    }
];

// Test Business Data
const testBusinessData = [
    {
        businessId: 'business_001',
        name: 'Test Company',
        email: 'business@testcompany.com',
        plan: 'professional',
        status: 'active',
        createdAt: new Date().toISOString(),
        users: ['test_user_001']
    },
    {
        businessId: 'business_002',
        name: 'Demo Business',
        email: 'contact@demobusiness.com',
        plan: 'enterprise',
        status: 'active',
        createdAt: new Date().toISOString(),
        users: ['test_user_002']
    },
    {
        businessId: 'business_003',
        name: 'Sample Corp',
        email: 'info@samplecorp.com',
        plan: 'starter',
        status: 'active',
        createdAt: new Date().toISOString(),
        users: ['test_user_003']
    }
];

// Test Orders Data
const testOrders = [
    {
        id: 'order_001',
        customerName: 'Alice Johnson',
        customerEmail: 'alice@example.com',
        total: 299.99,
        status: 'completed',
        date: new Date().toISOString(),
        items: [
            { name: 'Product A', quantity: 2, price: 99.99 },
            { name: 'Product B', quantity: 1, price: 100.01 }
        ]
    },
    {
        id: 'order_002',
        customerName: 'Bob Wilson',
        customerEmail: 'bob@example.com',
        total: 149.50,
        status: 'pending',
        date: new Date(Date.now() - 86400000).toISOString(),
        items: [
            { name: 'Product C', quantity: 1, price: 149.50 }
        ]
    }
];

// Test Customers Data
const testCustomers = [
    {
        id: 'customer_001',
        name: 'Alice Johnson',
        email: 'alice@example.com',
        phone: '+1234567893',
        totalOrders: 5,
        totalSpent: 1299.99,
        lastOrder: new Date().toISOString(),
        status: 'active'
    },
    {
        id: 'customer_002',
        name: 'Bob Wilson',
        email: 'bob@example.com',
        phone: '+1234567894',
        totalOrders: 2,
        totalSpent: 299.50,
        lastOrder: new Date(Date.now() - 86400000).toISOString(),
        status: 'active'
    }
];

// Test Products Data
const testProducts = [
    {
        id: 'product_001',
        name: 'Product A',
        price: 99.99,
        stock: 50,
        category: 'Electronics',
        status: 'active',
        createdAt: new Date().toISOString()
    },
    {
        id: 'product_002',
        name: 'Product B',
        price: 100.01,
        stock: 25,
        category: 'Accessories',
        status: 'active',
        createdAt: new Date().toISOString()
    },
    {
        id: 'product_003',
        name: 'Product C',
        price: 149.50,
        stock: 10,
        category: 'Electronics',
        status: 'active',
        createdAt: new Date().toISOString()
    }
];

// Setup Test Data
function setupTestData() {
    console.log('🔧 Setting up test data...');
    
    // Store test users
    localStorage.setItem('nextgen_clients', JSON.stringify(testUsers));
    console.log('✅ Test users created');
    
    // Store business data
    localStorage.setItem('business_data', JSON.stringify(testBusinessData));
    console.log('✅ Test business data created');
    
    // Store orders
    localStorage.setItem('orders', JSON.stringify(testOrders));
    console.log('✅ Test orders created');
    
    // Store customers
    localStorage.setItem('customers', JSON.stringify(testCustomers));
    console.log('✅ Test customers created');
    
    // Store products
    localStorage.setItem('products', JSON.stringify(testProducts));
    console.log('✅ Test products created');
    
    // Set dashboard stats
    localStorage.setItem('total_orders', testOrders.length.toString());
    localStorage.setItem('total_customers', testCustomers.length.toString());
    localStorage.setItem('total_products', testProducts.length.toString());
    
    console.log('🎉 Test data setup complete!');
}

// Create Test User Session
function createTestUserSession(userId) {
    const user = testUsers.find(u => u.id === userId);
    if (!user) {
        console.error('❌ Test user not found:', userId);
        return false;
    }
    
    const sessionData = {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        company: user.company,
        plan: user.plan,
        isAuthenticated: true,
        loginTime: new Date().toISOString()
    };
    
    localStorage.setItem('currentUser', JSON.stringify(sessionData));
    console.log('✅ Test user session created for:', user.email);
    return true;
}

// Get Test User Credentials
function getTestCredentials() {
    return testUsers.map(user => ({
        email: user.email,
        password: user.password,
        name: `${user.firstName} ${user.lastName}`,
        company: user.company,
        plan: user.plan
    }));
}

// Display Test Credentials
function displayTestCredentials() {
    console.log('🧪 Test User Credentials:');
    console.log('========================');
    
    testUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.firstName} ${user.lastName}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Password: ${user.password}`);
        console.log(`   Company: ${user.company}`);
        console.log(`   Plan: ${user.plan}`);
        console.log('');
    });
    
    console.log('📱 Mobile Dashboard Access:');
    console.log('==========================');
    console.log('URL: http://192.168.70.107:3001');
    console.log('');
    console.log('🔑 Quick Login:');
    console.log('1. Email: john.doe@test.com');
    console.log('2. Password: test123');
    console.log('');
}

// Auto-setup test data when script loads
document.addEventListener('DOMContentLoaded', function() {
    setupTestData();
    displayTestCredentials();
    
    // Make functions available globally
    window.setupTestData = setupTestData;
    window.createTestUserSession = createTestUserSession;
    window.getTestCredentials = getTestCredentials;
    window.displayTestCredentials = displayTestCredentials;
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        testUsers,
        testBusinessData,
        testOrders,
        testCustomers,
        testProducts,
        setupTestData,
        createTestUserSession,
        getTestCredentials,
        displayTestCredentials
    };
}
