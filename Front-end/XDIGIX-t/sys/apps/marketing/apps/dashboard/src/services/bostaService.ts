/**
 * Bosta Shipping API Service
 * API Documentation: https://bosta.co
 * 
 * Uses Firebase Cloud Functions as a proxy to avoid CORS issues.
 * The proxy endpoints are:
 * - POST /api/bosta/deliveries - Create a delivery
 * - GET /api/bosta/cities - Get cities list
 * - GET /api/bosta/deliveries/:trackingNumber - Track a delivery
 */

interface BostaConfig {
  apiKey: string;
  businessId?: string;
  countryId?: string;
  testMode?: boolean;
  defaultPickupLocationId?: string;
}

interface BostaAddress {
  firstLine: string;
  secondLine?: string;
  floor?: string;
  apartment?: string;
  city: {
    _id: string;
    name: string;
  };
  district?: string;
  zone?: string;
}

interface BostaReceiver {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
}

interface BostaDeliverySpecs {
  packageType?: string;
  size?: string;
  packageDetails?: {
    itemsCount: number;
    description: string;
  };
}

interface BostaDeliveryRequest {
  type: number; // 10 = SEND, 25 = CASH_COLLECTION, 30 = CUSTOMER_RETURN_PICKUP
  specs?: BostaDeliverySpecs;
  notes?: string;
  cod?: number; // Cash on delivery amount
  dropOffAddress: BostaAddress;
  receiver: BostaReceiver;
  businessReference?: string;
  webhookUrl?: string;
  pickupLocationId?: string;
}

interface BostaDeliveryResponse {
  success: boolean;
  message: string;
  data?: {
    _id: string;
    trackingNumber: string;
    state: {
      value: number;
      code: string;
    };
    createdAt: string;
  };
}

interface OrderData {
  id: string;
  customerName?: string;
  customerContact?: string;
  customerEmail?: string;
  total?: number;
  codAmount?: number; // Actual COD amount (could be just shipping if prepaid)
  shippingFees?: number;
  allowOpenPackage?: boolean;
  paymentStatus?: string;
  notes?: string;
  shippingAddress?: {
    address?: string;
    city?: string;
    district?: string;
    floor?: string;
    apartment?: string;
    building?: string;
  };
  items?: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }>;
}

// Egypt city IDs (common cities)
export const EGYPT_CITIES: Record<string, string> = {
  'cairo': 'FceDyHXwpSYYF9zGW',
  'giza': 'bW5rG8FXAcPkK3Lc7',
  'alexandria': 'tLYbsRHV8M7JQz9dW',
  'sharm el sheikh': 'vN3xYkRp9HdTmL2Qf',
  'hurghada': 'mK7wZnXc4BqPjF6Rs',
  'luxor': 'hJ2vTyNm8CdWkL9Pb',
  'aswan': 'qR5xMnKp3FhYtD7Wc'
};

// Firebase Cloud Function proxy URL (includes /api prefix for Express routes)
const PROXY_BASE_URL = 'https://api-erl4dkfzua-uc.a.run.app/api';

// Direct Bosta API URL (for testing only)
const BOSTA_BASE_URL = 'https://app.bosta.co/api/v2';

/**
 * Test if an API key is valid using the Cloud Function proxy
 */
