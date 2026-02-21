import { useEffect, useState, useMemo } from 'react';
import { Order, OrderDraft, OrderStatus } from '../../services/ordersService';
import { createCustomer, checkDuplicateCustomer } from '../../services/customersService';
import { useBusiness } from '../../contexts/BusinessContext';
import { useCurrency } from '../../hooks/useCurrency';
import { useShippingIntegrations, ShippingRegion } from '../../hooks/useShippingIntegrations';

const STATUS_OPTIONS: OrderStatus[] = ['pending', 'ready_for_pickup', 'processing', 'completed', 'cancelled'];

// Helper to remove undefined values from an object recursively (Firebase doesn't accept undefined)
const sanitizeData = <T extends Record<string, unknown>>(data: T): Partial<T> => {
  const result: Record<string, unknown> = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = data[key];
      if (value === undefined) {
        continue; // Skip undefined values
      }
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        const sanitized = sanitizeData(value as Record<string, unknown>);
        if (Object.keys(sanitized).length > 0) {
          result[key] = sanitized;
        }
      } else if (Array.isArray(value)) {
        result[key] = value.map((item) => 
          item !== null && typeof item === 'object' && !(item instanceof Date)
            ? sanitizeData(item as Record<string, unknown>)
            : item
        ).filter(item => item !== undefined);
      } else {
        result[key] = value;
      }
    }
  }
  return result as Partial<T>;
};

type OrderItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  size?: string;
  image?: string;
  maxStock?: number;
};

type ShippingAddress = {
  address?: string;
  line?: string;
  city?: string;
  district?: string;
  floor?: string;
  apartment?: string;
  building?: string;
  governorate?: string;
  neighborhood?: string;
  country?: string;
};

// Location data structure: Country > Governorate > Neighborhood > District
type LocationData = {
  [country: string]: {
    [governorate: string]: {
      [neighborhood: string]: string[];
    };
  };
};

const LOCATION_DATA: LocationData = {
  'Egypt': {
    'Cairo': {
      'Nasr City': ['1st District', '2nd District', '3rd District', '4th District', '5th District', '6th District', '7th District', '8th District', '9th District', '10th District'],
      'Heliopolis': ['Almaza', 'Ard El Golf', 'Korba', 'Roxy', 'Sheraton', 'Triumph'],
      'Maadi': ['Degla', 'Sarayat', 'Old Maadi', 'New Maadi', 'Zahraa Maadi', 'Maadi Corniche'],
      'New Cairo': ['1st Settlement', '3rd Settlement', '5th Settlement', 'Beit Al Watan', 'Al Narges', 'Al Yasmin', 'Al Lotus', 'South Academy', 'North 90th', 'South 90th'],
      'Downtown': ['Abdeen', 'Bab El Louk', 'Garden City', 'Kasr El Nil', 'Mounira', 'Tahrir'],
      'Zamalek': ['Gezira', 'Zamalek'],
      'Mohandessin': ['Arab League St', 'Gameat El Dewal', 'Lebanon Square', 'Sphinx Square'],
      'Dokki': ['Dokki', 'Agouza', 'Mesaha Square', 'Tahrir Square Dokki'],
      'Shubra': ['Shubra', 'Rod El Farag', 'Sahel', 'Shubra El Kheima'],
      'Ain Shams': ['Ain Shams', 'El Zaytoun', 'Hadayek El Kobba'],
      'October': ['1st District', '2nd District', '3rd District', '4th District', '5th District', '6th District', '7th District', 'Sheikh Zayed', 'Al Ashgar', 'Palm Hills', 'Dreamland'],
    },
    'Giza': {
      'Dokki': ['Dokki Square', 'Mesaha', 'Behoos', 'Gamaa'],
      'Mohandessin': ['Shehab St', 'Sudan St', 'Wadi El Nile', 'Makram Ebeid'],
      'Agouza': ['Agouza', 'Kit Kat', 'Imbaba Bridge'],
      'Haram': ['Faisal', 'Haram', 'Marioutia', 'Remaya Square', 'Pyramids'],
      '6th of October': ['1st District', '2nd District', '3rd District', '4th District', '5th District', '6th District', '7th District', '8th District', '9th District', '10th District', '11th District', '12th District'],
      'Sheikh Zayed': ['1st Neighborhood', '2nd Neighborhood', '3rd Neighborhood', '4th Neighborhood', 'Beverly Hills', 'Allegria', 'Casa', 'Zayed 2000'],
      'Smart Village': ['Smart Village'],
      'El Warraq': ['El Warraq', 'Imbaba'],
    },
    'Alexandria': {
      'Montazah': ['Mandara', 'Mamoura', 'Miami', 'Asafra', 'Sidi Bishr'],
      'El Raml': ['Raml Station', 'Manshiyya', 'Attarin', 'Camp Shezar'],
      'Sidi Gaber': ['Sidi Gaber', 'Cleopatra', 'Sporting', 'Ibrahimia'],
      'Smouha': ['Smouha', 'Kafr Abdo', 'Zizinia'],
      'Glym': ['Glym', 'San Stefano', 'Stanley'],
      'Agami': ['Agami', 'Bitash', 'Hannoville', 'Dekhela'],
      'Borg El Arab': ['New Borg El Arab', 'Old Borg El Arab'],
    },
    'Dakahlia': {
      'Mansoura': ['Toreel', 'Gedida', 'El Mashaya', 'University Area'],
      'Talkha': ['Talkha City', 'Industrial Area'],
      'Mit Ghamr': ['Mit Ghamr City', 'Sanafen'],
      'Aga': ['Aga City'],
      'El Senbellawein': ['El Senbellawein City'],
    },
    'Sharkia': {
      'Zagazig': ['Zagazig City', 'Ghazala', 'University Area'],
      '10th of Ramadan': ['1st District', '2nd District', '3rd District', 'Industrial Zone'],
      'Bilbeis': ['Bilbeis City'],
      'Abu Hammad': ['Abu Hammad City'],
      'Fakous': ['Fakous City'],
    },
    'Qaliubiya': {
      'Banha': ['Banha City', 'University Area'],
      'Qalyub': ['Qalyub City'],
      'Shubra El Kheima': ['Shubra El Kheima', 'Mostorod'],
      'El Khanka': ['El Khanka City', 'El Obour'],
      'El Obour': ['1st District', '2nd District', '3rd District', '4th District', '5th District', '6th District', 'Industrial Zone'],
    },
    'Port Said': {
      'Port Said City': ['El Sharq', 'El Arab', 'El Manakh', 'El Zohour', 'Port Fouad'],
    },
    'Suez': {
      'Suez City': ['El Arbeen', 'Faisal', 'El Ganayen', 'Attaka'],
    },
    'Ismailia': {
      'Ismailia City': ['El Sheikh Zayed', 'El Salam', 'University Area', 'El Sabeel'],
    },
    'Luxor': {
      'Luxor City': ['East Bank', 'West Bank', 'Karnak', 'City Center'],
    },
    'Aswan': {
      'Aswan City': ['City Center', 'Sahary City', 'El Sad El Aly'],
    },
    'Red Sea': {
      'Hurghada': ['El Dahar', 'Sekalla', 'El Mamsha', 'El Gouna', 'Sahl Hasheesh'],
      'Safaga': ['Safaga City'],
      'Marsa Alam': ['Marsa Alam', 'Port Ghalib'],
    },
    'South Sinai': {
      'Sharm El Sheikh': ['Naama Bay', 'Sharks Bay', 'Hadaba', 'Nabq Bay', 'Old Market'],
      'Dahab': ['Dahab City', 'Assalah'],
      'Nuweiba': ['Nuweiba City'],
      'Taba': ['Taba City'],
    },
    'North Sinai': {
      'El Arish': ['El Arish City'],
      'Rafah': ['Rafah City'],
      'Sheikh Zuweid': ['Sheikh Zuweid City'],
    },
    'Beheira': {
      'Damanhour': ['Damanhour City', 'University Area'],
      'Kafr El Dawwar': ['Kafr El Dawwar City'],
      'Rashid': ['Rashid City'],
    },
    'Gharbia': {
      'Tanta': ['Tanta City', 'El Bahr St', 'University Area'],
      'El Mahalla El Kubra': ['El Mahalla City', 'Industrial Area'],
      'Kafr El Zayat': ['Kafr El Zayat City'],
    },
    'Menofia': {
      'Shibin El Kom': ['Shibin El Kom City', 'University Area'],
      'Menouf': ['Menouf City'],
      'Sadat City': ['1st District', '2nd District', '3rd District', 'Industrial Zone'],
    },
    'Fayoum': {
      'Fayoum City': ['Fayoum City Center', 'University Area'],
      'Ibshway': ['Ibshway City'],
    },
    'Beni Suef': {
      'Beni Suef City': ['City Center', 'University Area'],
      'El Wasta': ['El Wasta City'],
    },
    'Minya': {
      'Minya City': ['City Center', 'University Area'],
      'Mallawi': ['Mallawi City'],
      'Samalut': ['Samalut City'],
    },
    'Assiut': {
      'Assiut City': ['City Center', 'University Area'],
      'Dairut': ['Dairut City'],
      'El Qusiya': ['El Qusiya City'],
    },
    'Sohag': {
      'Sohag City': ['City Center', 'University Area'],
      'Akhmim': ['Akhmim City'],
      'Girga': ['Girga City'],
    },
    'Qena': {
      'Qena City': ['City Center'],
      'Nag Hammadi': ['Nag Hammadi City'],
      'Qus': ['Qus City'],
    },
    'Kafr el-Sheikh': {
      'Kafr el-Sheikh City': ['City Center'],
      'Desouk': ['Desouk City'],
      'Baltim': ['Baltim City'],
    },
    'Damietta': {
      'Damietta City': ['City Center', 'New Damietta'],
      'Ras El Bar': ['Ras El Bar'],
    },
    'New Valley': {
      'Kharga': ['Kharga City'],
      'Dakhla': ['Dakhla City'],
    },
    'Matrouh': {
      'Marsa Matrouh': ['City Center', 'Almaza Beach'],
      'El Alamein': ['El Alamein City', 'New Alamein'],
      'Siwa': ['Siwa Oasis'],
    },
  },
  'Saudi Arabia': {
    'Riyadh': {
      'Central Riyadh': ['Al Olaya', 'Al Malaz', 'Al Murabba', 'Al Batha'],
      'North Riyadh': ['Al Nakheel', 'Al Sahafa', 'Al Yasmin', 'Al Narjis'],
      'East Riyadh': ['Al Rawdah', 'Al Naseem', 'Al Khaleej'],
      'South Riyadh': ['Al Aziziyah', 'Al Shifa', 'Al Dar Al Baida'],
    },
    'Jeddah': {
      'Central Jeddah': ['Al Balad', 'Al Sharafeyah', 'Al Hindawiyah'],
      'North Jeddah': ['Al Hamra', 'Al Rawdah', 'Al Zahra', 'Obhur'],
      'South Jeddah': ['Al Safa', 'Al Marwah', 'Al Faisaliah'],
    },
    'Makkah': {
      'Central Makkah': ['Al Haram', 'Ajyad', 'Al Aziziah'],
      'Mina': ['Mina'],
      'Arafat': ['Arafat'],
    },
    'Madinah': {
      'Central Madinah': ['Al Haram', 'Quba', 'Al Awali'],
      'North Madinah': ['Al Khalidiyah', 'Al Arid'],
    },
    'Dammam': {
      'Central Dammam': ['Al Faisaliah', 'Al Adamah', 'Al Mazruiyah'],
      'North Dammam': ['Al Shatea', 'Al Nawras'],
    },
    'Khobar': {
      'Central Khobar': ['Al Khobar Al Shamalia', 'Al Ulaya', 'Al Thuqba'],
      'Corniche': ['Al Corniche', 'Half Moon Bay'],
    },
  },
  'UAE': {
    'Dubai': {
      'Deira': ['Al Rigga', 'Al Muraqqabat', 'Port Saeed', 'Al Khabisi'],
      'Bur Dubai': ['Al Mankhool', 'Al Karama', 'Oud Metha', 'Al Raffa'],
      'Downtown': ['Downtown Dubai', 'Business Bay', 'DIFC'],
      'Marina': ['Dubai Marina', 'JBR', 'JLT'],
      'New Dubai': ['Al Barsha', 'Tecom', 'Internet City', 'Media City'],
    },
    'Abu Dhabi': {
      'Abu Dhabi Island': ['Al Khalidiya', 'Al Bateen', 'Corniche', 'Tourist Club'],
      'Al Reem Island': ['Marina Square', 'Shams Abu Dhabi'],
      'Yas Island': ['Yas Marina', 'Yas Mall Area'],
    },
    'Sharjah': {
      'Al Majaz': ['Al Majaz 1', 'Al Majaz 2', 'Al Majaz 3'],
      'Al Nahda': ['Al Nahda Sharjah'],
      'Al Qasimia': ['Al Qasimia'],
    },
  },
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: OrderDraft) => Promise<void>;
  onDelete?: () => Promise<void>;
  submitting?: boolean;
  deleting?: boolean;
  initialValue?: Order | null;
  products?: Array<{
    id: string;
    name: string;
    price: number;
    sellingPrice?: number;
    sku?: string;
    barcode?: string;
    stock?: Record<string, number>;
    images?: string[];
    totalStock?: number;
  }>;
  customers?: Array<{
    id: string;
    name: string;
    phone?: string;
    email?: string;
    addressDetails?: {
      governorate?: string;
      neighborhood?: string;
      district?: string;
      line?: string;
      address?: string;
      addressLine2?: string;
      city?: string;
      country?: string;
      floor?: string;
      apartment?: string;
      building?: string;
      postalCode?: string;
      addressClarification?: string;
    };
  }>;
};

