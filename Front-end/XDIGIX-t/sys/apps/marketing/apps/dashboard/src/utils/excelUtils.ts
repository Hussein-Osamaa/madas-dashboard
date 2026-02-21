/**
 * Excel Import/Export Utilities
 */

import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { Product } from '../services/productsService';
/**
 * Fetch image as base64 for Excel embedding
 */
async function fetchImageAsBase64(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('[excelUtils] Failed to fetch image:', error);
    return null;
  }
}

/**
 * Export products to Excel WITH IMAGES
 */
export async function exportProductsWithImagesToExcel(products: Product[], filename?: string): Promise<void> {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MADAS';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet('Products', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    // Column width in Excel units - 1 unit ≈ 7 pixels
    const IMAGE_COL_WIDTH = 30; // ~210 pixels for much bigger images
    const ROW_HEIGHT = 180; // pixels - much bigger rows for larger images
    
    worksheet.columns = [
      { header: 'Product Image', key: 'productImage', width: IMAGE_COL_WIDTH },
      { header: 'Product Name', key: 'productNameText', width: 40 },
      { header: 'Size', key: 'size', width: 14 },
      { header: 'Quantity', key: 'quantity', width: 14 },
      { header: 'SKU', key: 'sku', width: 20 },
      { header: 'Main Barcode', key: 'mainBarcode', width: 20 },
      { header: 'Size Barcode', key: 'sizeBarcode', width: 20 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF27491F' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    headerRow.height = 30;
    
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF1A3A1A' } },
        bottom: { style: 'medium', color: { argb: 'FF1A3A1A' } },
        left: { style: 'medium', color: { argb: 'FF1A3A1A' } },
        right: { style: 'medium', color: { argb: 'FF1A3A1A' } }
      };
    });

    let rowIndex = 2;
    
    for (const product of products) {
      const stockObj = product.stock ?? {};
      const sizeBarcodes = product.sizeBarcodes ?? {};
      const productImage = product.images?.[0] || '';
      
      // Get all sizes/variants for this product
      const sizes = Object.keys(stockObj).length > 0 ? Object.keys(stockObj) : [''];
      const startRow = rowIndex;
      
      // Add image to workbook once per product (will reuse for each variant row)
      let imageId: number | null = null;
      if (productImage) {
        const base64Image = await fetchImageAsBase64(productImage);
        if (base64Image) {
          try {
            imageId = workbook.addImage({ base64: base64Image, extension: 'png' });
          } catch (e) {
            console.error('[excelUtils] Failed to add image:', e);
          }
        }
      }
      
      // Add rows for each variant - each row gets its own image
      for (let i = 0; i < sizes.length; i++) {
        const size = sizes[i];
        const row = worksheet.addRow({
          productImage: '',
          productNameText: product.name || '',
          size: size || '',
          quantity: stockObj[size] || 0,
          sku: product.sku || '',
          mainBarcode: product.barcode || '',
          sizeBarcode: sizeBarcodes[size] || product.barcode || ''
        });

        row.height = ROW_HEIGHT;

        // Style each cell
        row.eachCell((cell, colNumber) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
          cell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF1F2937' } };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
          };
          cell.alignment = { vertical: 'middle', horizontal: colNumber === 2 ? 'left' : 'center' };
        });

        // Add image anchored to this cell
        if (imageId !== null) {
          const imageCell = worksheet.getCell(rowIndex, 1);
          imageCell.alignment = { vertical: 'middle', horizontal: 'center' };
          
          // Calculate image size to fit within cell (square image)
          const imgSize = ROW_HEIGHT - 10; // Leave 10px padding
          
          // Position image with small offset from top-left of cell
          worksheet.addImage(imageId, {
            tl: { col: 0.05, row: rowIndex - 1 + 0.03 },
            ext: { width: imgSize, height: imgSize }
          });
        }

        rowIndex++;
      }
      
      const endRow = rowIndex - 1;
      
      // Add a separator border at the bottom of each product group
      const lastRowCells = worksheet.getRow(endRow);
      lastRowCells.eachCell((cell) => {
        cell.border = {
          ...cell.border,
          bottom: { style: 'medium', color: { argb: 'FFD1D5DB' } }
        };
      });
    }

    const date = new Date().toISOString().split('T')[0];
    const finalFilename = filename || `MADAS_Products_With_Images_${date}.xlsx`;
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    link.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('[excelUtils] Export with images failed:', error);
    throw new Error('Failed to export products with images to Excel');
  }
}

