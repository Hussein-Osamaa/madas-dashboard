/**
 * CSV Processor for Customer Data Import
 * Handles the specific CSV format from Excel exports
 */

class CSVProcessor {
    constructor() {
        this.columnMapping = {
            'Name': 'name',
            'Email': 'email',
            'Phone Number': 'phone',
            'Signup Date': 'signupDate',
            '# of Orders': 'orderCount',
            'Active Orders': 'activeOrders',
            'Canceled Orders': 'canceledOrders',
            'Total Amount Spent': 'totalSpent',
            'Amount Pending Payment': 'pendingAmount',
            'Average Order Value': 'avgOrderValue',
            'Last Order': 'lastOrder',
            'Address Line 1': 'address1',
            'Address Line 2': 'address2',
            'City': 'city',
            'Region': 'region',
            'District': 'district',
            'Country': 'country',
            'Postal Code': 'postalCode',
            'Address Clarification': 'addressClarification',
            'Lat': 'latitude',
            'Lng': 'longitude',
            'Apartment': 'apartment',
            'Floor': 'floor',
            'Building': 'building'
        };
    }

    /**
     * Parse CSV content and extract customer data
     * @param {string} csvContent - The CSV content
     * @returns {Array} Array of customer objects
     */
    parseCSV(csvContent) {
        const lines = csvContent.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
            throw new Error('CSV file must have at least a header row and one data row');
        }

        // Parse headers
        const headers = this.parseCSVLine(lines[0]);
        console.log('Found headers:', headers);

        // Parse data rows
        const customers = [];
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            
            // Skip completely empty rows
            if (values.every(val => val.trim() === '')) {
                continue;
            }

            const customer = {};
            headers.forEach((header, index) => {
                const value = values[index] || '';
                if (value.trim() !== '') {
                    const mappedField = this.columnMapping[header];
                    if (mappedField) {
                        customer[mappedField] = this.cleanValue(value.trim(), mappedField);
                    }
                }
            });