const OrderModal = ({ open, onClose, onSubmit, onDelete, submitting, deleting, initialValue, products = [], customers = [] }: Props) => {
  const { formatCurrency } = useCurrency();
  const { businessId } = useBusiness();
  const { 
    shippingRegions, 
    defaultShippingRate, 
    defaultEstimatedDays,
    regionsEnabled 
  } = useShippingIntegrations(businessId);

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerFirstName, setCustomerFirstName] = useState('');
  const [customerLastName, setCustomerLastName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerAddress, setNewCustomerAddress] = useState<ShippingAddress>({
    country: 'Egypt'
  });
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [requiresDelivery, setRequiresDelivery] = useState(false);
  const [allowOpenPackage, setAllowOpenPackage] = useState(true); // Allow customer to inspect before accepting
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({});
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [status, setStatus] = useState<OrderStatus>('pending');
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [channel, setChannel] = useState('');
  const [shippingFees, setShippingFees] = useState(0);
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountValue, setDiscountValue] = useState(0);
  const [discountReason, setDiscountReason] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Dropdown states
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProductsInModal, setSelectedProductsInModal] = useState<Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
    image?: string;
    size?: string;
    maxStock?: number;
  }>>([]);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [selectedRegionId, setSelectedRegionId] = useState<string | 'custom' | 'free'>('');
  const [customShippingFee, setCustomShippingFee] = useState(0);
  const [selectedRegionName, setSelectedRegionName] = useState('');

  // Get customer's governorate from selected customer or new customer form
  const getCustomerGovernorate = useMemo(() => {
    // Check if we have a selected existing customer
    if (selectedCustomerId) {
      const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
      return selectedCustomer?.addressDetails?.governorate || '';
    }
    // Check if adding new customer with address
    if (isNewCustomer && newCustomerAddress.governorate) {
      return newCustomerAddress.governorate;
    }
    return '';
  }, [selectedCustomerId, customers, isNewCustomer, newCustomerAddress.governorate]);

  // Find matching shipping region based on customer's governorate
  const matchingRegion = useMemo(() => {
    if (!getCustomerGovernorate) return null;
    
    // Find region that includes the customer's governorate
    return shippingRegions.find(region => 
      region.governorates.some(gov => 
        gov.toLowerCase() === getCustomerGovernorate.toLowerCase()
      )
    ) || null;
  }, [getCustomerGovernorate, shippingRegions]);

  // Auto-select matching region when shipping modal opens
  useEffect(() => {
    if (showShippingModal && matchingRegion && !selectedRegionId) {
      setSelectedRegionId(matchingRegion.id);
    }
  }, [showShippingModal, matchingRegion]);

  // Reset form when modal opens/closes or initialValue changes
  useEffect(() => {
    if (!open) return;
    
    if (!initialValue) {
      setCustomerName('');
      setCustomerFirstName('');
      setCustomerLastName('');
      setCustomerContact('');
      setCustomerEmail('');
      setCustomerSearch('');
      setSelectedCustomerId(null);
      setIsNewCustomer(false);
      setNewCustomerAddress({ country: 'Egypt' });
      setSavingCustomer(false);
      setDuplicateError(null);
      setProductSearch('');
      setNotes('');
      setRequiresDelivery(false);
      setShippingAddress({});
      setOrderItems([]);
      setStatus('pending');
      setPaymentStatus('unpaid');
      setChannel('');
      setShippingFees(0);
      setShowDiscountInput(false);
      setDiscountType('fixed');
      setDiscountValue(0);
      setDiscountReason('');
      setTaxRate(0);
      setError(null);
      return;
    }

    setCustomerName(initialValue.customerName ?? '');
    setCustomerContact(initialValue.customerContact ?? '');
    setCustomerEmail(initialValue.customerEmail ?? '');
    setCustomerSearch(initialValue.customerName ?? '');
    setNotes(initialValue.notes ?? '');
    setRequiresDelivery(!!initialValue.shippingAddress?.address);
    setShippingAddress(initialValue.shippingAddress ?? {});
    setOrderItems(initialValue.items ?? []);
    setStatus(initialValue.status);
    setPaymentStatus(initialValue.paymentStatus ?? 'unpaid');
    setChannel(initialValue.channel ?? '');
    // Load discount values
    setDiscountType(initialValue.discountType ?? 'fixed');
    setDiscountValue(initialValue.discountValue ?? 0);
    setDiscountReason(initialValue.discountReason ?? '');
    setShowDiscountInput(false);
    setError(null);
  }, [initialValue, open]);

  // Calculate totals
  const subtotal = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [orderItems]);

  const taxes = useMemo(() => {
    return subtotal * (taxRate / 100);
  }, [subtotal, taxRate]);

  // Calculate discount based on type (percentage or fixed)
  const calculatedDiscount = useMemo(() => {
    if (discountType === 'percentage') {
      return Math.min((subtotal * discountValue) / 100, subtotal);
    }
    return Math.min(discountValue, subtotal + taxes + shippingFees);
  }, [discountType, discountValue, subtotal, taxes, shippingFees]);

  const total = useMemo(() => {
    return Math.max(0, subtotal + taxes + shippingFees - calculatedDiscount);
  }, [subtotal, taxes, shippingFees, calculatedDiscount]);

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 5);
    const term = customerSearch.toLowerCase();
    return customers.filter(c => 
      c.name?.toLowerCase().includes(term) ||
      c.phone?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term)
    ).slice(0, 5);
  }, [customers, customerSearch]);

  // Filter products based on search
  // Expand products with sizes into individual items
  const expandedProducts = useMemo(() => {
    const expanded: Array<{
      id: string;
      productId: string;
      name: string;
      displayName: string;
      size?: string;
      price: number;
      sellingPrice?: number;
      sku?: string;
      barcode?: string;
      stock: number;
      images?: string[];
    }> = [];

    products.forEach(product => {
      const stockObj = product.stock ?? {};
      const sizes = Object.keys(stockObj);
      
      if (sizes.length > 0) {
        // Product has sizes - create entry for each size
        sizes.forEach(size => {
          const stockCount = stockObj[size] ?? 0;
          expanded.push({
            id: `${product.id}-${size}`,
            productId: product.id,
            name: product.name,
            displayName: `${product.name} ${size}`,
            size,
            price: product.price,
            sellingPrice: product.sellingPrice,
            sku: product.sku,
            barcode: product.barcode,
            stock: stockCount,
            images: product.images
          });
        });
      } else {
        // No sizes - use totalStock or 0
        expanded.push({
          id: product.id,
          productId: product.id,
          name: product.name,
          displayName: product.name,
          price: product.price,
          sellingPrice: product.sellingPrice,
          sku: product.sku,
          barcode: product.barcode,
          stock: product.totalStock ?? 0,
          images: product.images
        });
      }
    });

    return expanded;
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return expandedProducts;
    const term = productSearch.toLowerCase();
    return expandedProducts.filter(p => 
      p.name?.toLowerCase().includes(term) ||
      p.displayName?.toLowerCase().includes(term) ||
      p.sku?.toLowerCase().includes(term) ||
      p.barcode?.toLowerCase().includes(term) ||
      p.size?.toLowerCase().includes(term)
    );
  }, [expandedProducts, productSearch]);

  const selectCustomer = (customer: typeof customers[0]) => {
    setCustomerName(customer.name);
    setCustomerContact(customer.phone ?? '');
    setCustomerEmail(customer.email ?? '');
    setCustomerSearch('');
    setSelectedCustomerId(customer.id);
    setIsNewCustomer(false);
    setShowCustomerDropdown(false);
  };

  const clearCustomer = () => {
    setCustomerName('');
    setCustomerFirstName('');
    setCustomerLastName('');
    setCustomerContact('');
    setCustomerEmail('');
    setCustomerSearch('');
    setSelectedCustomerId(null);
    setIsNewCustomer(false);
    setNewCustomerAddress({ country: 'Egypt' });
  };

  const handleAddNewCustomer = () => {
    setIsNewCustomer(true);
    setSelectedCustomerId(null);
    setCustomerName('');
    setCustomerFirstName('');
    setCustomerLastName('');
    setCustomerContact('');
    setCustomerEmail('');
    setNewCustomerAddress({ country: 'Egypt' });
    setShowCustomerDropdown(false);
  };

  const saveNewCustomer = async () => {
    const fullName = `${customerFirstName} ${customerLastName}`.trim();
    if (!fullName || !businessId) return;
    
    setDuplicateError(null);
    setSavingCustomer(true);
    
    try {
      // Check for duplicates
      const duplicateCheck = await checkDuplicateCustomer(
        businessId,
        customerContact || undefined,
        customerEmail || undefined
      );
      
      if (duplicateCheck.isDuplicate) {
        const field = duplicateCheck.field === 'phone' ? 'Phone number' : 'Email';
        const existingName = duplicateCheck.existingCustomer?.name || 'another customer';
        setDuplicateError(`${field} already exists for "${existingName}". Please use a different ${duplicateCheck.field}.`);
        setSavingCustomer(false);
        return;
      }
      
      // Build addressDetails without undefined values
      const addressDetails: Record<string, string> = {};
      if (newCustomerAddress.address) addressDetails.line = newCustomerAddress.address;
      if (newCustomerAddress.apartment) addressDetails.apartment = newCustomerAddress.apartment;
      if (newCustomerAddress.floor) addressDetails.floor = newCustomerAddress.floor;
      if (newCustomerAddress.building) addressDetails.building = newCustomerAddress.building;
      if (newCustomerAddress.country) addressDetails.country = newCustomerAddress.country;
      if (newCustomerAddress.governorate) addressDetails.governorate = newCustomerAddress.governorate;
      if (newCustomerAddress.neighborhood) addressDetails.neighborhood = newCustomerAddress.neighborhood;
      if (newCustomerAddress.district) addressDetails.district = newCustomerAddress.district;

      // Build customer payload without undefined values
      const customerPayload: Parameters<typeof createCustomer>[1] = {
        name: fullName,
        firstName: customerFirstName,
        lastName: customerLastName,
        status: 'active',
        orderCount: 0,
        totalSpent: 0
      };
      
      if (customerContact) {
        customerPayload.phone = `+20${customerContact.replace(/^\+20/, '')}`;
      }
      if (customerEmail) {
        customerPayload.email = customerEmail;
      }
      if (Object.keys(addressDetails).length > 0) {
        customerPayload.addressDetails = addressDetails;
      }

      // Save to Firebase
      const newCustomerId = await createCustomer(businessId, customerPayload);
      
      setCustomerName(fullName);
      setSelectedCustomerId(newCustomerId);
      setIsNewCustomer(false);
      setDuplicateError(null);
    } catch (err) {
      console.error('[OrderModal] Failed to save customer:', err);
      setDuplicateError('Failed to save customer. Please try again.');
    } finally {
      setSavingCustomer(false);
    }
  };

  const toggleProductInModal = (product: typeof expandedProducts[0]) => {
    // Don't allow adding out of stock products
    if (product.stock <= 0) return;
    
    const existingIndex = selectedProductsInModal.findIndex(item => item.productId === product.id);
    
    if (existingIndex >= 0) {
      // Remove from selection
      setSelectedProductsInModal(selectedProductsInModal.filter((_, i) => i !== existingIndex));
    } else {
      // Add to selection
      setSelectedProductsInModal([...selectedProductsInModal, {
        productId: product.id,
        name: product.displayName,
        quantity: 1,
        price: product.sellingPrice ?? product.price,
        image: product.images?.[0],
        size: product.size,
        maxStock: product.stock
      }]);
    }
  };

  const confirmProductSelection = () => {
    // Merge selected products with existing order items
    const updatedItems = [...orderItems];
    
    selectedProductsInModal.forEach(selected => {
      // Match by productId (which includes size for sized products)
      const existingIndex = updatedItems.findIndex(item => item.productId === selected.productId);
      if (existingIndex >= 0) {
        // Don't exceed max stock when merging
        const newQuantity = updatedItems[existingIndex].quantity + selected.quantity;
        const maxStock = selected.maxStock ?? updatedItems[existingIndex].maxStock ?? Infinity;
        updatedItems[existingIndex].quantity = Math.min(newQuantity, maxStock);
      } else {
        updatedItems.push({
          productId: selected.productId,
          name: selected.name,
          quantity: selected.quantity,
          price: selected.price,
          image: selected.image,
          size: selected.size,
          maxStock: selected.maxStock
        });
      }
    });
    
    setOrderItems(updatedItems);
    setSelectedProductsInModal([]);
    setProductSearch('');
    setShowProductModal(false);
  };

  const cancelProductSelection = () => {
    setSelectedProductsInModal([]);
    setProductSearch('');
    setShowProductModal(false);
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(index);
      return;
    }
    const updated = [...orderItems];
    const maxStock = updated[index].maxStock ?? Infinity;
    // Don't allow exceeding max stock
    updated[index].quantity = Math.min(quantity, maxStock);
    setOrderItems(updated);
  };

  const removeItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!customerName.trim()) {
      setError('Customer name is required.');
      return;
    }

    try {
      // Build shipping address from customer's address details
      let finalShippingAddress: typeof shippingAddress | undefined;
      
      if (requiresDelivery) {
        // Get address from selected customer or new customer form
        if (selectedCustomerId) {
          const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
          console.log('[OrderModal] Selected customer addressDetails:', selectedCustomer?.addressDetails);
          
          if (selectedCustomer?.addressDetails) {
            const addr = selectedCustomer.addressDetails;
            // Handle multiple possible field names for address
            const addressLine = addr.line || addr.address || addr.addressLine2 || '';
            const cityName = addr.governorate || addr.city || '';
            const districtName = addr.district || addr.neighborhood || '';
            
            finalShippingAddress = {
              address: addressLine,
              city: cityName,
              district: districtName,
              floor: addr.floor || '',
              apartment: addr.apartment || '',
              building: addr.building || ''
            };
            console.log('[OrderModal] Built shipping address from customer:', finalShippingAddress);
          }
        } else if (isNewCustomer && newCustomerAddress) {
          const addr = newCustomerAddress;
          finalShippingAddress = {
            address: addr.address || '',
            city: addr.governorate || addr.city || '',
            district: addr.district || addr.neighborhood || '',
            floor: addr.floor || '',
            apartment: addr.apartment || '',
            building: addr.building || ''
          };
          console.log('[OrderModal] Built shipping address from new customer:', finalShippingAddress);
        }
        
        // Fall back to manually entered shipping address if available
        if (!finalShippingAddress?.address && shippingAddress?.address) {
          finalShippingAddress = shippingAddress;
          console.log('[OrderModal] Using manually entered shipping address:', finalShippingAddress);
        }
      }

      const rawPayload: OrderDraft = {
        id: initialValue?.id,
        customerName,
        customerContact: customerContact || undefined,
        customerEmail: customerEmail || undefined,
        status,
        productCount: orderItems.reduce((sum, item) => sum + item.quantity, 0),
        total,
        notes: notes || undefined,
        channel,
        paymentStatus,
        date: new Date(),
        shippingAddress: finalShippingAddress,
        // Delivery options
        allowOpenPackage: requiresDelivery ? allowOpenPackage : undefined,
        // COD amount: full total if unpaid, only shipping if paid
        codAmount: requiresDelivery 
          ? (paymentStatus === 'paid' ? shippingFees : total)
          : undefined,
        shippingFees: requiresDelivery ? shippingFees : undefined,
        // Discount fields
        discount: calculatedDiscount > 0 ? calculatedDiscount : undefined,
        discountType: calculatedDiscount > 0 ? discountType : undefined,
        discountValue: calculatedDiscount > 0 ? discountValue : undefined,
        discountReason: discountReason || undefined,
        items: orderItems.map(item => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          size: item.size || undefined,
          image: item.image || undefined
        }))
      };
      
      // Sanitize the payload to remove undefined values (Firebase doesn't accept undefined)
      const payload = sanitizeData(rawPayload) as OrderDraft;
      
      await onSubmit(payload);
      setError(null);
    } catch (submitError) {
      console.error('[OrderModal] Failed to submit order', submitError);
      setError(submitError instanceof Error ? submitError.message : 'Failed to save order.');
    }
  };

  const togglePaymentStatus = () => {
    setPaymentStatus(paymentStatus === 'paid' ? 'unpaid' : 'paid');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 shadow-xl">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-primary">
              {initialValue?.id ? 'Edit Order' : 'Add Order'}
            </h2>
            <p className="text-xs text-madas-text/60">
              Create and manage customer orders
            </p>
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-madas-text/60 transition-colors hover:bg-gray-100"
            onClick={onClose}
            disabled={submitting}
          >
            <span className="material-icons">close</span>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto p-4" style={{ maxHeight: 'calc(90vh - 80px)' }}>
          
          {/* Customer Section */}
          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-madas-text mb-4">Customer</h3>
            
            {/* Show search if no customer selected */}
            {!selectedCustomerId && !isNewCustomer && !customerName && (
              <div className="relative">
                <div className="flex items-center gap-2 rounded-lg border-2 border-primary px-3 py-3 bg-white">
                  <span className="material-icons text-madas-text/40 text-xl">search</span>
              <input
                type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder=""
                    className="flex-1 bg-transparent text-sm focus:outline-none"
                  />
                </div>
                
                {showCustomerDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg z-10 max-h-72 overflow-y-auto">
                    {/* Add New Button */}
                    <button
                      type="button"
                      className="w-full px-4 py-4 text-left hover:bg-gray-50 border-b border-gray-100 flex items-center gap-3"
                      onClick={handleAddNewCustomer}
                    >
                      <span className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <span className="material-icons text-white text-sm">add</span>
                      </span>
                      <span className="text-sm font-medium text-primary">Add New</span>
                    </button>
                    
                    {/* Customer List */}
                    {filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        className="w-full px-4 py-4 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                        onClick={() => selectCustomer(customer)}
                      >
                        <div className="text-sm font-medium text-madas-text">{customer.name}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Selected Customer Card */}
            {(selectedCustomerId || customerName) && !isNewCustomer && customerName && (
              <div className="rounded-xl bg-gray-50 p-5">
                {/* Customer Header Row */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="material-icons text-madas-text/60 text-2xl">person_outline</span>
                  <span className="text-base font-medium text-primary">{customerName}</span>
                  
                  {/* Tags */}
                  <span className="px-3 py-1 rounded-full bg-gray-200 text-xs font-medium text-madas-text">
                    Not subscribed
                  </span>
                  <span className="px-3 py-1 rounded-full bg-gray-200 text-xs font-medium text-madas-text">
                    {selectedCustomerId ? 'Customer' : 'New'}
                  </span>
                  
                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={clearCustomer}
                    className="ml-auto w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-white transition-colors"
                  >
                    <span className="material-icons text-red-500 text-xl">delete_outline</span>
                  </button>
                </div>
                
                {/* Phone Number */}
                {customerContact && (
                  <div className="flex items-center gap-2 mt-4">
                    <span className="material-icons text-primary text-xl">phone</span>
                    <span className="text-sm text-primary">{customerContact.startsWith('+') ? customerContact : `+20${customerContact}`}</span>
                  </div>
                )}
                
                {/* Email */}
                {customerEmail && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="material-icons text-primary text-xl">email</span>
                    <span className="text-sm text-primary">{customerEmail}</span>
                  </div>
                )}
              </div>
            )}

            {/* New Customer Form */}
            {isNewCustomer && (
              <div className="space-y-4">
                {/* Form Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="material-icons text-primary">person_add</span>
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-madas-text">New Customer</h4>
                      <p className="text-xs text-madas-text/50">Fill in customer details</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearCustomer}
                    className="text-madas-text/50 hover:text-madas-text transition-colors"
                  >
                    <span className="material-icons">close</span>
                  </button>
                </div>

                {/* Contact Info Section */}
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <span className="material-icons text-primary text-lg">badge</span>
                    <span className="text-sm font-semibold text-madas-text">Contact Information</span>
                    <span className="text-xs text-red-500">*Required</span>
                  </div>
                  <div className="p-4 space-y-4">
                    {/* First & Last Name */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-madas-text/70 mb-1.5 block">First name *</label>
              <input
                type="text"
                          value={customerFirstName}
                          onChange={(e) => setCustomerFirstName(e.target.value)}
                          placeholder="Enter first name"
                          className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                            customerFirstName.trim() ? 'border-green-300 bg-green-50/30' : 'border-gray-200 bg-white'
                          }`}
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-madas-text/70 mb-1.5 block">Last name</label>
              <input
                          type="text"
                          value={customerLastName}
                          onChange={(e) => setCustomerLastName(e.target.value)}
                          placeholder="Enter last name"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                        />
                      </div>
                    </div>
                    
                    {/* Phone Number */}
                    <div>
                      <label className="text-xs font-medium text-madas-text/70 mb-1.5 block">Phone number *</label>
                      <div className="flex">
                        <div className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 border-r-0 rounded-l-lg bg-gray-50">
                          <span className="text-lg">🇪🇬</span>
                          <span className="text-sm font-medium text-madas-text">+20</span>
                        </div>
              <input
                          type="tel"
                          value={customerContact}
                          onChange={(e) => {
                            // Only allow numbers
                            const value = e.target.value.replace(/\D/g, '');
                            setCustomerContact(value);
                          }}
                          placeholder="1XXXXXXXXX"
                          maxLength={10}
                          className={`flex-1 rounded-r-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                            customerContact.length >= 10 ? 'border-green-300 bg-green-50/30' : 'border-gray-200 bg-white'
                          }`}
                        />
                      </div>
                      {customerContact && customerContact.length < 10 && (
                        <p className="text-xs text-orange-500 mt-1 flex items-center gap-1">
                          <span className="material-icons text-xs">info</span>
                          Phone number should be 10 digits
                        </p>
                      )}
                    </div>
                    
                    {/* Email */}
                    <div>
                      <label className="text-xs font-medium text-madas-text/70 mb-1.5 block">Email address (optional)</label>
                      <div className="relative">
                        <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-madas-text/40 text-lg">email</span>
                        <input
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="customer@email.com"
                          className="w-full rounded-lg border border-gray-200 pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Address Section */}
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <span className="material-icons text-primary text-lg">location_on</span>
                    <span className="text-sm font-semibold text-madas-text">Delivery Address</span>
                  </div>
                  <div className="p-4 space-y-4">
                    {/* Country & Governorate - First Row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-madas-text/70 mb-1.5 block">Country</label>
                        <div className="relative">
              <select
                            value={newCustomerAddress.country ?? 'Egypt'}
                            onChange={(e) => setNewCustomerAddress({
                              ...newCustomerAddress,
                              country: e.target.value,
                              governorate: '',
                              neighborhood: '',
                              district: ''
                            })}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white appearance-none pr-10"
                          >
                            <option value="">Select country</option>
                            {Object.keys(LOCATION_DATA).map((country) => (
                              <option key={country} value={country}>{country}</option>
                ))}
              </select>
                          <span className="material-icons absolute right-3 top-1/2 -translate-y-1/2 text-madas-text/40 text-lg pointer-events-none">expand_more</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-madas-text/70 mb-1.5 block">Governorate *</label>
                        <div className="relative">
                          <select
                            value={newCustomerAddress.governorate ?? ''}
                            onChange={(e) => setNewCustomerAddress({
                              ...newCustomerAddress,
                              governorate: e.target.value,
                              neighborhood: '',
                              district: ''
                            })}
                            disabled={!newCustomerAddress.country}
                            className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none pr-10 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                              newCustomerAddress.governorate ? 'border-green-300 bg-green-50/30' : 'border-gray-200 bg-white'
                            }`}
                          >
                            <option value="">Select governorate</option>
                            {newCustomerAddress.country && LOCATION_DATA[newCustomerAddress.country] &&
                              Object.keys(LOCATION_DATA[newCustomerAddress.country]).map((gov) => (
                                <option key={gov} value={gov}>{gov}</option>
                              ))
                            }
                          </select>
                          <span className="material-icons absolute right-3 top-1/2 -translate-y-1/2 text-madas-text/40 text-lg pointer-events-none">expand_more</span>
                        </div>
                      </div>
                    </div>

                    {/* Neighborhood & District - Second Row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-madas-text/70 mb-1.5 block">Neighborhood</label>
                        <div className="relative">
                          <select
                            value={newCustomerAddress.neighborhood ?? ''}
                            onChange={(e) => setNewCustomerAddress({
                              ...newCustomerAddress,
                              neighborhood: e.target.value,
                              district: ''
                            })}
                            disabled={!newCustomerAddress.governorate}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white appearance-none pr-10 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            <option value="">Select neighborhood</option>
                            {newCustomerAddress.country && newCustomerAddress.governorate &&
                              LOCATION_DATA[newCustomerAddress.country]?.[newCustomerAddress.governorate] &&
                              Object.keys(LOCATION_DATA[newCustomerAddress.country][newCustomerAddress.governorate]).map((neighborhood) => (
                                <option key={neighborhood} value={neighborhood}>{neighborhood}</option>
                              ))
                            }
                          </select>
                          <span className="material-icons absolute right-3 top-1/2 -translate-y-1/2 text-madas-text/40 text-lg pointer-events-none">expand_more</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-madas-text/70 mb-1.5 block">District</label>
                        <div className="relative">
                          <select
                            value={newCustomerAddress.district ?? ''}
                            onChange={(e) => setNewCustomerAddress({...newCustomerAddress, district: e.target.value})}
                            disabled={!newCustomerAddress.neighborhood}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white appearance-none pr-10 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            <option value="">Select district</option>
                            {newCustomerAddress.country && newCustomerAddress.governorate && newCustomerAddress.neighborhood &&
                              LOCATION_DATA[newCustomerAddress.country]?.[newCustomerAddress.governorate]?.[newCustomerAddress.neighborhood]?.map((district) => (
                                <option key={district} value={district}>{district}</option>
                              ))
                            }
                          </select>
                          <span className="material-icons absolute right-3 top-1/2 -translate-y-1/2 text-madas-text/40 text-lg pointer-events-none">expand_more</span>
                        </div>
                      </div>
                    </div>

                    {/* Street Address */}
                    <div>
                      <label className="text-xs font-medium text-madas-text/70 mb-1.5 block">Street address</label>
                      <div className="relative">
                        <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-madas-text/40 text-lg">home</span>
              <input
                type="text"
                          value={newCustomerAddress.address ?? ''}
                          onChange={(e) => setNewCustomerAddress({...newCustomerAddress, address: e.target.value})}
                          placeholder="Street name, building number..."
                          className="w-full rounded-lg border border-gray-200 pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                        />
                      </div>
                    </div>
                    
                    {/* Building Details */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-medium text-madas-text/70 mb-1.5 block">Building</label>
              <input
                type="text"
                          value={newCustomerAddress.building ?? ''}
                          onChange={(e) => setNewCustomerAddress({...newCustomerAddress, building: e.target.value})}
                          placeholder="Bldg #"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white text-center"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-madas-text/70 mb-1.5 block">Floor</label>
                        <input
                          type="text"
                          value={newCustomerAddress.floor ?? ''}
                          onChange={(e) => setNewCustomerAddress({...newCustomerAddress, floor: e.target.value})}
                          placeholder="Floor #"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white text-center"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-madas-text/70 mb-1.5 block">Apartment</label>
                        <input
                          type="text"
                          value={newCustomerAddress.apartment ?? ''}
                          onChange={(e) => setNewCustomerAddress({...newCustomerAddress, apartment: e.target.value})}
                          placeholder="Apt #"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white text-center"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shipping Cost Preview */}
                {newCustomerAddress.governorate && (
                  <div className={`rounded-xl p-4 flex items-center gap-3 ${
                    matchingRegion ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'
                  }`}>
                    <span className={`material-icons text-2xl ${matchingRegion ? 'text-green-600' : 'text-orange-600'}`}>
                      {matchingRegion ? 'local_shipping' : 'info'}
                    </span>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${matchingRegion ? 'text-green-700' : 'text-orange-700'}`}>
                        {matchingRegion 
                          ? `Shipping to ${newCustomerAddress.governorate}` 
                          : `No shipping zone for ${newCustomerAddress.governorate}`
                        }
                      </p>
                      <p className={`text-xs ${matchingRegion ? 'text-green-600' : 'text-orange-600'}`}>
                        {matchingRegion 
                          ? `${matchingRegion.name} • ${matchingRegion.estimatedDays}`
                          : 'Custom shipping rate will be required'
                        }
                      </p>
                    </div>
                    {matchingRegion && (
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-700">{formatCurrency(matchingRegion.shippingRate)}</p>
                        <p className="text-xs text-green-600">shipping</p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Duplicate Error */}
                {duplicateError && (
                  <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
                    <span className="material-icons text-red-500 text-xl">error</span>
                    <div>
                      <p className="text-sm font-medium text-red-700">Cannot save customer</p>
                      <p className="text-xs text-red-600 mt-0.5">{duplicateError}</p>
                    </div>
                  </div>
                )}

                {/* Save / Cancel Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-madas-text/50">
                    {customerFirstName.trim() && customerContact.length >= 10 
                      ? '✓ Ready to save' 
                      : 'Fill required fields to continue'
                    }
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={clearCustomer}
                      disabled={savingCustomer}
                      className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-madas-text hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveNewCustomer}
                      disabled={!customerFirstName.trim() || customerContact.length < 10 || savingCustomer}
                      className="px-5 py-2.5 rounded-lg bg-primary text-sm font-medium text-white hover:bg-[#1f3c19] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {savingCustomer ? (
                        <>
                          <span className="material-icons animate-spin text-base">progress_activity</span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <span className="material-icons text-base">check</span>
                          Save Customer
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Products Section */}
          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-madas-text mb-4">Products</h3>
            
            {/* Button to open product selection modal */}
            <button
              type="button"
              onClick={() => setShowProductModal(true)}
              className="w-full flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              <span className="material-icons text-madas-text/40 text-xl">search</span>
              <span className="flex-1 text-sm text-madas-text/60">Search by product name, SKU or barcode</span>
            </button>

            {/* Selected Products List */}
            {orderItems.length > 0 && (
              <div className="mt-4 space-y-2">
                {orderItems.map((item, index) => {
                  const isAtMaxStock = item.maxStock !== undefined && item.quantity >= item.maxStock;
                  
                  return (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                      {/* Product Image */}
                      <div className="w-14 h-14 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-icons text-gray-400">inventory_2</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-madas-text break-words">{item.name}</div>
                        <div className="text-xs text-madas-text/60">
                          {formatCurrency(item.price)} each
                          {item.maxStock !== undefined && (
                            <span className={isAtMaxStock ? 'text-orange-500 ml-2' : 'ml-2'}>
                              • Max: {item.maxStock}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateItemQuantity(index, item.quantity - 1)}
                          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100"
                        >
                          <span className="material-icons text-sm">remove</span>
                        </button>
                        <span className={`w-8 text-center text-sm font-medium ${isAtMaxStock ? 'text-orange-500' : ''}`}>
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateItemQuantity(index, item.quantity + 1)}
                          disabled={isAtMaxStock}
                          className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                            isAtMaxStock 
                              ? 'border-gray-200 text-gray-300 cursor-not-allowed' 
                              : 'border-gray-200 hover:bg-gray-100'
                          }`}
                          title={isAtMaxStock ? 'Maximum stock reached' : 'Add one'}
                        >
                          <span className="material-icons text-sm">add</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="w-8 h-8 rounded-lg text-red-500 flex items-center justify-center hover:bg-red-50"
                        >
                          <span className="material-icons text-sm">close</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Notes Section */}
          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-madas-text mb-4">Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add Note"
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          </section>

          {/* Delivery Section */}
          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-madas-text mb-2">Delivery</h3>
            <p className="text-sm text-madas-text/60 mb-4">Does this order require delivery?</p>
            
            <div className="space-y-3">
              <label 
                className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  !requiresDelivery 
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
              <input
                  type="radio"
                  name="delivery"
                  checked={!requiresDelivery}
                  onChange={() => setRequiresDelivery(false)}
                  className="w-5 h-5 text-primary border-2 border-gray-300 focus:ring-primary"
                />
                <span className={`text-sm ${!requiresDelivery ? 'text-primary font-medium' : 'text-madas-text'}`}>
                  No, I do not want to deliver this order
                </span>
            </label>
              
              <label 
                className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  requiresDelivery 
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="delivery"
                  checked={requiresDelivery}
                  onChange={() => {
                    setShowShippingModal(true);
                  }}
                  className="w-5 h-5 text-primary border-2 border-gray-300 focus:ring-primary"
                />
                <span className={`text-sm ${requiresDelivery ? 'text-primary font-medium' : 'text-madas-text'}`}>
                  Yes, I want to deliver this order
                </span>
              </label>
            </div>

            {/* Shipping confirmation message */}
            {requiresDelivery && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700">
                  <span className="material-icons text-lg">check_circle</span>
                  <span className="text-sm">
                    {selectedRegionId === 'free' 
                      ? 'Free Shipping' 
                      : selectedRegionId === 'custom' 
                        ? `Custom: ${formatCurrency(shippingFees)}`
                        : selectedRegionName 
                          ? `${selectedRegionName}: ${formatCurrency(shippingFees)}`
                          : `Shipping: ${formatCurrency(shippingFees)}`
                    }
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowShippingModal(true)}
                    className="ml-auto text-xs text-green-600 hover:text-green-800 underline"
                  >
                    Change
                  </button>
                </div>

                {/* Allow open package option */}
                <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={allowOpenPackage}
                    onChange={(e) => setAllowOpenPackage(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-madas-text">
                      Allow customer to open package
                    </span>
                    <p className="text-xs text-madas-text/60 mt-0.5">
                      Customer can inspect items before accepting delivery (recommended for COD)
                    </p>
                  </div>
                  <span className="material-icons text-xl text-primary/60">inventory_2</span>
                </label>

                {/* Payment info for shipping */}
                {paymentStatus === 'paid' && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 text-blue-700">
                    <span className="material-icons text-lg">info</span>
                    <span className="text-sm">
                      Order is prepaid. Only shipping fees ({formatCurrency(shippingFees)}) will be collected on delivery.
                    </span>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Payment Section */}
          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-madas-text mb-4">Payment</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2">
                <span className="text-madas-text/70">Subtotal</span>
                <span className="text-madas-text">{formatCurrency(subtotal)}</span>
              </div>
              
              <div className="flex justify-between items-center py-2">
                <span className="text-madas-text/70">Taxes</span>
                <span className="text-madas-text">{formatCurrency(taxes)}</span>
              </div>
              
              <div className="flex justify-between items-center py-2">
                <span className="text-madas-text/70">Shipping fees</span>
                <span className="text-madas-text">{formatCurrency(shippingFees)}</span>
              </div>
              
              <div className="py-2">
                {showDiscountInput ? (
                  <div className="space-y-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-amber-800 flex items-center gap-1.5">
                        <span className="material-icons text-base">discount</span>
                        Extra Discount
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDiscountInput(false);
                          setDiscountValue(0);
                          setDiscountReason('');
                        }}
                        className="text-amber-600 hover:text-amber-800 transition-colors"
                      >
                        <span className="material-icons text-lg">close</span>
                      </button>
                    </div>
                    
                    {/* Discount Type Toggle */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDiscountType('fixed')}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          discountType === 'fixed'
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'bg-white text-amber-700 border border-amber-300 hover:bg-amber-100'
                        }`}
                      >
                        <span className="material-icons text-sm align-middle mr-1">attach_money</span>
                        Fixed Amount
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType('percentage')}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          discountType === 'percentage'
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'bg-white text-amber-700 border border-amber-300 hover:bg-amber-100'
                        }`}
                      >
                        <span className="material-icons text-sm align-middle mr-1">percent</span>
                        Percentage
                      </button>
                    </div>

                    {/* Discount Value Input */}
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max={discountType === 'percentage' ? 100 : undefined}
                        value={discountValue || ''}
                        onChange={(e) => setDiscountValue(Number(e.target.value))}
                        className="w-full rounded-lg border border-amber-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 bg-white pr-12"
                        placeholder={discountType === 'percentage' ? 'Enter percentage (0-100)' : 'Enter amount'}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-600 font-medium text-sm">
                        {discountType === 'percentage' ? '%' : 'EGP'}
                      </span>
                    </div>

                    {/* Quick Discount Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {discountType === 'percentage' ? (
                        <>
                          <button type="button" onClick={() => setDiscountValue(5)} className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors">5%</button>
                          <button type="button" onClick={() => setDiscountValue(10)} className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors">10%</button>
                          <button type="button" onClick={() => setDiscountValue(15)} className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors">15%</button>
                          <button type="button" onClick={() => setDiscountValue(20)} className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors">20%</button>
                          <button type="button" onClick={() => setDiscountValue(25)} className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors">25%</button>
                          <button type="button" onClick={() => setDiscountValue(50)} className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors">50%</button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => setDiscountValue(10)} className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors">10 EGP</button>
                          <button type="button" onClick={() => setDiscountValue(25)} className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors">25 EGP</button>
                          <button type="button" onClick={() => setDiscountValue(50)} className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors">50 EGP</button>
                          <button type="button" onClick={() => setDiscountValue(100)} className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors">100 EGP</button>
                          <button type="button" onClick={() => setDiscountValue(200)} className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors">200 EGP</button>
                        </>
                      )}
                    </div>

                    {/* Discount Reason */}
                    <div>
                      <input
                        type="text"
                        value={discountReason}
                        onChange={(e) => setDiscountReason(e.target.value)}
                        className="w-full rounded-lg border border-amber-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 bg-white"
                        placeholder="Reason for discount (optional)"
                      />
                    </div>

                    {/* Discount Preview */}
                    {discountValue > 0 && (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-amber-100/50">
                        <span className="text-xs text-amber-700">
                          {discountType === 'percentage' 
                            ? `${discountValue}% off ${formatCurrency(subtotal)}`
                            : 'Fixed discount'
                          }
                        </span>
                        <span className="text-sm font-semibold text-amber-800">
                          -{formatCurrency(calculatedDiscount)}
                        </span>
                      </div>
                    )}

                    {/* Apply Button */}
                    <button
                      type="button"
                      onClick={() => setShowDiscountInput(false)}
                      className="w-full py-2.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <span className="material-icons text-base">check</span>
                      Apply Discount
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    {calculatedDiscount > 0 ? (
                      <button
                        type="button"
                        onClick={() => setShowDiscountInput(true)}
                        className="flex items-center gap-2 text-amber-600 hover:text-amber-800 transition-colors"
                      >
                        <span className="material-icons text-base">discount</span>
                        <span className="text-sm">
                          {discountType === 'percentage' ? `${discountValue}% discount` : 'Discount applied'}
                          {discountReason && <span className="text-madas-text/50 ml-1">({discountReason})</span>}
                        </span>
                        <span className="material-icons text-sm">edit</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowDiscountInput(true)}
                        className="flex items-center gap-1.5 text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        <span className="material-icons text-base">add_circle_outline</span>
                        <span className="text-sm">Add Extra Discount</span>
                      </button>
                    )}
                    <span className={`text-sm ${calculatedDiscount > 0 ? 'text-amber-600 font-medium' : 'text-madas-text'}`}>
                      {calculatedDiscount > 0 ? `-${formatCurrency(calculatedDiscount)}` : formatCurrency(0)}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center py-3 border-t border-gray-200 mt-2">
                <span className="font-semibold text-madas-text">Total</span>
                <span className="font-semibold text-madas-text">{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={togglePaymentStatus}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  paymentStatus === 'paid'
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {paymentStatus === 'paid' ? (
                  <>
                    <span className="material-icons text-base">check_circle</span>
                    Paid
                    <span className="text-xs opacity-70">(click to unpay)</span>
                  </>
                ) : (
                  <>
                    Mark as paid
                    <span className="material-icons text-base">attach_money</span>
                  </>
                )}
              </button>
            </div>
          </section>

          {/* Additional Options (Status, Channel) - for editing */}
          {initialValue?.id && (
            <section className="rounded-xl bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-madas-text mb-4">Order Status</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-madas-text/70 mb-1 block">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as OrderStatus)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt === 'ready_for_pickup' ? 'Ready for Pickup' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-madas-text/70 mb-1 block">Channel</label>
                  <input
                    type="text"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    placeholder="Instagram, Website..."
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            </section>
          )}

          {error && <p className="text-sm text-red-600 px-1">{error}</p>}

          {/* Footer Actions */}
          <footer className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            {initialValue?.id && onDelete ? (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                onClick={() => onDelete()}
                disabled={deleting || submitting}
              >
                {deleting ? (
                  <>
                    <span className="material-icons animate-spin text-base">progress_activity</span>
                    Deleting...
                  </>
                ) : (
                  <>
                    <span className="material-icons text-base">delete</span>
                    Delete
                  </>
                )}
              </button>
            ) : (
              <span />
            )}

            <div className="flex gap-3">
              <button
                type="button"
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-madas-text transition-colors hover:bg-gray-100 disabled:opacity-60"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1f3c19] disabled:opacity-60"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="material-icons animate-spin text-base">progress_activity</span>
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="material-icons text-base">{initialValue?.id ? 'save' : 'add'}</span>
                    {initialValue?.id ? 'Save changes' : 'Create order'}
                  </>
                )}
              </button>
            </div>
          </footer>
        </form>
      </div>

      {/* Product Selection Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-madas-text">Select products</h3>
              <button
                type="button"
                onClick={cancelProductSelection}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <span className="material-icons text-madas-text/60">close</span>
              </button>
            </div>

            {/* Search and Filters */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex gap-3">
                <div className="flex-1 flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5">
                  <span className="material-icons text-madas-text/40 text-xl">search</span>
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search by product name, SKU or barcode"
                    className="flex-1 bg-transparent text-sm focus:outline-none"
                    autoFocus
                  />
                </div>
                <button
                  type="button"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-madas-text hover:bg-gray-50"
                >
                  Filters
                  <span className="material-icons text-lg">tune</span>
                </button>
              </div>
            </div>

            {/* Product List */}
            <div className="flex-1 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <span className="material-icons text-5xl text-madas-text/30 mb-3">inventory_2</span>
                  <p className="text-sm text-madas-text/60">No products found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredProducts.map((product) => {
                    const isSelected = selectedProductsInModal.some(p => p.productId === product.id);
                    const hasDiscount = product.sellingPrice && product.sellingPrice < product.price;
                    const isOutOfStock = product.stock <= 0;
                    
                    return (
                      <div
                        key={product.id}
                        className={`flex items-center gap-4 px-6 py-4 transition-colors ${
                          isOutOfStock ? 'opacity-50 bg-gray-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        {/* Product Image */}
                        <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                          {product.images?.[0] ? (
                            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="material-icons text-gray-400 text-2xl">inventory_2</span>
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-madas-text break-words">{product.displayName}</p>
                          <p className={`text-xs mt-0.5 ${isOutOfStock ? 'text-red-500 font-medium' : 'text-madas-text/60'}`}>
                            {isOutOfStock ? 'Out of stock' : `${product.stock} in stock`}
                          </p>
                        </div>

                        {/* Price */}
                        <div className="text-right flex-shrink-0">
                          {hasDiscount && (
                            <p className="text-xs text-madas-text/50 line-through">
                              {formatCurrency(product.price)}
                            </p>
                          )}
                          <p className="text-sm font-medium text-madas-text">
                            {formatCurrency(product.sellingPrice ?? product.price)}
                          </p>
                        </div>

                        {/* Add Button */}
                        <button
                          type="button"
                          onClick={() => toggleProductInModal(product)}
                          disabled={isOutOfStock}
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                            isOutOfStock
                              ? 'border-2 border-gray-300 text-gray-300 cursor-not-allowed'
                              : isSelected
                                ? 'bg-primary text-white'
                                : 'border-2 border-primary text-primary hover:bg-primary/10'
                          }`}
                        >
                          <span className="material-icons text-xl">
                            {isSelected ? 'check' : 'add'}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={cancelProductSelection}
                className="px-6 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-madas-text hover:bg-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmProductSelection}
                disabled={selectedProductsInModal.length === 0}
                className="px-6 py-2.5 rounded-lg bg-gray-900 text-sm font-medium text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add ({selectedProductsInModal.length}) products
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shipping Options Modal */}
      {showShippingModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h3 className="text-xl font-bold text-madas-text">Select Shipping Region</h3>
              <button
                type="button"
                onClick={() => setShowShippingModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <span className="material-icons text-madas-text/60">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-4 overflow-y-auto flex-1">
              {/* Customer Address Info */}
              {getCustomerGovernorate ? (
                <div className={`mb-4 p-3 rounded-lg ${matchingRegion ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`material-icons text-lg ${matchingRegion ? 'text-green-600' : 'text-orange-600'}`}>
                      {matchingRegion ? 'check_circle' : 'info'}
                    </span>
                    <div>
                      <p className={`text-sm font-medium ${matchingRegion ? 'text-green-700' : 'text-orange-700'}`}>
                        Customer Address: <span className="font-semibold">{getCustomerGovernorate}</span>
                      </p>
                      {matchingRegion ? (
                        <p className="text-xs text-green-600">
                          Matches "{matchingRegion.name}" region - {formatCurrency(matchingRegion.shippingRate)}
                        </p>
                      ) : (
                        <p className="text-xs text-orange-600">
                          No region configured for this area. Use custom rate or configure in Settings.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-madas-text/70 mb-4">
                  {shippingRegions.length > 0 
                    ? 'Select a shipping region or add customer address to auto-detect'
                    : 'No shipping regions configured. You can use custom shipping or configure regions in Settings → Shipping.'
                  }
                </p>
              )}
              
              <div className="space-y-3">
                {/* Auto-detected Region (if matching) */}
                {matchingRegion && (
                  <>
                    <p className="text-xs font-medium text-madas-text/60 uppercase tracking-wide">Recommended</p>
                    <label
                      className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all relative ${
                        selectedRegionId === matchingRegion.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-green-300 bg-green-50/50 hover:border-green-400'
                      }`}
                    >
                      <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                        Best Match
                      </span>
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="shippingRegion"
                          checked={selectedRegionId === matchingRegion.id}
                          onChange={() => setSelectedRegionId(matchingRegion.id)}
                          className="w-5 h-5 text-green-600 border-2 border-gray-300 focus:ring-green-500"
                        />
                        <div>
                          <span className={`text-sm block ${selectedRegionId === matchingRegion.id ? 'text-green-700 font-medium' : 'text-madas-text'}`}>
                            {matchingRegion.name}
                          </span>
                          <span className="text-xs text-green-600">
                            Includes {getCustomerGovernorate}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-green-700">{formatCurrency(matchingRegion.shippingRate)}</span>
                        <span className="text-xs text-green-600 block">{matchingRegion.estimatedDays}</span>
                      </div>
                    </label>
                    
                  </>
                )}

                {/* Divider */}
                {matchingRegion && (
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-white px-3 text-xs text-madas-text/50">Or choose</span>
                    </div>
                  </div>
                )}

                {/* Free Shipping */}
                <label
                  className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedRegionId === 'free'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="shippingRegion"
                      checked={selectedRegionId === 'free'}
                      onChange={() => setSelectedRegionId('free')}
                      className="w-5 h-5 text-green-600 border-2 border-gray-300 focus:ring-green-500"
                    />
                    <div className="flex items-center gap-2">
                      <span className="material-icons text-green-600 text-lg">local_offer</span>
                      <span className={`text-sm ${selectedRegionId === 'free' ? 'text-green-700 font-medium' : 'text-madas-text'}`}>
                        Free Shipping
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-green-600">{formatCurrency(0)}</span>
                </label>

                {/* Custom Rate */}
                <label
                  className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedRegionId === 'custom'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="shippingRegion"
                      checked={selectedRegionId === 'custom'}
                      onChange={() => setSelectedRegionId('custom')}
                      className="w-5 h-5 text-primary border-2 border-gray-300 focus:ring-primary"
                    />
                    <div className="flex items-center gap-2">
                      <span className="material-icons text-madas-text/60 text-lg">edit</span>
                      <span className={`text-sm ${selectedRegionId === 'custom' ? 'text-primary font-medium' : 'text-madas-text'}`}>
                        Custom Rate
                      </span>
                    </div>
                  </div>
                </label>

                {/* Custom shipping fee input */}
                {selectedRegionId === 'custom' && (
                  <div className="ml-8 p-3 rounded-lg bg-gray-50">
                    <label className="text-sm text-madas-text/70 mb-2 block">Enter shipping fee</label>
                    <input
                      type="number"
                      min="0"
                      value={customShippingFee}
                      onChange={(e) => setCustomShippingFee(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="0"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button
                type="button"
                onClick={() => setShowShippingModal(false)}
                className="px-6 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-madas-text hover:bg-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedRegionId}
                onClick={() => {
                  setRequiresDelivery(true);
                  
                  // Set shipping fees based on selected option
                  if (selectedRegionId === 'free') {
                    setShippingFees(0);
                    setSelectedRegionName('Free Shipping');
                  } else if (selectedRegionId === 'custom') {
                    setShippingFees(customShippingFee);
                    setSelectedRegionName('Custom');
                  } else {
                    // Find the selected region
                    const region = shippingRegions.find(r => r.id === selectedRegionId);
                    if (region) {
                      setShippingFees(region.shippingRate);
                      setSelectedRegionName(region.name);
                    } else {
                      setShippingFees(defaultShippingRate);
                      setSelectedRegionName('');
                    }
                  }
                  setShowShippingModal(false);
                }}
                className="px-6 py-2.5 rounded-lg bg-primary text-sm font-medium text-white hover:bg-[#1f3c19] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply Shipping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderModal;