/**
 * Export products to Excel file with professional styling using ExcelJS
 */
export async function exportProductsToExcel(products: Product[], filename?: string): Promise<void> {
  try {
    // Create workbook with ExcelJS
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MADAS';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet('Products', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    // Define headers
    const headers = [
      'Product Name',
      'Category',
      'Description',
      'Cost Price',
      'Selling Price',
      'SKU',
      'Main Barcode',
      'Size',
      'Quantity',
      'Size Barcode',
      'Low Stock Alert',
      'Status',
      'Storage',
      'Created Date'
    ];

    // Set column widths
    worksheet.columns = [
      { header: 'Product Name', key: 'productName', width: 30 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Cost Price', key: 'costPrice', width: 12 },
      { header: 'Selling Price', key: 'sellingPrice', width: 12 },
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Main Barcode', key: 'mainBarcode', width: 15 },
      { header: 'Size', key: 'size', width: 10 },
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Size Barcode', key: 'sizeBarcode', width: 15 },
      { header: 'Low Stock Alert', key: 'lowStockAlert', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Storage', key: 'storage', width: 15 },
      { header: 'Created Date', key: 'createdDate', width: 12 }
    ];

    // Style header row - MADAS green theme
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12, name: 'Calibri' };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF27491F' } // MADAS green
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    headerRow.height = 25;
    
    // Add borders to header
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF1A3A1A' } },
        bottom: { style: 'medium', color: { argb: 'FF1A3A1A' } },
        left: { style: 'medium', color: { argb: 'FF1A3A1A' } },
        right: { style: 'medium', color: { argb: 'FF1A3A1A' } }
      };
    });

    // Prepare and add data rows
    const excelData = products.flatMap((product) => {
      const stockObj = product.stock ?? {};
      const sizeBarcodes = product.sizeBarcodes ?? {};
      
      if (Object.keys(stockObj).length === 0) {
        return [{
          productName: product.name || '',
          category: product.category || '',
          description: product.description || '',
          costPrice: product.price || 0,
          sellingPrice: product.sellingPrice || product.price || 0,
          sku: product.sku || '',
          mainBarcode: product.barcode || '',
          size: '',
          quantity: 0,
          sizeBarcode: '',
          lowStockAlert: product.lowStockAlert || 10,
          status: product.status || 'active',
          storage: product.storageLocation || '',
          createdDate: product.createdAt 
            ? (typeof product.createdAt === 'string' 
                ? new Date(product.createdAt).toLocaleDateString()
                : product.createdAt instanceof Date
                ? product.createdAt.toLocaleDateString()
                : typeof product.createdAt === 'object' && 'toDate' in product.createdAt && typeof product.createdAt.toDate === 'function'
                ? product.createdAt.toDate().toLocaleDateString()
                : '')
            : ''
        }];
      } else {
        return Object.entries(stockObj).map(([size, stock]) => ({
          productName: product.name || '',
          category: product.category || '',
          description: product.description || '',
          costPrice: product.price || 0,
          sellingPrice: product.sellingPrice || product.price || 0,
          sku: product.sku || '',
          mainBarcode: product.barcode || '',
          size: size,
          quantity: stock,
          sizeBarcode: sizeBarcodes[size] || product.barcode || '',
          lowStockAlert: product.lowStockAlert || 10,
          status: product.status || 'active',
          storage: product.storageLocation || '',
          createdDate: product.createdAt 
            ? (typeof product.createdAt === 'string' 
                ? new Date(product.createdAt).toLocaleDateString()
                : product.createdAt instanceof Date
                ? product.createdAt.toLocaleDateString()
                : typeof product.createdAt === 'object' && 'toDate' in product.createdAt && typeof product.createdAt.toDate === 'function'
                ? product.createdAt.toDate().toLocaleDateString()
                : '')
            : ''
        }));
      }
    });

    // Add data rows with styling
    excelData.forEach((row, index) => {
      const excelRow = worksheet.addRow(row);
      const isEvenRow = (index + 1) % 2 === 0;
      const backgroundColor = isEvenRow ? 'FFF8FAFB' : 'FFFFFFFF';
      
      excelRow.height = 20;
      
      excelRow.eachCell((cell, colNumber) => {
        const colName = headers[colNumber - 1];
        const cellValue = cell.value;
        
        // Base styling
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: backgroundColor }
        };
        cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF374151' } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'hair', color: { argb: 'FFE5E7EB' } },
          right: { style: 'hair', color: { argb: 'FFE5E7EB' } }
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: (colName === 'Product Name' || colName === 'Description') ? 'left' : 'center',
          wrapText: colName === 'Description'
        };

        // Special formatting for Price columns
        if (colName === 'Cost Price' || colName === 'Selling Price') {
          cell.font = { bold: true, color: { argb: 'FF047857' }, name: 'Calibri', size: 10 };
          cell.numFmt = '$#,##0.00';
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        }

        // Special formatting for Status column
        if (colName === 'Status') {
          const status = String(cellValue || '').toLowerCase();
          if (status === 'active') {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri', size: 10 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          } else if (status === 'inactive') {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri', size: 10 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }
        }

        // Special formatting for Quantity column
        if (colName === 'Quantity') {
          const quantity = Number(cellValue) || 0;
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          if (quantity === 0) {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri', size: 10 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } };
          } else if (quantity < 10) {
            cell.font = { color: { argb: 'FFF59E0B' }, name: 'Calibri', size: 10 };
          }
        }
      });
    });

    // Generate filename
    const date = new Date().toISOString().split('T')[0];
    const finalFilename = filename || `MADAS_Products_${date}.xlsx`;
    
    // Download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    link.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('[excelUtils] Export failed:', error);
    throw new Error('Failed to export products to Excel');
  }
}

