import { useMemo, useState } from 'react';
import { useProducts } from '../../hooks/useProducts';
import { useBusiness } from '../../contexts/BusinessContext';
import { Product } from '../../services/productsService';
import POSProductGrid from '../../components/pos/POSProductGrid';
import POSCart from '../../components/pos/POSCart';
import PaymentModal from '../../components/pos/PaymentModal';
import POSBarcodeScanner from '../../components/pos/POSBarcodeScanner';
import ReceiptModal from '../../components/pos/ReceiptModal';
import { useOrders } from '../../hooks/useOrders';
import { useWarehouses } from '../../hooks/useWarehouses';

export type CartItem = {
  product: Product;
  quantity: number;
  size?: string;
  price: number;
};

const POSPage = () => {
  const { businessId, businessName, plan } = useBusiness();
  const { products, isLoading, updateProduct } = useProducts(businessId ?? '');
  const { createOrder } = useOrders(businessId ?? '');
  const { warehouses } = useWarehouses(businessId ?? '');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{ name: string; contact?: string; email?: string } | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [lastOrder, setLastOrder] = useState<{
    orderNumber: string;
    cart: CartItem[];
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    paymentMethod: string;
    date: Date;
  } | null>(null);

  // Get tax rate from plan or default to 0
  const taxRate = useMemo(() => {
    const planData = plan as { taxRate?: number } | undefined;
    return (planData?.taxRate ?? 0) / 100; // Convert percentage to decimal
  }, [plan]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchQuery.trim()) return products;

    const query = searchQuery.toLowerCase();
    return products.filter(
      (product) =>
        product.name?.toLowerCase().includes(query) ||
        product.sku?.toLowerCase().includes(query) ||
        product.barcode?.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const cartItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const getAvailableStock = (product: Product, size?: string, locationId?: string) => {
    if (locationId && product.stockByLocation) {
      // Multi-location stock
      const locationStock = product.stockByLocation[locationId] ?? 0;
      if (size) {
        // For size-specific, we need to check if the location has that size
        // For now, return location stock as total
        return locationStock;
      }
      return locationStock;
    }
    // Regular stock
    const stock = product.stock ?? {};
    return size ? stock[size] ?? 0 : Object.values(stock).reduce((sum, qty) => sum + qty, 0);
  };

  const handleAddToCart = (product: Product, size?: string) => {
    const availableStock = getAvailableStock(product, size, selectedLocation || undefined);

    if (availableStock <= 0) {
      alert('Product is out of stock');
      return;
    }

    const price = product.price ?? 0;
    const existingItemIndex = cart.findIndex(
      (item) => item.product.id === product.id && item.size === size
    );

    if (existingItemIndex >= 0) {
      const existingItem = cart[existingItemIndex];
      if (existingItem.quantity >= availableStock) {
        alert('Not enough stock available');
        return;
      }
      setCart((prev) =>
        prev.map((item, idx) =>
          idx === existingItemIndex ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCart((prev) => [...prev, { product, quantity: 1, size, price }]);
    }
  };

  const handleBarcodeScan = (barcode: string) => {
    const product = products?.find(
      (p) =>
        p.barcode?.toLowerCase() === barcode.toLowerCase() ||
        Object.values(p.sizeBarcodes ?? {}).some((bc) => bc?.toLowerCase() === barcode.toLowerCase())
    );

    if (!product) {
      alert(`Product with barcode "${barcode}" not found`);
      return;
    }

    // Find the size if barcode matches a size barcode
    let size: string | undefined;
    if (product.sizeBarcodes) {
      const matchedSize = Object.entries(product.sizeBarcodes).find(
        ([, bc]) => bc?.toLowerCase() === barcode.toLowerCase()
      );
      if (matchedSize) {
        size = matchedSize[0];
      }
    }

    handleAddToCart(product, size);
  };

  const handleUpdateQuantity = (index: number, delta: number) => {
    setCart((prev) => {
      const item = prev[index];
      const newQuantity = item.quantity + delta;
      if (newQuantity <= 0) {
        return prev.filter((_, idx) => idx !== index);
      }

      const availableStock = getAvailableStock(item.product, item.size, selectedLocation || undefined);

      if (newQuantity > availableStock) {
        alert('Not enough stock available');
        return prev;
      }

      return prev.map((cartItem, idx) =>
        idx === index ? { ...cartItem, quantity: newQuantity } : cartItem
      );
    });
  };

  const handleRemoveFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (confirm('Clear the entire cart?')) {
      setCart([]);
      setSelectedCustomer(null);
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }
    setShowPaymentModal(true);
  };

  const handlePaymentComplete = async (paymentData: {
    method: string;
    amount: number;
    discount?: number;
    tax?: number;
    notes?: string;
  }) => {
    try {
      const subtotal = cartTotal;
      const calculatedTax = paymentData.tax ?? subtotal * taxRate;
      const discountAmount = paymentData.discount ?? 0;
      const total = paymentData.amount;

      const productCount = cartItemCount;
      const orderNumber = `POS-${Date.now().toString(36).toUpperCase()}`;

      await createOrder({
        customerName: selectedCustomer?.name ?? 'Walk-in Customer',
        customerContact: selectedCustomer?.contact,
        customerEmail: selectedCustomer?.email,
        status: 'completed',
        productCount,
        total,
        notes: paymentData.notes,
        paymentStatus: paymentData.method,
        channel: 'pos'
      });

      // Update product stock (multi-location aware)
      for (const item of cart) {
        const product = products?.find((p) => p.id === item.product.id);
        if (!product) continue;

        if (selectedLocation && product.stockByLocation) {
          // Update location-specific stock
          const currentLocationStock = product.stockByLocation[selectedLocation] ?? 0;
          const newLocationStock = Math.max(0, currentLocationStock - item.quantity);
          await updateProduct({
            productId: product.id,
            payload: {
              stockByLocation: {
                ...product.stockByLocation,
                [selectedLocation]: newLocationStock
              }
            }
          });
        } else {
          // Update regular stock
          const currentStock = product.stock ?? {};
          if (item.size) {
            // Update specific size stock
            const currentQty = currentStock[item.size] ?? 0;
            const newQty = Math.max(0, currentQty - item.quantity);
            await updateProduct({
              productId: product.id,
              payload: {
                stock: {
                  ...currentStock,
                  [item.size]: newQty
                }
              }
            });
          } else {
            // Update total stock (distribute across sizes if available)
            const sizes = Object.keys(currentStock);
            if (sizes.length > 0) {
              // Distribute quantity reduction across sizes
              const updatedStock = { ...currentStock };
              let remaining = item.quantity;
              for (const size of sizes) {
                if (remaining <= 0) break;
                const currentQty = updatedStock[size] ?? 0;
                const reduction = Math.min(remaining, currentQty);
                updatedStock[size] = Math.max(0, currentQty - reduction);
                remaining -= reduction;
              }
              await updateProduct({
                productId: product.id,
                payload: { stock: updatedStock }
              });
            }
          }
        }
      }

      // Store order data for receipt
      setLastOrder({
        orderNumber,
        cart: [...cart],
        subtotal,
        tax: calculatedTax,
        discount: discountAmount,
        total,
        paymentMethod: paymentData.method,
        date: new Date()
      });

      setShowPaymentModal(false);
      setShowReceipt(true);
    } catch (error) {
      console.error('Failed to complete order:', error);
      alert('Failed to complete order. Please try again.');
    }
  };

  const handleReceiptClose = () => {
    setShowReceipt(false);
    setCart([]);
    setSelectedCustomer(null);
    setLastOrder(null);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-base">
      {/* Product Grid Section */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold text-primary mb-2">Point of Sale</h1>
          <p className="text-sm text-madas-text/70">Select products to add to cart</p>
        </header>

        {/* Search Bar and Actions */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <span className="material-icons text-madas-text/60">search</span>
            <input
              type="search"
              placeholder="Search products by name, SKU, or barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-madas-text focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 rounded-full hover:bg-base transition-colors"
              >
                <span className="material-icons text-sm text-madas-text/60">close</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowBarcodeScanner(true)}
              className="p-2 rounded-lg border border-gray-200 hover:bg-base transition-colors"
              title="Scan barcode"
            >
              <span className="material-icons text-primary">qr_code_scanner</span>
            </button>
          </div>

          {/* Location Selector */}
          {warehouses.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-sm">
              <span className="material-icons text-madas-text/60">warehouse</span>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="flex-1 bg-transparent text-sm text-madas-text focus:outline-none"
              >
                <option value="">All Locations</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name} {warehouse.code && `(${warehouse.code})`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Product Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <span className="material-icons animate-spin text-primary text-4xl">progress_activity</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="material-icons text-6xl text-madas-text/30 mb-4">inventory_2</span>
            <p className="text-lg font-medium text-madas-text/70 mb-2">
              {searchQuery ? 'No products found' : 'No products available'}
            </p>
            <p className="text-sm text-madas-text/60">
              {searchQuery ? 'Try a different search term' : 'Add products in the inventory section'}
            </p>
          </div>
        ) : (
          <POSProductGrid products={filteredProducts} onAddToCart={handleAddToCart} />
        )}
      </div>

      {/* Cart Section */}
      <div className="w-full lg:w-96 border-l border-gray-200 bg-white flex flex-col">
        <POSCart
          cart={cart}
          total={cartTotal}
          itemCount={cartItemCount}
          taxRate={taxRate}
          customer={selectedCustomer}
          onUpdateQuantity={handleUpdateQuantity}
          onRemove={handleRemoveFromCart}
          onClear={handleClearCart}
          onCheckout={handleCheckout}
          onSelectCustomer={(customer) => setSelectedCustomer(customer)}
        />
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          open={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          cart={cart}
          total={cartTotal}
          taxRate={taxRate}
          customer={selectedCustomer}
          onComplete={handlePaymentComplete}
        />
      )}

      {/* Barcode Scanner */}
      {showBarcodeScanner && (
        <POSBarcodeScanner
          open={showBarcodeScanner}
          onClose={() => setShowBarcodeScanner(false)}
          onScan={handleBarcodeScan}
        />
      )}

      {/* Receipt Modal */}
      {showReceipt && lastOrder && (
        <ReceiptModal
          open={showReceipt}
          onClose={handleReceiptClose}
          orderNumber={lastOrder.orderNumber}
          cart={lastOrder.cart}
          subtotal={lastOrder.subtotal}
          tax={lastOrder.tax}
          discount={lastOrder.discount}
          total={lastOrder.total}
          paymentMethod={lastOrder.paymentMethod}
          customer={selectedCustomer}
          date={lastOrder.date}
          businessName={businessName}
        />
      )}
    </div>
  );
};

export default POSPage;

