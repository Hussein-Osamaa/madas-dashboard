/**
 * MADAS API Configuration
 * Automatic environment detection for development vs production
 */

// API Configuration for different environments
const API_CONFIG = {
  production: {
    baseURL: 'https://us-central1-madas-store.cloudfunctions.net/api',
    endpoints: {
      login: '/api/login',
      register: '/api/register',
      sendInvitation: '/api/send-invitation',
      contact: '/api/contact',
      newsletter: '/api/newsletter/subscribe'
    }
  },
  development: {
    baseURL: 'http://localhost:3000',
    endpoints: {
      login: '/api/login',
      register: '/api/register',
      sendInvitation: '/api/send-invitation',
      contact: '/api/contact',
      newsletter: '/api/newsletter/subscribe'
    }
  }
};

// Detect environment based on hostname
const isProduction = window.location.hostname !== 'localhost' &&
                     window.location.hostname !== '127.0.0.1' &&
                     window.location.hostname !== '';

// Select current configuration
const currentConfig = isProduction ? API_CONFIG.production : API_CONFIG.development;

console.log(`🌍 Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
console.log(`🔗 API Base URL: ${currentConfig.baseURL}`);

/**
 * Global API Helper
 * Provides easy access to API endpoints with environment detection
 */
window.API = {
  /**
   * Get full URL for an endpoint
   * @param {string} endpoint - Endpoint name (e.g., 'login', 'register')
   * @returns {string} Full API URL
   */
  getURL: (endpoint) => {
    const endpointPath = currentConfig.endpoints[endpoint] || endpoint;
    return `${currentConfig.baseURL}${endpointPath}`;
  },

  /**
   * Make an API call with automatic URL construction
   * @param {string} endpoint - Endpoint name
   * @param {object} options - Fetch options (method, body, headers, etc.)
   * @returns {Promise<object>} API response as JSON
   */
  async call(endpoint, options = {}) {
    const url = this.getURL(endpoint);
    console.log(`🔗 Calling API: ${url}`);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        credentials: 'include'
      });

      console.log(`📡 Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API error (${response.status}):`, errorText);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ API call successful for ${endpoint}`);
      return data;

    } catch (error) {
      console.error(`❌ API call failed for ${endpoint}:`, error);
      throw error;
    }
  },

  /**
   * Configuration getters
   */
  get baseURL() {
    return currentConfig.baseURL;
  },

  get isProduction() {
    return isProduction;
  },

  get environment() {
    return isProduction ? 'production' : 'development';
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.API;
}

console.log('✅ API Configuration loaded successfully');