/**
 * Read Excel file and parse products
 */
export async function importProductsFromExcel(file: File): Promise<Array<Record<string, any>>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet) as Array<Record<string, any>>;
        
        resolve(jsonData);
      } catch (error) {
        console.error('[excelUtils] Import failed:', error);
        reject(new Error('Failed to parse Excel file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse Excel data to product format
 * Supports both export formats (with and without images)
 */
export function parseExcelDataToProducts(excelData: Array<Record<string, any>>): Array<Partial<Product>> {
  const products: Array<Partial<Product>> = [];
  const productGroups: Record<string, any> = {};

  console.log('[excelUtils] Parsing', excelData.length, 'rows');
  console.log('[excelUtils] Available columns:', excelData.length > 0 ? Object.keys(excelData[0]) : 'none');

  excelData.forEach((row, index) => {
    // Support multiple column name formats - check all possible variations
    const productName = (
      row['Product Name'] || 
      row['product_name'] || 
      row['ProductName'] ||
      row['Name'] || 
      row['name'] ||
      row['PRODUCT NAME'] ||
      row['NAME'] ||
      ''
    ).toString().trim();
    
    if (!productName) {
      console.log('[excelUtils] Skipping row', index, '- no product name found');
      return; // Skip empty rows
    }

    const size = (
      row['Size'] || 
      row['size'] || 
      row['SIZE'] ||
      ''
    ).toString().trim();
    
    // Support both "Quantity" (export format) and "Stock" (import format)
    const stockValue = row['Quantity'] ?? row['quantity'] ?? row['QUANTITY'] ?? 
                       row['Stock'] ?? row['stock'] ?? row['STOCK'] ?? 0;
    const stock = parseInt(String(stockValue)) || 0;
    
    const sizeBarcode = (
      row['Size Barcode'] || 
      row['size_barcode'] || 
      row['SizeBarcode'] ||
      row['SIZE BARCODE'] ||
      ''
    ).toString().trim();

    if (!productGroups[productName]) {
      // Support both "Cost Price" (export format) and "Price" (import format)
      const costPriceValue = row['Cost Price'] ?? row['cost_price'] ?? row['CostPrice'] ?? 
                            row['Price'] ?? row['price'] ?? row['PRICE'] ?? 
                            row['COST PRICE'] ?? 0;
      const costPrice = parseFloat(String(costPriceValue)) || 0;
      
      const sellingPriceValue = row['Selling Price'] ?? row['selling_price'] ?? row['SellingPrice'] ??
                               row['SELLING PRICE'] ?? costPriceValue ?? 0;
      const sellingPrice = parseFloat(String(sellingPriceValue)) || costPrice;

      // Initialize product
      productGroups[productName] = {
        name: productName,
        description: (row['Description'] || row['description'] || row['DESCRIPTION'] || '').toString().trim(),
        category: (row['Category'] || row['category'] || row['CATEGORY'] || '').toString().trim(),
        price: costPrice,
        sellingPrice: sellingPrice,
        sku: (row['SKU'] || row['sku'] || '').toString().trim(),
        barcode: (
          row['Main Barcode'] || 
          row['main_barcode'] || 
          row['MainBarcode'] ||
          row['Barcode'] || 
          row['barcode'] || 
          row['MAIN BARCODE'] ||
          row['BARCODE'] ||
          ''
        ).toString().trim(),
        lowStockAlert: parseInt(row['Low Stock Alert'] || row['low_stock_alert'] || row['LowStockAlert'] || '10') || 10,
        status: (row['Status'] || row['status'] || row['STATUS'] || 'active').toString().trim().toLowerCase() || 'active',
        storageLocation: (
          row['Storage Location'] || 
          row['storage_location'] || 
          row['Storage'] || 
          row['storage'] || 
          row['STORAGE'] ||
          ''
        ).toString().trim(),
        stock: {},
        sizeBarcodes: {}
      };
      
      console.log('[excelUtils] Created product group:', productName);
    }

    // Add size variant if size exists
    if (size) {
      productGroups[productName].stock = productGroups[productName].stock || {};
      productGroups[productName].sizeBarcodes = productGroups[productName].sizeBarcodes || {};
      productGroups[productName].stock[size] = stock;
      if (sizeBarcode) {
        productGroups[productName].sizeBarcodes[size] = sizeBarcode;
      }
      console.log('[excelUtils] Added size variant:', productName, size, stock);
    } else if (stock > 0) {
      // No size, use default stock
      productGroups[productName].stock = productGroups[productName].stock || {};
      productGroups[productName].stock['default'] = stock;
      console.log('[excelUtils] Added default stock:', productName, stock);
    }
  });

  // Convert groups to products array
  Object.values(productGroups).forEach((product) => {
    products.push(product);
  });

  console.log('[excelUtils] Parsed', products.length, 'products');
  return products;
}

// ============================================
// EXPENSES EXCEL FUNCTIONS
// ============================================

export type ExpenseExport = {
  id: string;
  amount: number;
  category: string;
  vendorName?: string;
  description?: string;
  status?: string;
  createdAt: Date;
  currency?: string;
  tax?: number;
};

/**
 * Export expenses to Excel file with professional styling
 */
export async function exportExpensesToExcel(
  expenses: ExpenseExport[],
  currency: string,
  filename?: string
): Promise<void> {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MADAS Finance';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Expenses', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    // Set column widths
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Vendor', key: 'vendor', width: 25 },
      { header: 'Category', key: 'category', width: 18 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Tax', key: 'tax', width: 12 },
      { header: 'Total', key: 'total', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Currency', key: 'currency', width: 10 }
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF27491F' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF1A3A1A' } },
        bottom: { style: 'medium', color: { argb: 'FF1A3A1A' } },
        left: { style: 'medium', color: { argb: 'FF1A3A1A' } },
        right: { style: 'medium', color: { argb: 'FF1A3A1A' } }
      };
    });

    // Add data rows
    expenses.forEach((expense, index) => {
      const tax = expense.tax || 0;
      const total = expense.amount + tax;
      const row = worksheet.addRow({
        date: expense.createdAt instanceof Date 
          ? expense.createdAt.toLocaleDateString() 
          : new Date(expense.createdAt).toLocaleDateString(),
        vendor: expense.vendorName || '—',
        category: expense.category || '—',
        description: expense.description || '—',
        amount: expense.amount,
        tax: tax,
        total: total,
        status: expense.status || 'pending',
        currency: expense.currency || currency
      });

      const isEvenRow = (index + 1) % 2 === 0;
      const bgColor = isEvenRow ? 'FFF8FAFB' : 'FFFFFFFF';

      row.height = 22;
      row.eachCell((cell, colNumber) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bgColor }
        };
        cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF374151' } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'hair', color: { argb: 'FFE5E7EB' } },
          right: { style: 'hair', color: { argb: 'FFE5E7EB' } }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };

        // Amount columns formatting
        if (colNumber === 5 || colNumber === 6 || colNumber === 7) {
          cell.numFmt = '#,##0.00';
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
          if (colNumber === 7) {
            cell.font = { bold: true, color: { argb: 'FF047857' }, name: 'Calibri', size: 10 };
          }
        }

        // Status column styling
        if (colNumber === 8) {
          const status = String(cell.value || '').toLowerCase();
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          if (status === 'approved') {
            cell.font = { bold: true, color: { argb: 'FF047857' }, name: 'Calibri', size: 10 };
          } else if (status === 'pending') {
            cell.font = { bold: true, color: { argb: 'FFD97706' }, name: 'Calibri', size: 10 };
          } else if (status === 'rejected') {
            cell.font = { bold: true, color: { argb: 'FFDC2626' }, name: 'Calibri', size: 10 };
          }
        }
      });
    });

    // Add summary row
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalTax = expenses.reduce((sum, e) => sum + (e.tax || 0), 0);
    const grandTotal = totalAmount + totalTax;

    worksheet.addRow({});
    const summaryRow = worksheet.addRow({
      date: 'TOTAL',
      vendor: '',
      category: '',
      description: `${expenses.length} expenses`,
      amount: totalAmount,
      tax: totalTax,
      total: grandTotal,
      status: '',
      currency: currency
    });

    summaryRow.font = { bold: true, color: { argb: 'FF27491F' }, size: 11 };
    summaryRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8F5E9' }
    };
    summaryRow.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF27491F' } },
        bottom: { style: 'medium', color: { argb: 'FF27491F' } }
      };
      if (colNumber === 5 || colNumber === 6 || colNumber === 7) {
        cell.numFmt = '#,##0.00';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      }
    });

    // Generate filename
    const date = new Date().toISOString().split('T')[0];
    const finalFilename = filename || `Expenses_${date}.xlsx`;

    // Download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    link.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('[excelUtils] Export expenses failed:', error);
    throw new Error('Failed to export expenses to Excel');
  }
}

