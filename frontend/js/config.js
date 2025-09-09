// API Configuration untuk Production dan Development
const CONFIG = {
  // Environment detection
  ENV: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'development' 
    : 'production',
  
  // API Base URLs
  API_BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'  // Development: Express server
    : '/.netlify/functions',        // Production: Netlify functions
  
  // API Endpoints
  ENDPOINTS: {
    // Authentication
    LOGIN: '/login',
    REGISTER: '/register',
    
    // Products
    PRODUCTS: '/products',
    PRODUCTS_CREATE: '/products-create',
    PRODUCTS_MANAGE: '/products-manage',
    
    // Orders
    ORDERS: '/orders',
    ORDERS_CREATE: '/orders-create',
    ORDERS_MANAGE: '/orders-manage'
  },
  
  // Request timeout settings
  TIMEOUT: {
    DEFAULT: 10000,    // 10 seconds
    UPLOAD: 30000,     // 30 seconds for file uploads
    AUTH: 15000        // 15 seconds for auth requests
  },
  
  // Retry configuration
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY: 1000,       // Initial delay in ms
    BACKOFF: 2         // Exponential backoff multiplier
  },
  
  // Rate limiting hints (for client-side throttling)
  RATE_LIMITS: {
    LOGIN: { maxAttempts: 5, windowMs: 15 * 60 * 1000 },      // 5 per 15 min
    REGISTER: { maxAttempts: 3, windowMs: 60 * 60 * 1000 },   // 3 per hour
    PRODUCTS: { maxAttempts: 100, windowMs: 60 * 1000 },      // 100 per min
    ORDERS: { maxAttempts: 50, windowMs: 60 * 1000 }          // 50 per min
  },
  
  // Security settings
  SECURITY: {
    TOKEN_KEY: 'auth_token',
    TOKEN_PREFIX: 'Bearer ',
    CSRF_HEADER: 'X-CSRF-Token',
    CONTENT_TYPE: 'application/json'
  },
  
  // UI Configuration
  UI: {
    ITEMS_PER_PAGE: 20,
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    NOTIFICATION_DURATION: 5000,      // 5 seconds
    LOADING_DELAY: 300               // Delay before showing loading spinner
  },
  
  // Cache settings
  CACHE: {
    PRODUCTS_TTL: 5 * 60 * 1000,     // 5 minutes
    USER_TTL: 15 * 60 * 1000,        // 15 minutes
    ORDERS_TTL: 2 * 60 * 1000        // 2 minutes
  }
};

// Utility function to build full API URL
CONFIG.buildApiUrl = function(endpoint, pathParams = {}) {
  let url = this.API_BASE_URL + this.ENDPOINTS[endpoint];
  
  // Replace path parameters (e.g., :id)
  Object.keys(pathParams).forEach(key => {
    url = url.replace(`:${key}`, pathParams[key]);
  });
  
  return url;
};

// Utility function to get auth headers
CONFIG.getAuthHeaders = function() {
  const token = localStorage.getItem(this.SECURITY.TOKEN_KEY);
  const headers = {
    'Content-Type': this.SECURITY.CONTENT_TYPE,
    'Accept': this.SECURITY.CONTENT_TYPE
  };
  
  if (token) {
    headers['Authorization'] = this.SECURITY.TOKEN_PREFIX + token;
  }
  
  return headers;
};

// Utility function for environment-specific logging
CONFIG.log = function(level, message, data = null) {
  if (this.ENV === 'development') {
    console[level](`[${new Date().toISOString()}] ${message}`, data || '');
  }
};

// Error handling configuration
CONFIG.ERROR_MESSAGES = {
  NETWORK_ERROR: 'Koneksi bermasalah. Silakan cek koneksi internet Anda.',
  TIMEOUT_ERROR: 'Request timeout. Silakan coba lagi.',
  SERVER_ERROR: 'Terjadi kesalahan server. Silakan coba lagi nanti.',
  AUTH_ERROR: 'Sesi Anda telah berakhir. Silakan login kembali.',
  VALIDATION_ERROR: 'Data yang dimasukkan tidak valid.',
  RATE_LIMIT_ERROR: 'Terlalu banyak request. Silakan tunggu sebentar.',
  NOT_FOUND_ERROR: 'Data yang dicari tidak ditemukan.',
  FORBIDDEN_ERROR: 'Anda tidak memiliki akses untuk operasi ini.',
  CONFLICT_ERROR: 'Data sudah ada atau terjadi konflik.',
  GENERIC_ERROR: 'Terjadi kesalahan. Silakan coba lagi.'
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}
