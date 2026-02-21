import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { Product } from '../../services/productsService';
import { useCurrency } from '../../hooks/useCurrency';

type LabelSize = '50x40' | '60x40' | '70x50' | '80x60';

type Props = {
  open: boolean;
  onClose: () => void;
  products: Product[];
};

// Width x Height - Width is across the roll, Height is feed direction
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
  price: number;
  sku?: string;
  quantity: number;
};

const BarcodePrintModal = ({ open, onClose, products }: Props) => {
  const { formatCurrency } = useCurrency();
  const printRef = useRef<HTMLDivElement>(null);
  const [labelSize, setLabelSize] = useState<LabelSize>('50x40');
  const [showPrice, setShowPrice] = useState(true);
  const [showName, setShowName] = useState(true);
  const [showSize, setShowSize] = useState(true);
  const [showSku, setShowSku] = useState(false);
  const [copies, setCopies] = useState(1);
  const [labels, setLabels] = useState<PrintableLabel[]>([]);

  // Generate labels from products - default quantity is product stock
  // Skip items with zero quantity
  useEffect(() => {
    const generatedLabels: PrintableLabel[] = [];
    
    products.forEach(product => {
      const stock = product.stock ?? {};
      const sizeBarcodes = product.sizeBarcodes ?? {};
      
      // If product has size variants, create a label for each
      if (Object.keys(stock).length > 0) {
        Object.entries(stock).forEach(([size, qty]) => {
          const quantity = Number(qty) || 0;
          // Skip if quantity is zero
          if (quantity <= 0) return;
          
          const barcode = sizeBarcodes[size] || (product.barcode ? `${product.barcode}-${size}` : '');
          if (barcode) {
            generatedLabels.push({
              productId: product.id,
              productName: product.name,
              barcode,
              size,
              price: product.sellingPrice || product.price,
              sku: product.sku,
              quantity: quantity
            });
          }
        });
      } else if (product.barcode) {
        // Single product without variants - use quantity or totalStock
        const productQty = Number(product.quantity || product.totalStock) || 0;
        // Skip if quantity is zero
        if (productQty <= 0) return;
        
        generatedLabels.push({
          productId: product.id,
          productName: product.name,
          barcode: product.barcode,
          size: '',
          price: product.sellingPrice || product.price,
          sku: product.sku,
          quantity: productQty
        });
      }
    });
    
    setLabels(generatedLabels);
  }, [products]);

  // Render barcodes after labels are set
  useEffect(() => {
    labels.forEach((label, index) => {
      const barcodeElement = document.getElementById(`barcode-${index}`);
      if (barcodeElement && label.barcode) {
        try {
          JsBarcode(barcodeElement, label.barcode, {
            format: 'CODE128',
            width: labelSize === '50x40' ? 1.2 : 1.5,
            height: labelSize === '50x40' ? 35 : 45,
            displayValue: true,
            fontSize: labelSize === '50x40' ? 10 : 12,
            margin: 2,
            textMargin: 2,
          });
        } catch (e) {
          console.error('Error generating barcode:', e);
        }
      }
    });
  }, [labels, labelSize]);

  const updateLabelQuantity = (index: number, quantity: number) => {
    setLabels(prev => prev.map((label, i) => 
      i === index ? { ...label, quantity: Math.max(1, quantity) } : label
    ));
  };

  const removeLabel = (index: number) => {
    setLabels(prev => prev.filter((_, i) => i !== index));
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print labels');
      return;
    }

    const size = LABEL_SIZES[labelSize];
    // Label: 50mm width x 40mm height (wider than tall)
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcode Labels</title>
          <style>
            @page {
              size: ${size.width}mm ${size.height}mm;
              margin: 0;
            }
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            html, body {
              width: ${size.width}mm;
              height: ${size.height}mm;
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            .label {
              width: ${size.width}mm;
              height: ${size.height}mm;
              padding: 2mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              page-break-after: always;
              page-break-inside: avoid;
              text-align: center;
              overflow: hidden;
              margin: 0;
            }
            
            .label:last-child {
              page-break-after: auto;
            }
            
            .label-content {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              width: 100%;
              height: 100%;
            }
            
            .product-name {
              font-size: ${labelSize === '50x40' ? '11px' : '13px'};
              font-weight: 800;
              margin-bottom: 1mm;
              max-width: 100%;
              text-align: center;
              word-wrap: break-word;
              overflow-wrap: break-word;
              white-space: normal;
              line-height: 1.2;
              color: #000;
            }
            
            .product-size {
              font-size: ${labelSize === '50x40' ? '10px' : '12px'};
              font-weight: 700;
              color: #000;
              margin-bottom: 1mm;
              text-align: center;
            }
            
            .barcode-container {
              display: flex;
              justify-content: center;
              align-items: center;
              width: 100%;
              margin: 0 auto;
            }
            
            .barcode-container svg {
              max-width: ${size.width - 4}mm;
              height: auto;
              display: block;
              margin: 0 auto;
            }
            
            .product-price {
              font-size: ${labelSize === '50x40' ? '12px' : '14px'};
              font-weight: 800;
              margin-top: 1mm;
              text-align: center;
              color: #000;
            }
            
            .product-sku {
              font-size: ${labelSize === '50x40' ? '9px' : '11px'};
              font-weight: 700;
              color: #000;
              margin-top: 0.5mm;
              text-align: center;
            }
            
            @media print {
              @page {
                size: ${size.width}mm ${size.height}mm;
                margin: 0;
              }
              
              html, body {
                width: ${size.width}mm;
                height: ${size.height}mm;
                margin: 0;
                padding: 0;
              }
              
              .label {
                width: ${size.width}mm;
                height: ${size.height}mm;
                margin: 0;
                padding: 2mm;
              }
            }
          </style>
        </head>
        <body>
    `);

    // Generate labels with copies - use unique IDs for each label
    let globalIndex = 0;
    labels.forEach((label, labelIndex) => {
      for (let copy = 0; copy < label.quantity * copies; copy++) {
        const uniqueId = `barcode-${labelIndex}-${copy}`;
        printWindow.document.write(`
          <div class="label">
            <div class="label-content">
              ${showName ? `<div class="product-name">${label.productName}</div>` : ''}
              ${showSize && label.size ? `<div class="product-size">Size: ${label.size}</div>` : ''}
              <div class="barcode-container">
                <svg id="${uniqueId}"></svg>
              </div>
              ${showPrice ? `<div class="product-price">${formatCurrency(label.price)}</div>` : ''}
              ${showSku && label.sku ? `<div class="product-sku">SKU: ${label.sku}</div>` : ''}
            </div>
          </div>
        `);
        globalIndex++;
      }
    });

    printWindow.document.write(`
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <script>
          window.onload = function() {
            const labels = ${JSON.stringify(labels)};
            const copies = ${copies};
            
            labels.forEach((label, labelIndex) => {
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
                      margin: 0,
                      textMargin: 1,
                    });
                  } catch (e) {
                    console.error('Barcode error for ' + uniqueId + ':', e);
                  }
                }
              }
            });
            
            setTimeout(function() {
              window.print();
              window.close();
            }, 500);
          };
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
  };

  if (!open) return null;

  const size = LABEL_SIZES[labelSize];
  const totalLabels = labels.reduce((sum, l) => sum + l.quantity, 0) * copies;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-primary">Print Barcode Labels</h2>
            <p className="text-sm text-madas-text/70">X-Printer 370B / Thermal Label Printer</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <span className="material-icons">close</span>
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 max-h-[calc(90vh-180px)] overflow-y-auto">
          {/* Settings Panel */}
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-madas-text mb-3">Label Size</h3>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(LABEL_SIZES) as [LabelSize, typeof LABEL_SIZES[LabelSize]][]).map(([key, value]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setLabelSize(key)}
                    className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      labelSize === key
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-madas-text border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {value.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-madas-text mb-3">Display Options</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showName}
                    onChange={(e) => setShowName(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-madas-text">Show Product Name</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSize}
                    onChange={(e) => setShowSize(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-madas-text">Show Size</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-madas-text">Show Price</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSku}
                    onChange={(e) => setShowSku(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-madas-text">Show SKU</span>
                </label>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-madas-text mb-3">Copies per Label</h3>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCopies(Math.max(1, copies - 1))}
                  className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                >
                  <span className="material-icons">remove</span>
                </button>
                <input
                  type="number"
                  min="1"
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 text-center rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setCopies(copies + 1)}
                  className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                >
                  <span className="material-icons">add</span>
                </button>
              </div>
            </div>
          </div>

          {/* Labels Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-madas-text">Labels to Print ({labels.length})</h3>
              <span className="text-xs text-madas-text/60">Total: {totalLabels} labels</span>
            </div>
            
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {labels.length === 0 ? (
                <div className="text-center py-8 text-madas-text/60">
                  <span className="material-icons text-4xl mb-2">qr_code</span>
                  <p>No products with barcodes selected</p>
                </div>
              ) : (
                labels.map((label, index) => (
                  <div
                    key={`${label.productId}-${label.size}-${index}`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-madas-text">{label.productName}</p>
                      <p className="text-xs text-madas-text/60">
                        {label.size && `Size: ${label.size} • `}
                        {label.barcode} • Qty: {label.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={label.quantity}
                        onChange={(e) => updateLabelQuantity(index, parseInt(e.target.value) || 1)}
                        className="w-16 text-center rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => removeLabel(index)}
                        className="p-1 rounded hover:bg-red-100 text-red-500"
                      >
                        <span className="material-icons text-sm">close</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Preview */}
            {labels.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-madas-text mb-2">Label Preview</h4>
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white flex items-center justify-center"
                  style={{ minHeight: '120px' }}
                >
                  <div 
                    ref={printRef}
                    className="flex flex-col items-center justify-center text-center"
                    style={{ 
                      width: `${size.width * 2}px`, 
                      height: `${size.height * 2}px`,
                      border: '1px solid #e5e7eb',
                      padding: '4px',
                      backgroundColor: 'white'
                    }}
                  >
                    {showName && (
                      <p className="text-[7px] font-bold max-w-full text-center leading-tight" style={{ wordWrap: 'break-word' }}>{labels[0]?.productName}</p>
                    )}
                    {showSize && labels[0]?.size && (
                      <p className="text-[7px] text-gray-600">Size: {labels[0]?.size}</p>
                    )}
                    <svg id="barcode-0" className="max-w-full"></svg>
                    {showPrice && (
                      <p className="text-[9px] font-bold">{formatCurrency(labels[0]?.price || 0)}</p>
                    )}
                    {showSku && labels[0]?.sku && (
                      <p className="text-[6px] text-gray-500">SKU: {labels[0]?.sku}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <footer className="flex items-center justify-between border-t border-gray-100 px-6 py-4 bg-gray-50">
          <div className="text-sm text-madas-text/70">
            <span className="material-icons text-sm align-middle mr-1">info</span>
            Make sure your X-Printer 370B is connected and set as default printer
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-200 text-madas-text hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={labels.length === 0}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-icons text-lg">print</span>
              Print {totalLabels} Labels
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default BarcodePrintModal;

