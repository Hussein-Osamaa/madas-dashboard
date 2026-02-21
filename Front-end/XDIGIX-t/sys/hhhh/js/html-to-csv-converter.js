/**
 * HTML to CSV Converter for Customer Data
 * Converts Excel-exported HTML files to CSV format for dashboard import
 */

class HTMLToCSVConverter {
  constructor() {
    this.columnMapping = {
      Name: "name",
      Email: "email",
      "Phone Number": "phone",
      "Signup Date": "signupDate",
      "# of Orders": "orderCount",
      "Total Amount Spent": "totalSpent",
      "Active Orders": "activeOrders",
      "Canceled Orders": "canceledOrders",
      "Amount Pending Payment": "pendingAmount",
      "Average Order Value": "avgOrderValue",
      "Last Order": "lastOrder",
      "Address Line 1": "address1",
      "Address Line 2": "address2",
      City: "city",
      Region: "region",
      District: "district",
      Country: "country",
      "Postal Code": "postalCode",
      "Address Clarification": "addressClarification",
      Lat: "latitude",
      Lng: "longitude",
      Apartment: "apartment",
      Floor: "floor",
      Building: "building",
    };
  }

  /**
   * Parse HTML table and extract customer data
   * @param {string} htmlContent - The HTML content of the exported file
   * @returns {Array} Array of customer objects
   */
  parseHTMLTable(htmlContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");
    const table = doc.querySelector("table");

    if (!table) {
      throw new Error("No table found in HTML content");
    }

    const rows = table.querySelectorAll("tr");
    if (rows.length < 2) {
      throw new Error("No data rows found in table");
    }

    // Get headers from first row
    const headerRow = rows[0];
    const headers = Array.from(headerRow.querySelectorAll("td")).map((td) =>
      td.textContent.trim().replace(/\s+/g, " ")
    );

    console.log("Found headers:", headers);

    // Extract data rows
    const customers = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const cells = Array.from(row.querySelectorAll("td"));

      // Skip empty rows
      if (
        cells.every(
          (cell) =>
            cell.textContent.trim() === "" ||
            cell.textContent.trim() === "&nbsp;"
        )
      ) {
        continue;
      }

      const customer = {};
      cells.forEach((cell, index) => {
        const header = headers[index];
        const value = cell.textContent.trim();

        if (header && value && value !== "&nbsp;") {
          const mappedField = this.columnMapping[header];
          if (mappedField) {
            customer[mappedField] = this.cleanValue(value, mappedField);
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
   * Clean and format values based on field type
   * @param {string} value - Raw value from HTML
   * @param {string} field - Field name
   * @returns {any} Cleaned value
   */
  cleanValue(value, field) {
    switch (field) {
      case "orderCount":
      case "activeOrders":
      case "canceledOrders":
        return parseInt(value) || 0;

      case "totalSpent":
      case "pendingAmount":
      case "avgOrderValue":
        return parseFloat(value.replace(/[^0-9.-]/g, "")) || 0;

      case "latitude":
      case "longitude":
        return parseFloat(value) || null;

      case "signupDate":
      case "lastOrder":
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
    if (!dateStr || dateStr.trim() === "") return null;

    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date.toISOString();
    } catch (error) {
      console.warn("Could not parse date:", dateStr);
      return null;
    }
  }

  /**
   * Convert customer data to CSV format
   * @param {Array} customers - Array of customer objects
   * @returns {string} CSV content
   */
  toCSV(customers) {
    if (customers.length === 0) {
      return "name,email,phone,status,totalSpent,orderCount\n";
    }

    // Get all unique keys from all customers
    const allKeys = [
      ...new Set(customers.flatMap((customer) => Object.keys(customer))),
    ];

    // Create CSV header
    const csvHeader = allKeys.join(",");

    // Create CSV rows
    const csvRows = customers.map((customer) => {
      return allKeys
        .map((key) => {
          const value = customer[key];
          if (value === null || value === undefined) return "";

          // Escape commas and quotes in CSV
          const stringValue = String(value);
          if (
            stringValue.includes(",") ||
            stringValue.includes('"') ||
            stringValue.includes("\n")
          ) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(",");
    });

    return [csvHeader, ...csvRows].join("\n");
  }

  /**
   * Process HTML file and return CSV content
   * @param {string} htmlContent - HTML content
   * @returns {string} CSV content
   */
  convert(htmlContent) {
    try {
      const customers = this.parseHTMLTable(htmlContent);
      console.log(`Parsed ${customers.length} customers from HTML`);
      return this.toCSV(customers);
    } catch (error) {
      console.error("Error converting HTML to CSV:", error);
      throw error;
    }
  }

  /**
   * Download CSV file
   * @param {string} csvContent - CSV content
   * @param {string} filename - Filename for download
   */
  downloadCSV(csvContent, filename = "converted_customers.csv") {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}

// Make converter available globally
window.HTMLToCSVConverter = HTMLToCSVConverter;