export const testBostaApiKey = async (apiKey: string): Promise<{ valid: boolean; message: string }> => {
  try {
    const cleanKey = apiKey.trim().replace(/^Bearer\s+/i, '');
    
    // Use proxy to test API key - fetch cities list
    const response = await fetch(
      `${PROXY_BASE_URL}/bosta/cities?apiKey=${encodeURIComponent(cleanKey)}&countryId=60e4482c7cb7d4bc4849c4d5`,
      { method: 'GET' }
    );

    const data = await response.json();

    if (response.ok && data.success) {
      return { 
        valid: true, 
        message: 'API key is valid! You can now send deliveries to Bosta.' 
      };
    } else if (response.status === 401 || data.message?.includes('Invalid')) {
      return { valid: false, message: 'Invalid API key. Please get a new key from your Bosta dashboard.' };
    } else {
      return { valid: false, message: data.message || `API error: ${response.status}` };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    if (errorMsg.includes('Failed to fetch')) {
      return { 
        valid: false, 
        message: 'Cannot connect to server. Please check your internet connection.' 
      };
    }
    return { valid: false, message: `Connection error: ${errorMsg}` };
  }
};

/**
 * Create a delivery in Bosta using Firebase Cloud Function proxy
 */
export const createBostaDelivery = async (
  config: BostaConfig,
  order: OrderData
): Promise<BostaDeliveryResponse> => {
  if (!config.apiKey) {
    throw new Error('Bosta API key is required');
  }

  // Parse customer name
  const nameParts = (order.customerName || 'Customer').split(' ');
  const firstName = nameParts[0] || 'Customer';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Determine city ID
  const cityName = order.shippingAddress?.city?.toLowerCase() || 'cairo';
  const cityId = EGYPT_CITIES[cityName] || EGYPT_CITIES['cairo'];

  // Build address details
  const addressParts: string[] = [];
  if (order.shippingAddress?.address) addressParts.push(order.shippingAddress.address);
  if (order.shippingAddress?.building) addressParts.push(`Building: ${order.shippingAddress.building}`);
  
  const secondLineParts: string[] = [];
  if (order.shippingAddress?.district) secondLineParts.push(order.shippingAddress.district);
  if (order.shippingAddress?.building) secondLineParts.push(`Bldg ${order.shippingAddress.building}`);

  // Calculate COD amount:
  // - If order has codAmount set, use it (could be just shipping fees if prepaid)
  // - Otherwise use the full total
  const codAmount = order.codAmount ?? order.total ?? 0;
  
  // Build notes with payment info
  const noteParts: string[] = [];
  if (order.notes) noteParts.push(order.notes);
  noteParts.push(`Order #${order.id.slice(-6)}`);
  if (order.paymentStatus === 'paid') {
    noteParts.push(`PREPAID - Collect shipping only: ${order.shippingFees || 0}`);
  }

  // Build delivery request
  const deliveryRequest: BostaDeliveryRequest & { allowToOpenPackage?: boolean } = {
    type: 10, // SEND delivery type
    specs: {
      packageType: 'Parcel',
      size: 'MEDIUM',
      packageDetails: {
        itemsCount: order.items?.reduce((sum, item) => sum + item.quantity, 0) || 1,
        description: order.items?.map(i => `${i.name} x${i.quantity}`).join(', ') || 'Order items'
      }
    },
    notes: noteParts.join(' | '),
    cod: codAmount, // Cash on delivery amount (full total or just shipping if prepaid)
    allowToOpenPackage: order.allowOpenPackage ?? true, // Allow customer to inspect package
    dropOffAddress: {
      firstLine: addressParts.join(', ') || 'Address not provided',
      secondLine: secondLineParts.join(', ') || '',
      floor: order.shippingAddress?.floor || '',
      apartment: order.shippingAddress?.apartment || '',
      city: {
        _id: cityId,
        name: order.shippingAddress?.city || 'Cairo'
      },
      district: order.shippingAddress?.district || ''
    },
    receiver: {
      firstName,
      lastName,
      phone: order.customerContact || '',
      email: order.customerEmail
    },
    businessReference: order.id
  };

  // Add pickup location if configured
  if (config.defaultPickupLocationId) {
    deliveryRequest.pickupLocationId = config.defaultPickupLocationId;
  }

  const cleanKey = config.apiKey.trim().replace(/^Bearer\s+/i, '');
  
  console.log('[BostaService] Creating delivery for order:', order.id);
  console.log('[BostaService] Request payload:', JSON.stringify(deliveryRequest, null, 2));

  try {
    // Use Firebase Cloud Function proxy to avoid CORS issues
    console.log('[BostaService] Using Cloud Function proxy...');
    
    const response = await fetch(`${PROXY_BASE_URL}/bosta/deliveries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        apiKey: cleanKey,
        deliveryData: deliveryRequest
      })
    });

    const data = await response.json();
    console.log('[BostaService] Proxy response:', data);

    if (!response.ok || !data.success) {
      console.error('[BostaService] Proxy Error Response:', data);
      
      // Handle specific error cases
      if (response.status === 401 || data.message?.includes('Invalid')) {
        throw new Error('Invalid API key. Please check your Bosta API key in Settings > Shipping > Bosta.');
      }
      if (response.status === 403) {
        throw new Error('Access forbidden. Your API key may not have permission to create deliveries.');
      }
      if (response.status === 400) {
        throw new Error(`Invalid request: ${data.message || 'Check order data'}`);
      }
      
      throw new Error(data.message || `Bosta API error: ${response.status}`);
    }

    return {
      success: true,
      message: data.message || 'Delivery created successfully',
      data: data.data
    };
  } catch (error) {
    console.error('[BostaService] Error creating delivery via proxy:', error);
    
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error(
        'Cannot connect to server. Please check your internet connection and try again.'
      );
    }
    
    throw error;
  }
};

/**
 * Get tracking information for a delivery using Cloud Function proxy
 */
export const getBostaTracking = async (
  apiKey: string,
  trackingNumber: string
): Promise<any> => {
  try {
    const cleanKey = apiKey.replace(/^Bearer\s+/i, '').trim();
    
    const response = await fetch(
      `${PROXY_BASE_URL}/bosta/deliveries/${trackingNumber}?apiKey=${encodeURIComponent(cleanKey)}`,
      { method: 'GET' }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      if (response.status === 401 || data.message?.includes('Invalid')) {
        throw new Error('Invalid API key. Please check your Bosta API key.');
      }
      throw new Error(data.message || `Bosta API error: ${response.status}`);
    }

    return data.data;
  } catch (error) {
    console.error('[BostaService] Error getting tracking:', error);
    throw error;
  }
};

/**
 * Get list of cities for a country using Cloud Function proxy
 */
export const getBostaCities = async (
  apiKey: string,
  countryId: string = '60e4482c7cb7d4bc4849c4d5' // Egypt by default
): Promise<any> => {
  try {
    const cleanKey = apiKey.replace(/^Bearer\s+/i, '').trim();
    
    const response = await fetch(
      `${PROXY_BASE_URL}/bosta/cities?apiKey=${encodeURIComponent(cleanKey)}&countryId=${countryId}`,
      { method: 'GET' }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      if (response.status === 401 || data.message?.includes('Invalid')) {
        throw new Error('Invalid API key. Please check your Bosta API key.');
      }
      throw new Error(data.message || `Bosta API error: ${response.status}`);
    }

    return data.data;
  } catch (error) {
    console.error('[BostaService] Error getting cities:', error);
    throw error;
  }
};

export default {
  createBostaDelivery,
  getBostaTracking,
  getBostaCities
};

