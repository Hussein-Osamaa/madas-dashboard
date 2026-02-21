/**
 * Print barcode labels for selected products.
 * Extracted from dashboard inventory - includes brand name on each label.
 */
import { useState, useEffect } from 'react';
import type { ProductWithStock } from '../lib/api';

type LabelSize = '50x40' | '60x40' | '70x50' | '80x60';

type Props = {
  open: boolean;
  onClose: () => void;
  products: ProductWithStock[];
  brandName: string;
};

const LABEL_SIZES: Record<LabelSize, { width: number; height: number; name: string }> = {
  '50x40': { width: 50, height: 40, name: '50mm x 40mm' },
  '60x40': { width: 60, height: 40, name: '60mm x 40mm' },
  '70x50': { width: 70, height: 50, name: '70mm x 50mm' },
  '80x60': { width: 80, height: 60, name: '80mm x 60mm' },
};

type PrintableLabel = {
  productId: string;
  productName: string;
  barcode: string;
  size: string;
  sku?: string;
  quantity: number;
};

export default function BarcodePrintModal({ open, onClose, products, brandName }: Props) {
  const [labelSize, setLabelSize] = useState<LabelSize>('50x40');
  const [showName, setShowName] = useState(true);
  const [showSize, setShowSize] = useState(true);
  const [showSku, setShowSku] = useState(true);
  const [showBrand, setShowBrand] = useState(true);
  const [copies, setCopies] = useState(1);
  const [labels, setLabels] = useState<PrintableLabel[]>([]);

  useEffect(() => {
    const generated: PrintableLabel[] = [];
    products.forEach((product) => {
      const data = product as Record<string, unknown>;
      const stock = (data.stock as Record<string, number> | undefined) ?? {};
      const sizeBarcodes = (data.sizeBarcodes as Record<string, string> | undefined) ?? {};
      const mainBarcode = String(data.barcode ?? '').trim();

      if (Object.keys(stock).length > 0) {
        Object.entries(stock)
          .filter(([k]) => !k.includes('|'))
          .forEach(([size, qty]) => {
            const quantity = Math.max(1, Number(qty) || 1);
            const barcode = sizeBarcodes[size] || (mainBarcode ? `${mainBarcode}-${size}` : '');
            if (barcode) {
              generated.push({
                productId: product.id,
                productName: String(data.name ?? product.id),
                barcode,
                size,
                sku: data.sku ? String(data.sku) : undefined,
                quantity,
              });
            }
          });
      } else if (mainBarcode) {
        generated.push({
          productId: product.id,
          productName: String(data.name ?? product.id),
          barcode: mainBarcode,
          size: '',
          sku: data.sku ? String(data.sku) : undefined,
          quantity: 1,
        });
      }
    });
    setLabels(generated);
  }, [products]);

  const updateLabelQuantity = (index: number, quantity: number) => {
    setLabels((prev) =>
      prev.map((l, i) => (i === index ? { ...l, quantity: Math.max(1, quantity) } : l))
    );
  };

  const removeLabel = (index: number) => {
    setLabels((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print labels');
      return;
    }

    const size = LABEL_SIZES[labelSize];
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcode Labels</title>
          <style>
            @page { size: ${size.width}mm ${size.height}mm; margin: 0; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body {
              width: ${size.width}mm; height: ${size.height}mm;
              margin: 0; padding: 0;
              font-family: Arial, sans-serif;
              -webkit-print-color-adjust: exact; print-color-adjust: exact;
            }
            .label {
              width: ${size.width}mm; height: ${size.height}mm; padding: 2mm;
              display: flex; flex-direction: column; align-items: center; justify-content: center;
              page-break-after: always; page-break-inside: avoid;
              text-align: center; overflow: hidden; margin: 0;
            }
            .label:last-child { page-break-after: auto; }
            .brand-name {
              font-size: ${labelSize === '50x40' ? '9px' : '11px'};
              font-weight: 700; color: #333; margin-bottom: 1mm;
              text-transform: uppercase; letter-spacing: 0.5px;
            }
            .product-name {
              font-size: ${labelSize === '50x40' ? '10px' : '12px'};
              font-weight: 700; margin-bottom: 1mm; max-width: 100%;
              text-align: center; word-wrap: break-word; line-height: 1.2; color: #000;
            }
            .product-size {
              font-size: ${labelSize === '50x40' ? '9px' : '11px'};
              font-weight: 600; color: #000; margin-bottom: 1mm;
            }
            .barcode-container {
              display: flex; justify-content: center; align-items: center;
              width: 100%; margin: 0 auto;
            }
            .barcode-container svg {
              max-width: ${size.width - 4}mm; height: auto; display: block; margin: 0 auto;
            }
            .product-sku {
              font-size: ${labelSize === '50x40' ? '8px' : '10px'};
              font-weight: 600; color: #555; margin-top: 0.5mm;
            }
            @media print {
              @page { size: ${size.width}mm ${size.height}mm; margin: 0; }
              html, body { width: ${size.width}mm; height: ${size.height}mm; margin: 0; padding: 0; }
              .label { width: ${size.width}mm; height: ${size.height}mm; margin: 0; padding: 2mm; }
            }
          </style>
        </head>
        <body>
    `);

    let globalIndex = 0;
    labels.forEach((label, labelIndex) => {
      for (let copy = 0; copy < label.quantity * copies; copy++) {
        const uniqueId = `barcode-${labelIndex}-${copy}`;
        printWindow.document.write(`
          <div class="label">
            <div class="label-content">
              ${showBrand && brandName ? `<div class="brand-name">${brandName}</div>` : ''}
              ${showName ? `<div class="product-name">${label.productName}</div>` : ''}
              ${showSize && label.size ? `<div class="product-size">Size: ${label.size}</div>` : ''}
              <div class="barcode-container"><svg id="${uniqueId}"></svg></div>
              ${showSku && label.sku ? `<div class="product-sku">SKU: ${label.sku}</div>` : ''}
            </div>
          </div>
        `);
        globalIndex++;
      }
    });

    printWindow.document.write(`
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
        <script>
          window.onload = function() {
            const labels = ${JSON.stringify(labels)};
            const copies = ${copies};
            labels.forEach(function(label, labelIndex) {
              for (let copy = 0; copy < label.quantity * copies; copy++) {
                const uniqueId = 'barcode-' + labelIndex + '-' + copy;
                const el = document.getElementById(uniqueId);
                if (el && label.barcode) {
                  try {
                    JsBarcode(el, label.barcode, {
                      format: 'CODE128',
                      width: ${labelSize === '50x40' ? 1.2 : 1.5},
                      height: ${labelSize === '50x40' ? 25 : 35},
                      displayValue: true,
                      fontSize: ${labelSize === '50x40' ? 8 : 10},
                      margin: 0, textMargin: 1,
                    });
                  } catch (e) { console.error('Barcode error:', e); }
                }
              }
            });
            setTimeout(function() { window.print(); window.close(); }, 500);
          };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!open) return null;

  const totalLabels = labels.reduce((s, l) => s + l.quantity, 0) * copies;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-[#1a1b3e] rounded-xl border border-gray-200 dark:border-white/10 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
        <header className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Print Barcode Labels</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
          >
            <span className="text-xl leading-none">×</span>
          </button>
        </header>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Label Size</h3>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(LABEL_SIZES) as [LabelSize, (typeof LABEL_SIZES)[LabelSize]][]).map(([key, val]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLabelSize(key)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    labelSize === key
                      ? 'bg-amber-500 text-[#0a0b1a]'
                      : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
                  }`}
                >
                  {val.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Display Options</h3>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showBrand} onChange={(e) => setShowBrand(e.target.checked)} className="rounded" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Brand Name</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} className="rounded" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Product Name</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showSize} onChange={(e) => setShowSize(e.target.checked)} className="rounded" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Size</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showSku} onChange={(e) => setShowSku(e.target.checked)} className="rounded" />
                <span className="text-sm text-gray-700 dark:text-gray-300">SKU</span>
              </label>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Copies per label</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCopies((c) => Math.max(1, c - 1))}
                className="w-9 h-9 rounded-lg border border-gray-300 dark:border-white/10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                value={copies}
                onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-16 text-center rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 py-2 text-gray-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setCopies((c) => c + 1)}
                className="w-9 h-9 rounded-lg border border-gray-300 dark:border-white/10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Labels ({labels.length}) — Total: {totalLabels}
            </h3>
            {labels.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-4">No products with barcodes selected.</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {labels.map((label, i) => (
                  <div
                    key={`${label.productId}-${label.size}-${i}`}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-white/5"
                  >
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{label.productName}</span>
                      {label.size && <span className="text-xs text-gray-500 ml-2">Size: {label.size}</span>}
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 font-mono">{label.barcode}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        value={label.quantity}
                        onChange={(e) => updateLabelQuantity(i, parseInt(e.target.value, 10) || 1)}
                        className="w-14 text-center rounded border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 py-1 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeLabel(i)}
                        className="p-1 rounded text-red-500 hover:bg-red-500/10"
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <footer className="flex justify-end gap-3 border-t border-gray-200 dark:border-white/10 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={labels.length === 0}
            className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0a0b1a] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Print {totalLabels} Labels
          </button>
        </footer>
      </div>
    </div>
  );
}