/**
 * Import expenses from Excel file
 */
export async function importExpensesFromExcel(file: File): Promise<Array<Record<string, any>>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet) as Array<Record<string, any>>;

        resolve(jsonData);
      } catch (error) {
        console.error('[excelUtils] Import expenses failed:', error);
        reject(new Error('Failed to parse Excel file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse Excel data to expense format for import
 */
export function parseExcelDataToExpenses(excelData: Array<Record<string, any>>): Array<{
  amount: number;
  category: string;
  vendorName?: string;
  description?: string;
  tax?: number;
  status?: string;
  createdAt: Date;
  currency?: string;
}> {
  const expenses: Array<{
    amount: number;
    category: string;
    vendorName?: string;
    description?: string;
    tax?: number;
    status?: string;
    createdAt: Date;
    currency?: string;
  }> = [];

  excelData.forEach((row) => {
    // Parse amount (required)
    const amount = parseFloat(
      row['Amount'] || row['amount'] || row['Total'] || row['total'] || '0'
    );
    if (amount <= 0) return; // Skip rows without valid amount

    // Parse date
    let createdAt = new Date();
    const dateValue = row['Date'] || row['date'] || row['Created At'] || row['createdAt'];
    if (dateValue) {
      if (dateValue instanceof Date) {
        createdAt = dateValue;
      } else if (typeof dateValue === 'string') {
        const parsed = new Date(dateValue);
        if (!isNaN(parsed.getTime())) {
          createdAt = parsed;
        }
      } else if (typeof dateValue === 'number') {
        // Excel serial date number
        createdAt = new Date((dateValue - 25569) * 86400 * 1000);
      }
    }

    expenses.push({
      amount,
      category: (row['Category'] || row['category'] || 'General').toString().trim(),
      vendorName: (row['Vendor'] || row['vendor'] || row['Vendor Name'] || row['vendorName'] || '').toString().trim() || undefined,
      description: (row['Description'] || row['description'] || '').toString().trim() || undefined,
      tax: parseFloat(row['Tax'] || row['tax'] || '0') || undefined,
      status: (row['Status'] || row['status'] || 'pending').toString().trim().toLowerCase(),
      createdAt,
      currency: (row['Currency'] || row['currency'] || '').toString().trim() || undefined
    });
  });

  return expenses;
}

/**
 * Generate expense import template
 */
export async function downloadExpenseTemplate(): Promise<void> {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MADAS Finance';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Expenses Template', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    worksheet.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Vendor', key: 'vendor', width: 25 },
      { header: 'Category', key: 'category', width: 18 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Tax', key: 'tax', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Currency', key: 'currency', width: 10 }
    ];

    // Style header
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF27491F' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    // Add example rows
    const examples = [
      { date: new Date().toLocaleDateString(), vendor: 'Office Supplies Co', category: 'Office', description: 'Printer paper and ink', amount: 150.00, tax: 15.00, status: 'approved', currency: 'EGP' },
      { date: new Date().toLocaleDateString(), vendor: 'Tech Store', category: 'Equipment', description: 'Computer mouse', amount: 45.00, tax: 4.50, status: 'pending', currency: 'EGP' }
    ];

    examples.forEach((example) => {
      const row = worksheet.addRow(example);
      row.font = { color: { argb: 'FF9CA3AF' }, italic: true };
    });

    // Add instructions sheet
    const instructionsSheet = workbook.addWorksheet('Instructions');
    instructionsSheet.getColumn(1).width = 80;
    
    const instructions = [
      ['EXPENSE IMPORT INSTRUCTIONS'],
      [''],
      ['Required Columns:'],
      ['- Date: Date of the expense (e.g., 01/15/2024 or 2024-01-15)'],
      ['- Amount: Expense amount (numeric value)'],
      ['- Category: Category name (e.g., Office, Equipment, Marketing)'],
      [''],
      ['Optional Columns:'],
      ['- Vendor: Vendor/supplier name'],
      ['- Description: Details about the expense'],
      ['- Tax: Tax amount (numeric value)'],
      ['- Status: approved, pending, or rejected'],
      ['- Currency: Currency code (e.g., EGP, USD)'],
      [''],
      ['Notes:'],
      ['- Delete the example rows before importing your data'],
      ['- Make sure dates are in a recognizable format'],
      ['- Amount must be a positive number'],
      ['- Empty rows will be skipped']
    ];

    instructions.forEach((instruction, index) => {
      const row = instructionsSheet.addRow([instruction[0]]);
      if (index === 0) {
        row.font = { bold: true, size: 14, color: { argb: 'FF27491F' } };
      }
    });

    // Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Expense_Import_Template.xlsx';
    link.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('[excelUtils] Template download failed:', error);
    throw new Error('Failed to download template');
  }
}