            // Only add customer if it has essential data
            if (customer.name || customer.email) {
                customers.push(customer);
            }
        }

        return customers;
    }

    /**
     * Parse a single CSV line, handling quoted fields
     * @param {string} line - CSV line
     * @returns {Array} Array of field values
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    // Escaped quote
                    current += '"';
                    i++; // Skip next quote
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // End of field
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        // Add the last field
        result.push(current);
        
        return result;
    }

    /**
     * Clean and format values based on field type
     * @param {string} value - Raw value from CSV
     * @param {string} field - Field name
     * @returns {any} Cleaned value
     */
    cleanValue(value, field) {
        switch (field) {
            case 'orderCount':
            case 'activeOrders':
            case 'canceledOrders':
                return parseInt(value) || 0;
            
            case 'totalSpent':
            case 'pendingAmount':
            case 'avgOrderValue':
                return parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;
            
            case 'latitude':
            case 'longitude':
                return parseFloat(value) || null;
            
            case 'signupDate':
            case 'lastOrder':
                return this.parseDate(value);
            
            default:
                return value;
        }
    }

    /**
     * Parse date string to ISO format
     * @param {string} dateStr - Date string
     * @returns {string|null} ISO date string or null
     */
    parseDate(dateStr) {
        if (!dateStr || dateStr.trim() === '') return null;
        
        try {
            const date = new Date(dateStr);
            return isNaN(date.getTime()) ? null : date.toISOString();
        } catch (error) {
            console.warn('Could not parse date:', dateStr);
            return null;
        }
    }

    /**
     * Convert customer data to dashboard format
     * @param {Array} customers - Array of customer objects
     * @returns {Array} Array of customers in dashboard format
     */
    convertToDashboardFormat(customers) {
        return customers.map(customer => {
            return {
                name: customer.name || '',
                email: customer.email || '',
                phone: customer.phone || '',
                status: this.determineStatus(customer),
                totalSpent: customer.totalSpent || 0,
                orderCount: customer.orderCount || 0,
                activeOrders: customer.activeOrders || 0,
                canceledOrders: customer.canceledOrders || 0,
                pendingAmount: customer.pendingAmount || 0,
                avgOrderValue: customer.avgOrderValue || 0,
                signupDate: customer.signupDate,
                lastOrder: customer.lastOrder,
                address: this.buildAddress(customer),
                latitude: customer.latitude,
                longitude: customer.longitude,
                createdAt: customer.signupDate || new Date().toISOString(),
                lastOrder: customer.lastOrder || null
            };
        });
    }

    /**
     * Determine customer status based on data
     * @param {Object} customer - Customer object
     * @returns {string} Customer status
     */
    determineStatus(customer) {
        if (customer.orderCount > 10 && customer.totalSpent > 1000) {
            return 'vip';
        } else if (customer.orderCount > 0) {
            return 'active';
        } else {
            return 'inactive';
        }
    }

    /**
     * Build address string from customer data
     * @param {Object} customer - Customer object
     * @returns {string} Formatted address
     */
    buildAddress(customer) {
        const addressParts = [
            customer.address1,
            customer.address2,
            customer.city,
            customer.region,
            customer.district,
            customer.country,
            customer.postalCode
        ].filter(part => part && part.trim() !== '');
        
        return addressParts.join(', ');
    }

    /**
     * Generate sample customer data for testing
     * @param {number} count - Number of sample customers to generate
     * @returns {Array} Array of sample customer objects
     */
    generateSampleData(count = 10) {
        const sampleCustomers = [];
        const names = ['John Smith', 'Sarah Johnson', 'Mike Davis', 'Lisa Wilson', 'David Brown', 'Emma Taylor', 'Chris Anderson', 'Maria Garcia', 'James Miller', 'Jennifer Lee'];
        const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'];
        const countries = ['United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France', 'Japan', 'Brazil', 'India', 'Mexico'];
        
        for (let i = 0; i < count; i++) {
            const name = names[i % names.length];
            const email = name.toLowerCase().replace(' ', '.') + (i + 1) + '@example.com';
            const phone = `+1-555-${String(Math.floor(Math.random() * 9000) + 1000)}`;
            const orderCount = Math.floor(Math.random() * 20) + 1;
            const totalSpent = Math.floor(Math.random() * 5000) + 100;
            const signupDate = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString();
            
            sampleCustomers.push({
                name: name,
                email: email,
                phone: phone,
                status: orderCount > 10 ? 'vip' : orderCount > 0 ? 'active' : 'inactive',
                totalSpent: totalSpent,
                orderCount: orderCount,
                activeOrders: Math.floor(Math.random() * 3),
                canceledOrders: Math.floor(Math.random() * 2),
                pendingAmount: Math.floor(Math.random() * 500),
                avgOrderValue: Math.floor(totalSpent / orderCount),
                signupDate: signupDate,
                lastOrder: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : null,
                address: `${Math.floor(Math.random() * 9999) + 1} Main St, ${cities[i % cities.length]}, ${countries[i % countries.length]}`,
                latitude: (Math.random() * 180 - 90).toFixed(6),
                longitude: (Math.random() * 360 - 180).toFixed(6),
                createdAt: signupDate
            });
        }
        
        return sampleCustomers;
    }

    /**
     * Convert customers to CSV format
     * @param {Array} customers - Array of customer objects
     * @returns {string} CSV content
     */
    customersToCSV(customers) {
        if (customers.length === 0) {
            return 'name,email,phone,status,totalSpent,orderCount\n';
        }

        const headers = ['name', 'email', 'phone', 'status', 'totalSpent', 'orderCount', 'activeOrders', 'canceledOrders', 'pendingAmount', 'avgOrderValue', 'signupDate', 'lastOrder', 'address'];
        
        const csvRows = customers.map(customer => {
            return headers.map(header => {
                const value = customer[header] || '';
                const stringValue = String(value);
                if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                    return `"${stringValue.replace(/"/g, '""')}"`;
                }
                return stringValue;
            }).join(',');
        });

        return [headers.join(','), ...csvRows].join('\n');
    }
}

// Make processor available globally
window.CSVProcessor = CSVProcessor;
