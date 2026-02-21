import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useBusiness } from '../../contexts/BusinessContext';
import { useProducts } from '../../hooks/useProducts';
import { useWarehouses } from '../../hooks/useWarehouses';
import FullScreenLoader from '../../components/common/FullScreenLoader';
import ProductModal, { ProductDraft } from '../../components/inventory/ProductModal';
import { Product } from '../../services/productsService';

const ProductDetailsPage = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { businessId, loading: businessLoading, businessName } = useBusiness();
  const { products, isLoading, updateProduct } = useProducts(businessId);
  const { warehouses } = useWarehouses(businessId);
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, boolean>>({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    if (productId && products.length > 0) {
      const foundProduct = products.find((p) => p.id === productId);
      setProduct(foundProduct || null);
      setSelectedImageIndex(0); // Reset to first image when product changes
    }
  }, [productId, products]);

  const handleEditSubmit = async (payload: ProductDraft) => {
    if (!product?.id) return;
    setIsSubmitting(true);
    try {
      await updateProduct(product.id, payload);
      // Update local product state with new data
      setProduct({ ...product, ...payload, id: product.id });
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating product:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintThermalBarcode = (size?: string) => {
    if (!product) return;
    
    const barcode = size 
      ? (product.sizeBarcodes?.[size] || product.barcode || product.sku || '')
      : (product.barcode || product.sku || '');
    
    if (!barcode || barcode === 'N/A') {
      alert('No barcode available for this product.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print barcodes.');
      return;
    }

    const productName = product.name || 'Product';
    const productPrice = product.sellingPrice || product.price || 0;
    const brandName = businessName || '';

    // Thermal label: 50mm x 30mm (approximately 189 x 113 pixels at 96dpi)
    const thermalHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Thermal Barcode - ${barcode}</title>
          <meta charset="UTF-8">
          <style>
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            
            @page {
              margin: 0;
              size: 50mm 30mm;
            }
            
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              .no-print {
                display: none !important;
              }
            }
            
            body {
              font-family: Arial, sans-serif;
              background: #f5f5f5;
              padding: 20px;
            }
            
            .print-actions {
              position: fixed;
              top: 20px;
              right: 20px;
              z-index: 1000;
              display: flex;
              gap: 10px;
            }
            
            .print-btn {
              padding: 10px 20px;
              background: #27491F;
              color: white;
              border: none;
              border-radius: 4px;
              font-size: 14px;
              cursor: pointer;
            }
            
            .print-btn:hover {
              background: #1f3c19;
            }
            
            .print-btn.secondary {
              background: #666;
            }
            
            .preview-container {
              max-width: 400px;
              margin: 60px auto 20px;
            }
            
            .preview-title {
              text-align: center;
              margin-bottom: 15px;
              font-size: 14px;
              color: #666;
            }
            
            .thermal-label {
              width: 50mm;
              height: 30mm;
              background: white;
              border: 1px solid #000;
              margin: 0 auto;
              padding: 2mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              align-items: center;
              overflow: hidden;
            }
            
            .label-brand {
              font-size: 6pt;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #333;
            }
            
            .label-name {
              font-size: 6pt;
              font-weight: normal;
              text-align: center;
              color: #000;
              max-width: 100%;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            
            .barcode-svg {
              width: 100%;
              max-height: 12mm;
            }
            
            .barcode-svg svg {
              width: 100% !important;
              height: auto !important;
              max-height: 12mm;
            }
            
            .label-code {
              font-size: 7pt;
              font-family: 'Courier New', monospace;
              font-weight: bold;
              color: #000;
            }
            
            .label-price {
              font-size: 8pt;
              font-weight: bold;
              color: #000;
            }
            
            .label-size {
              font-size: 6pt;
              color: #333;
            }
          </style>
        </head>
        <body>
          <div class="print-actions no-print">
            <button class="print-btn" onclick="window.print()">Print Thermal</button>
            <button class="print-btn secondary" onclick="window.close()">Close</button>
          </div>
          
          <div class="preview-container no-print">
            <div class="preview-title">Thermal Label Preview (50mm × 30mm)</div>
          </div>
          
          <div class="thermal-label">
            ${brandName ? `<div class="label-brand">${brandName}</div>` : ''}
            <div class="label-name">${productName}</div>
            <svg id="barcode" class="barcode-svg"></svg>
            <div class="label-code">${barcode}</div>
            <div class="label-price">$${productPrice.toFixed(2)}</div>
            ${size ? `<div class="label-size">Size: ${size}</div>` : ''}
          </div>
          
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
          <script>
            (function() {
              function generateBarcode() {
                if (typeof JsBarcode === 'undefined') {
                  setTimeout(generateBarcode, 100);
                  return;
                }
                
                const svgElement = document.getElementById('barcode');
                if (svgElement) {
                  try {
                    JsBarcode(svgElement, '${barcode}', {
                      format: "CODE128",
                      displayValue: false,
                      lineColor: "#000000",
                      width: 1.5,
                      height: 35,
                      margin: 2,
                      background: "#FFFFFF"
                    });
                  } catch (error) {
                    console.error('Barcode generation error:', error);
                  }
                }
              }
              
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', generateBarcode);
              } else {
                setTimeout(generateBarcode, 100);
              }
            })();
          <\/script>
        </body>
      </html>
    `;

    printWindow.document.write(thermalHTML);
    printWindow.document.close();
    printWindow.focus();
  };

  if (businessLoading || isLoading) {
    return <FullScreenLoader message="Loading product details..." />;
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <span className="material-icons text-6xl text-madas-text/30">inventory_2</span>
          <h2 className="text-2xl font-semibold text-primary">Product Not Found</h2>
          <p className="text-madas-text/70">The product you're looking for doesn't exist or has been deleted.</p>
          <button
            type="button"
            onClick={() => navigate('/inventory/products')}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-[#1f3c19] transition-colors"
          >
            <span className="material-icons text-base">arrow_back</span>
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  const stock = product.stock ?? {};
  const sizeBarcodes = product.sizeBarcodes ?? {};
  const stockEntries = Object.entries(stock);
  const totalStock = stockEntries.reduce((acc, [, qty]) => acc + qty, 0);
  const lowStockThreshold = product.lowStockAlert ?? 10;

  const toggleSizeSelection = (size: string) => {
    setSelectedSizes((prev) => ({
      ...prev,
      [size]: !prev[size]
    }));
  };

  const handleSelectAllSizes = (checked: boolean) => {
    const newSelection: Record<string, boolean> = {};
    stockEntries.forEach(([size]) => {
      newSelection[size] = checked;
    });
    setSelectedSizes(newSelection);
  };

  const selectedSizesCount = Object.values(selectedSizes).filter(Boolean).length;
  const allSizesSelected = stockEntries.length > 0 && selectedSizesCount === stockEntries.length;

  const handlePrintSelectedBarcodes = () => {
    const sizesToPrint = stockEntries.filter(([size]) => selectedSizes[size]);
    
    if (sizesToPrint.length === 0) {
      alert('Please select at least one size to print barcodes.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print barcodes.');
      return;
    }

    const barcodeItems = sizesToPrint.map(([size]) => {
      const barcode = sizeBarcodes[size] || product.barcode || product.sku || '';
      return { product, barcode, size };
    }).filter(item => item.barcode && item.barcode !== 'N/A');

    if (barcodeItems.length === 0) {
      alert('No barcodes found for selected sizes.');
      return;
    }

    const brandName = businessName || '';

    const barcodeHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Product Barcodes</title>
          <meta charset="UTF-8">
          <style>
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            
            @page {
              margin: 0.5cm;
              size: A4;
            }
            
            @media print {
              body {
                margin: 0;
                padding: 0;
                background: white;
              }
              
              .no-print {
                display: none !important;
              }
              
              .barcode-container {
                gap: 15px;
                padding: 0;
              }
              
              .barcode-label {
                border: 1px solid #000;
                padding: 15px;
              }
            }
            
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              background: #fff;
            }
            
            .print-header {
              text-align: center;
              margin-bottom: 20px;
              padding: 10px;
            }
            
            .print-header h1 {
              font-size: 20px;
              font-weight: bold;
              color: #000;
              margin-bottom: 5px;
            }
            
            .print-header p {
              font-size: 12px;
              color: #666;
            }
            
            .barcode-container {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
            }
            
            .barcode-label {
              border: 1px solid #000;
              background: white;
              padding: 15px;
              text-align: center;
              page-break-inside: avoid;
              min-height: 200px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              align-items: center;
            }
            
            .barcode-number-top {
              font-size: 11px;
              color: #333;
              margin-bottom: 8px;
              font-weight: normal;
              font-family: Arial, sans-serif;
            }
            
            .barcode-svg {
              margin: 10px 0;
              max-width: 100%;
              height: auto;
              display: block;
            }
            
            .barcode-svg svg {
              width: 100% !important;
              height: auto !important;
            }
            
            .barcode-number-bottom {
              font-size: 14px;
              font-weight: bold;
              color: #000;
              margin-top: 8px;
              margin-bottom: 10px;
              font-family: Arial, sans-serif;
            }
            
            .product-info {
              width: 100%;
              margin-top: 10px;
              padding-top: 10px;
              border-top: 1px solid #ddd;
            }
            
            .product-brand {
              font-size: 11px;
              font-weight: 600;
              color: #333;
              margin-bottom: 4px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            .product-name {
              font-size: 12px;
              font-weight: normal;
              color: #000;
              margin-bottom: 4px;
              line-height: 1.3;
            }
            
            .product-size {
              font-size: 11px;
              color: #666;
              margin-top: 4px;
            }
            
            .product-sku {
              font-size: 10px;
              color: #999;
              margin-top: 4px;
              font-family: Arial, sans-serif;
            }
            
            .print-actions {
              position: fixed;
              top: 20px;
              right: 20px;
              z-index: 1000;
              display: flex;
              gap: 10px;
            }
            
            .print-btn {
              padding: 10px 20px;
              background: #27491F;
              color: white;
              border: none;
              border-radius: 4px;
              font-size: 14px;
              font-weight: normal;
              cursor: pointer;
            }
            
            .print-btn:hover {
              background: #1f3c19;
            }
            
            .print-btn.secondary {
              background: #666;
            }
            
            .print-btn.secondary:hover {
              background: #555;
            }
            
            @media print {
              .print-actions {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-header no-print">
            <h1>Product Barcodes</h1>
            <p>${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} • ${barcodeItems.length} label${barcodeItems.length !== 1 ? 's' : ''}</p>
          </div>
          
          <div class="print-actions no-print">
            <button class="print-btn" onclick="window.print()">Print</button>
            <button class="print-btn secondary" onclick="window.close()">Close</button>
          </div>
          
          <div class="barcode-container">
            ${barcodeItems.map((item, index) => {
              const { product, barcode, size } = item;
              const barcodeId = `barcode-${index}`;
              const productName = product.name || 'Product';
              const productSku = product.sku || '';
              
              return `
                <div class="barcode-label">
                  <div class="barcode-number-top">${barcode}</div>
                  <svg id="${barcodeId}" class="barcode-svg"></svg>
                  <div class="barcode-number-bottom">${barcode}</div>
                  <div class="product-info">
                    ${brandName ? `<div class="product-brand">${brandName}</div>` : ''}
                    <div class="product-name">${productName}</div>
                    ${size ? `<div class="product-size">Size: ${size}</div>` : ''}
                    ${productSku ? `<div class="product-sku">SKU: ${productSku}</div>` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <script>
            (function() {
              const barcodeItems = ${JSON.stringify(barcodeItems)};
              
              function generateBarcodes() {
                if (typeof JsBarcode === 'undefined') {
                  setTimeout(generateBarcodes, 100);
                  return;
                }
                
                barcodeItems.forEach((item, index) => {
                  const barcodeId = 'barcode-' + index;
                  const svgElement = document.getElementById(barcodeId);
                  
                  if (svgElement) {
                    try {
                      JsBarcode(svgElement, item.barcode, {
                        format: "CODE128",
                        displayValue: false,
                        fontSize: 0,
                        font: "Arial",
                        textAlign: "center",
                        textPosition: "bottom",
                        textMargin: 0,
                        lineColor: "#000000",
                        width: 2.2,
                        height: 75,
                        margin: 8,
                        background: "#FFFFFF",
                        valid: function(valid) {
                          if (!valid) {
                            console.warn('Barcode validation failed for:', item.barcode);
                          }
                        }
                      });
                    } catch (error) {
                      console.error('Barcode generation error:', error);
                    }
                  }
                });
              }
              
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', generateBarcodes);
              } else {
                setTimeout(generateBarcodes, 100);
              }
            })();
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(barcodeHTML);
    printWindow.document.close();
    printWindow.focus();
  };

  const status = (() => {
    if (totalStock <= 0) return { label: 'Out of Stock', className: 'bg-red-100 text-red-600' };
    if (totalStock <= lowStockThreshold) return { label: 'Low Stock', className: 'bg-orange-100 text-orange-600' };
    return { label: 'In Stock', className: 'bg-green-100 text-green-600' };
  })();

  return (
    <div className="space-y-6 px-6 py-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/inventory/products')}
            className="rounded-lg border border-gray-200 p-2 text-madas-text hover:bg-base transition-colors"
          >
            <span className="material-icons">arrow_back</span>
          </button>
          <div>
            <h1 className="text-3xl font-semibold text-primary">{product.name || 'Unnamed Product'}</h1>
            <p className="text-sm text-madas-text/70">Product Details</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={clsx('inline-flex items-center gap-2 rounded-full px-4 py-2 font-medium', status.className)}>
            <span className="material-icons text-sm">circle</span>
            {status.label}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Images */}
          <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-primary mb-4">
              Product Images
              {product.images && product.images.length > 0 && (
                <span className="ml-2 text-sm font-normal text-madas-text/70">
                  ({product.images.length} {product.images.length === 1 ? 'image' : 'images'})
                </span>
              )}
            </h2>
            
            {product.images && product.images.length > 0 ? (
              <div className="space-y-4">
                {/* Main Image Display */}
                <div className="relative w-full h-80 rounded-lg bg-base overflow-hidden">
                  <img
                    src={product.images[selectedImageIndex]}
                    alt={`${product.name || 'Product'} - Image ${selectedImageIndex + 1}`}
                    className="w-full h-full object-contain"
                  />
                  
                  {/* Navigation Arrows (if multiple images) */}
                  {product.images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setSelectedImageIndex((prev) => 
                          prev === 0 ? product.images!.length - 1 : prev - 1
                        )}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-md transition-colors"
                      >
                        <span className="material-icons text-primary">chevron_left</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedImageIndex((prev) => 
                          prev === product.images!.length - 1 ? 0 : prev + 1
                        )}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-md transition-colors"
                      >
                        <span className="material-icons text-primary">chevron_right</span>
                      </button>
                    </>
                  )}
                  
                  {/* Image Counter */}
                  {product.images.length > 1 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                      {selectedImageIndex + 1} / {product.images.length}
                    </div>
                  )}
                </div>
                
                {/* Thumbnails (if multiple images) */}
                {product.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {product.images.map((image, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setSelectedImageIndex(index)}
                        className={clsx(
                          'flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all',
                          selectedImageIndex === index
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'border-gray-200 hover:border-primary/50'
                        )}
                      >
                        <img
                          src={image}
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-64 rounded-lg bg-base flex flex-col items-center justify-center gap-2">
              <span className="material-icons text-6xl text-madas-text/30">image</span>
                <p className="text-sm text-madas-text/50">No images uploaded</p>
            </div>
            )}
          </section>

          {/* Product Information */}
          <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-primary mb-4">Product Information</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-madas-text/70 mb-1">Product Name</label>
                <p className="text-base text-madas-text">{product.name || 'N/A'}</p>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-madas-text/70 mb-1">Description</label>
                <p className="text-base text-madas-text">{product.description || 'No description available'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-madas-text/70 mb-1">Price</label>
                <p className="text-base font-semibold text-primary">${product.price?.toFixed(2) || '0.00'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-madas-text/70 mb-1">SKU</label>
                <p className="text-base text-madas-text font-mono">{product.sku || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-madas-text/70 mb-1">Barcode</label>
                <p className="text-base text-madas-text font-mono">{product.barcode || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-madas-text/70 mb-1">Low Stock Alert</label>
                <p className="text-base text-madas-text">{product.lowStockAlert || 10} units</p>
              </div>
            </div>
          </section>

          {/* Size Variants & Stock */}
          {stockEntries.length > 0 && (
            <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-primary">Size Variants & Stock</h2>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-accent bg-white checked:bg-primary checked:border-primary"
                      checked={allSizesSelected}
                      ref={(input) => {
                        if (input) {
                          input.indeterminate = selectedSizesCount > 0 && selectedSizesCount < stockEntries.length;
                        }
                      }}
                      onChange={(e) => handleSelectAllSizes(e.target.checked)}
                    />
                    <span className="text-sm text-madas-text/70">
                      {selectedSizesCount > 0 ? `${selectedSizesCount} selected` : 'Select all'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handlePrintSelectedBarcodes}
                    disabled={selectedSizesCount === 0}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-madas-text/70 hover:bg-base transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span className="material-icons text-sm">print</span>
                    Print Barcodes
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-accent bg-white checked:bg-primary checked:border-primary"
                          checked={allSizesSelected}
                          ref={(input) => {
                            if (input) {
                              input.indeterminate = selectedSizesCount > 0 && selectedSizesCount < stockEntries.length;
                            }
                          }}
                          onChange={(e) => handleSelectAllSizes(e.target.checked)}
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Size
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Barcode
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stockEntries.map(([size, quantity]) => {
                      const sizeBarcode = sizeBarcodes[size] || product.barcode || 'N/A';
                      const isLowStock = quantity <= lowStockThreshold;
                      const isOutOfStock = quantity === 0;
                      const isSelected = selectedSizes[size];
                      return (
                        <tr key={size} className={clsx('hover:bg-gray-50', isSelected && 'bg-blue-50')}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-accent bg-white checked:bg-primary checked:border-primary"
                              checked={isSelected}
                              onChange={() => toggleSizeSelection(size)}
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-madas-text">
                            {size}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={clsx(
                                'text-sm font-medium',
                                isOutOfStock && 'text-red-600',
                                !isOutOfStock && isLowStock && 'text-orange-600',
                                !isOutOfStock && !isLowStock && 'text-green-600'
                              )}
                            >
                              {quantity}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-madas-text/70">
                            {sizeBarcode}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={clsx(
                                'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
                                isOutOfStock && 'bg-red-100 text-red-600',
                                !isOutOfStock && isLowStock && 'bg-orange-100 text-orange-600',
                                !isOutOfStock && !isLowStock && 'bg-green-100 text-green-600'
                              )}
                            >
                              {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handlePrintThermalBarcode(size)}
                              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-madas-text/70 hover:bg-base transition-colors"
                              title="Print Thermal Label"
                            >
                              <span className="material-icons text-sm">receipt_long</span>
                              Thermal
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td className="px-4 py-3 text-sm font-semibold text-madas-text" colSpan={2}>Total</td>
                      <td className="px-4 py-3 text-sm font-semibold text-primary">{totalStock}</td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-primary mb-4">Quick Stats</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-madas-text/70 mb-1">Total Stock</label>
                <p className="text-2xl font-semibold text-primary">{totalStock}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-madas-text/70 mb-1">Size Variants</label>
                <p className="text-2xl font-semibold text-primary">{stockEntries.length}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-madas-text/70 mb-1">Stock Value</label>
                <p className="text-2xl font-semibold text-primary">
                  ${((product.price || 0) * totalStock).toFixed(2)}
                </p>
              </div>
            </div>
          </section>

          {/* Actions */}
          <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-primary mb-4">Actions</h2>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1f3c19] transition-colors"
              >
                <span className="material-icons text-base">edit</span>
                Edit Product
              </button>
              <button
                type="button"
                onClick={() => handlePrintThermalBarcode()}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-primary px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
              >
                <span className="material-icons text-base">receipt_long</span>
                Print Thermal Label
              </button>
              <button
                type="button"
                onClick={() => navigate('/inventory/products')}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-madas-text hover:bg-base transition-colors"
              >
                <span className="material-icons text-base">arrow_back</span>
                Back to Products
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Edit Product Modal */}
      <ProductModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleEditSubmit}
        initialValue={product}
        submitting={isSubmitting}
        warehouses={warehouses}
      />
    </div>
  );
};

export default ProductDetailsPage;

