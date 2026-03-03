/**
 * Excel Import/Export for fulfillment inventory (same format as dashboard inventory).
 */
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

export interface ProductRow {
  id: string;
  name?: string;
  sku?: string;
  barcode?: string;
  warehouse?: string;
  stock?: Record<string, number>;
  sizeBarcodes?: Record<string, string>;
}

/** Flatten product for export: one row per size variant, same columns as dashboard. */
function productToRows(p: ProductRow): Array<Record<string, string | number>> {
  const stockObj = p.stock ?? {};
  const sizeBarcodes = p.sizeBarcodes ?? {};
  const name = String(p.name ?? p.id ?? '').trim();
  const sku = String(p.sku ?? '').trim();
  const mainBarcode = String(p.barcode ?? '').trim();
  const warehouse = String(p.warehouse ?? '').trim();

  if (Object.keys(stockObj).length === 0) {
    return [{
      'Product Name': name,
      'SKU': sku,
      'Main Barcode': mainBarcode,
      'Size': '',
      'Quantity': 0,
      'Size Barcode': '',
      'Warehouse': warehouse,
    }];
  }
  return Object.entries(stockObj).map(([size, qty]) => ({
    'Product Name': name,
    'SKU': sku,
    'Main Barcode': mainBarcode,
    'Size': size,
    'Quantity': qty,
    'Size Barcode': sizeBarcodes[size] ?? mainBarcode,
    'Warehouse': warehouse,
  }));
}

/**
 * Export products to Excel (same column style as dashboard inventory).
 */
export async function exportProductsToExcel(
  products: ProductRow[],
  filename?: string
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'XDIGIX Fulfillment';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Products', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  const headers = ['Product Name', 'SKU', 'Main Barcode', 'Size', 'Quantity', 'Size Barcode', 'Warehouse'];
  worksheet.columns = headers.map((h) => ({
    header: h,
    key: h,
    width: h === 'Product Name' ? 30 : h === 'Warehouse' ? 20 : 15,
  }));

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12, name: 'Calibri' };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF27491F' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.height = 25;
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF1A3A1A' } },
      bottom: { style: 'medium', color: { argb: 'FF1A3A1A' } },
      left: { style: 'medium', color: { argb: 'FF1A3A1A' } },
      right: { style: 'medium', color: { argb: 'FF1A3A1A' } },
    };
  });

  const rows = products.flatMap(productToRows);
  rows.forEach((row, index) => {
    const excelRow = worksheet.addRow(row);
    const isEven = (index + 1) % 2 === 0;
    excelRow.height = 20;
    excelRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFF8FAFB' : 'FFFFFFFF' } };
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF374151' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'hair', color: { argb: 'FFE5E7EB' } },
        right: { style: 'hair', color: { argb: 'FFE5E7EB' } },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
  });

  const date = new Date().toISOString().split('T')[0];
  const finalFilename = filename ?? `Fulfillment_Products_${date}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  link.click();
  window.URL.revokeObjectURL(url);
}

/**
 * Read Excel file and return raw rows (same as dashboard).
 */
export function importProductsFromExcel(file: File): Promise<Array<Record<string, unknown>>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array((e.target?.result as ArrayBuffer) ?? []);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet) as Array<Record<string, unknown>>;
        resolve(jsonData);
      } catch (err) {
        reject(new Error('Failed to parse Excel file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export interface ParsedFulfillmentProduct {
  name: string;
  sku?: string;
  barcode?: string;
  warehouse?: string;
  stock: Record<string, number>;
  sizeBarcodes: Record<string, string>;
}

/**
 * Parse Excel rows into product groups (same logic as dashboard parseExcelDataToProducts).
 */
export function parseExcelDataToProducts(excelData: Array<Record<string, unknown>>): ParsedFulfillmentProduct[] {
  const productGroups: Record<string, ParsedFulfillmentProduct> = {};

  const getStr = (row: Record<string, unknown>, ...keys: string[]): string => {
    for (const k of keys) {
      const v = row[k];
      if (v != null && String(v).trim() !== '') return String(v).trim();
    }
    return '';
  };
  const getNum = (row: Record<string, unknown>, ...keys: string[]): number => {
    for (const k of keys) {
      const v = row[k];
      if (v != null && v !== '') {
        const n = Number(v);
        if (!Number.isNaN(n)) return n;
      }
    }
    return 0;
  };

  for (const row of excelData) {
    const productName = getStr(row, 'Product Name', 'product_name', 'ProductName', 'Name', 'name');
    if (!productName) continue;

    const size = getStr(row, 'Size', 'size');
    const quantity = getNum(row, 'Quantity', 'quantity', 'Stock', 'stock');
    const sizeBarcode = getStr(row, 'Size Barcode', 'size_barcode', 'SizeBarcode');
    const mainBarcode = getStr(row, 'Main Barcode', 'main_barcode', 'MainBarcode', 'Barcode', 'barcode');
    const warehouse = getStr(row, 'Warehouse', 'warehouse');
    const sku = getStr(row, 'SKU', 'sku');

    if (!productGroups[productName]) {
      productGroups[productName] = {
        name: productName,
        sku: sku || undefined,
        barcode: mainBarcode || undefined,
        warehouse: warehouse || undefined,
        stock: {},
        sizeBarcodes: {},
      };
    }
    const group = productGroups[productName];
    if (size) {
      group.stock[size] = quantity;
      if (sizeBarcode) group.sizeBarcodes[size] = sizeBarcode;
    } else if (quantity > 0) {
      group.stock[''] = quantity;
    }
    if (warehouse && !group.warehouse) group.warehouse = warehouse;
    if (sku && !group.sku) group.sku = sku;
    if (mainBarcode && !group.barcode) group.barcode = mainBarcode;
  }

  return Object.values(productGroups);
}

/**
 * Download an empty template with headers (same columns as export).
 */
export async function downloadProductTemplate(): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'XDIGIX Fulfillment';
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet('Products', { views: [{ state: 'frozen', ySplit: 1 }] });
  const headers = ['Product Name', 'SKU', 'Main Barcode', 'Size', 'Quantity', 'Size Barcode', 'Warehouse'];
  worksheet.columns = headers.map((h) => ({ header: h, key: h.replace(/\s+/g, ''), width: 18 }));
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF27491F' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 25;
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'Fulfillment_Products_Template.xlsx';
  link.click();
  window.URL.revokeObjectURL(url);
}
