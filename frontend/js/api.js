// HTTP Client dengan retry logic, error handling, dan caching
class APIClient {
  constructor() {
    this.cache = new Map();
    this.requestQueue = new Map();
    this.rateLimitTrackers = new Map();
  }

  // Rate limiting tracker
  checkRateLimit(endpoint) {
    const config = CONFIG.RATE_LIMITS[endpoint];
    if (!config) return true;

    const tracker = this.rateLimitTrackers.get(endpoint) || { attempts: [], windowStart: Date.now() };
    const now = Date.now();

    // Clean old attempts outside the window
    tracker.attempts = tracker.attempts.filter(timestamp => 
      now - timestamp < config.windowMs
    );

    if (tracker.attempts.length >= config.maxAttempts) {
      CONFIG.log('warn', `Rate limit exceeded for ${endpoint}`);
      return false;
    }

    tracker.attempts.push(now);
    this.rateLimitTrackers.set(endpoint, tracker);
    return true;
  }

  // Cache management
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    CONFIG.log('info', `Cache hit for ${key}`);
    return cached.data;
  }

  setCachedData(key, data, ttl) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    CONFIG.log('info', `Cached data for ${key}`);
  }

  // Request with retry logic
  async makeRequest(url, options = {}, retryCount = 0) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 
      options.timeout || CONFIG.TIMEOUT.DEFAULT);

    try {
      CONFIG.log('info', `Making request to ${url}`, { options, attempt: retryCount + 1 });
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...CONFIG.getAuthHeaders(),
          ...options.headers
        }
      });

      clearTimeout(timeoutId);

      // Handle different response statuses
      if (response.ok) {
        const data = await response.json();
        CONFIG.log('info', `Request successful to ${url}`, data);
        return { success: true, data, status: response.status };
      } else {
        const errorData = await response.json().catch(() => ({}));
        CONFIG.log('error', `Request failed to ${url}`, { status: response.status, error: errorData });
        
        // Handle specific error cases
        if (response.status === 401) {
          this.handleAuthError();
          throw new Error(CONFIG.ERROR_MESSAGES.AUTH_ERROR);
        } else if (response.status === 403) {
          throw new Error(CONFIG.ERROR_MESSAGES.FORBIDDEN_ERROR);
        } else if (response.status === 404) {
          throw new Error(CONFIG.ERROR_MESSAGES.NOT_FOUND_ERROR);
        } else if (response.status === 409) {
          throw new Error(CONFIG.ERROR_MESSAGES.CONFLICT_ERROR);
        } else if (response.status === 429) {
          if (retryCount < CONFIG.RETRY.MAX_ATTEMPTS) {
            const delay = CONFIG.RETRY.DELAY * Math.pow(CONFIG.RETRY.BACKOFF, retryCount);
            CONFIG.log('warn', `Rate limited, retrying in ${delay}ms`);
            await this.sleep(delay);
            return this.makeRequest(url, options, retryCount + 1);
          }
          throw new Error(CONFIG.ERROR_MESSAGES.RATE_LIMIT_ERROR);
        } else if (response.status >= 500) {
          if (retryCount < CONFIG.RETRY.MAX_ATTEMPTS) {
            const delay = CONFIG.RETRY.DELAY * Math.pow(CONFIG.RETRY.BACKOFF, retryCount);
            CONFIG.log('warn', `Server error, retrying in ${delay}ms`);
            await this.sleep(delay);
            return this.makeRequest(url, options, retryCount + 1);
          }
          throw new Error(CONFIG.ERROR_MESSAGES.SERVER_ERROR);
        } else {
          throw new Error(errorData.message || CONFIG.ERROR_MESSAGES.GENERIC_ERROR);
        }
      }
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        CONFIG.log('error', `Request timeout for ${url}`);
        throw new Error(CONFIG.ERROR_MESSAGES.TIMEOUT_ERROR);
      } else if (error.message.includes('fetch')) {
        CONFIG.log('error', `Network error for ${url}`, error);
        throw new Error(CONFIG.ERROR_MESSAGES.NETWORK_ERROR);
      } else {
        CONFIG.log('error', `Request error for ${url}`, error);
        throw error;
      }
    }
  }

  // Handle authentication errors
  handleAuthError() {
    localStorage.removeItem(CONFIG.SECURITY.TOKEN_KEY);
    // Redirect to login page if not already there
    if (!window.location.pathname.includes('login.html')) {
      window.location.href = 'login.html';
    }
  }

  // Sleep utility for retry delays
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // API Methods
  
  // Authentication
  async login(email, password) {
    if (!this.checkRateLimit('LOGIN')) {
      throw new Error(CONFIG.ERROR_MESSAGES.RATE_LIMIT_ERROR);
    }

    const url = CONFIG.buildApiUrl('LOGIN');
    const result = await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      timeout: CONFIG.TIMEOUT.AUTH
    });

    if (result.success && result.data.token) {
      localStorage.setItem(CONFIG.SECURITY.TOKEN_KEY, result.data.token);
      this.setCachedData('currentUser', result.data.user, CONFIG.CACHE.USER_TTL);
    }

    return result;
  }

  async register(userData) {
    if (!this.checkRateLimit('REGISTER')) {
      throw new Error(CONFIG.ERROR_MESSAGES.RATE_LIMIT_ERROR);
    }

    const url = CONFIG.buildApiUrl('REGISTER');
    return await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(userData),
      timeout: CONFIG.TIMEOUT.AUTH
    });
  }

  // Products
  async getProducts(params = {}) {
    if (!this.checkRateLimit('PRODUCTS')) {
      throw new Error(CONFIG.ERROR_MESSAGES.RATE_LIMIT_ERROR);
    }

    const cacheKey = `products_${JSON.stringify(params)}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return { success: true, data: cached };

    const queryString = new URLSearchParams(params).toString();
    const url = CONFIG.buildApiUrl('PRODUCTS') + (queryString ? `?${queryString}` : '');
    
    const result = await this.makeRequest(url);
    
    if (result.success) {
      this.setCachedData(cacheKey, result.data, CONFIG.CACHE.PRODUCTS_TTL);
    }
    
    return result;
  }

  async createProduct(productData) {
    const url = CONFIG.buildApiUrl('PRODUCTS_CREATE');
    const result = await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(productData),
      timeout: CONFIG.TIMEOUT.UPLOAD
    });

    // Invalidate products cache
    this.clearCacheByPattern('products_');
    
    return result;
  }

  async updateProduct(productId, updateData) {
    const url = CONFIG.buildApiUrl('PRODUCTS_MANAGE') + `/${productId}`;
    const result = await this.makeRequest(url, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });

    // Invalidate products cache
    this.clearCacheByPattern('products_');
    
    return result;
  }

  async deleteProduct(productId) {
    const url = CONFIG.buildApiUrl('PRODUCTS_MANAGE') + `/${productId}`;
    const result = await this.makeRequest(url, {
      method: 'DELETE'
    });

    // Invalidate products cache
    this.clearCacheByPattern('products_');
    
    return result;
  }

  // Orders
  async createOrder(orderData) {
    if (!this.checkRateLimit('ORDERS')) {
      throw new Error(CONFIG.ERROR_MESSAGES.RATE_LIMIT_ERROR);
    }

    const url = CONFIG.buildApiUrl('ORDERS_CREATE');
    const result = await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(orderData)
    });

    // Invalidate orders cache
    this.clearCacheByPattern('orders_');
    
    return result;
  }

  async getOrders(params = {}) {
    if (!this.checkRateLimit('ORDERS')) {
      throw new Error(CONFIG.ERROR_MESSAGES.RATE_LIMIT_ERROR);
    }

    const cacheKey = `orders_${JSON.stringify(params)}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return { success: true, data: cached };

    const queryString = new URLSearchParams(params).toString();
    const url = CONFIG.buildApiUrl('ORDERS') + (queryString ? `?${queryString}` : '');
    
    const result = await this.makeRequest(url);
    
    if (result.success) {
      this.setCachedData(cacheKey, result.data, CONFIG.CACHE.ORDERS_TTL);
    }
    
    return result;
  }

  async updateOrder(orderId, updateData) {
    const url = CONFIG.buildApiUrl('ORDERS_MANAGE') + `/${orderId}`;
    const result = await this.makeRequest(url, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });

    // Invalidate orders cache
    this.clearCacheByPattern('orders_');
    
    return result;
  }

  // Cache utilities
  clearCacheByPattern(pattern) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
    CONFIG.log('info', `Cleared cache entries: ${keysToDelete.length}`);
  }

  clearAllCache() {
    this.cache.clear();
    CONFIG.log('info', 'Cleared all cache');
  }

  // Get current user from cache or token
  getCurrentUser() {
    const cached = this.getCachedData('currentUser');
    if (cached) return cached;

    const token = localStorage.getItem(CONFIG.SECURITY.TOKEN_KEY);
    if (!token) return null;

    try {
      // Decode JWT payload (simple base64 decode - not secure verification)
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        id: payload.id,
        username: payload.username,
        email: payload.email,
        role: payload.role
      };
    } catch (error) {
      CONFIG.log('error', 'Failed to decode token', error);
      return null;
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    const token = localStorage.getItem(CONFIG.SECURITY.TOKEN_KEY);
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now(); // Check if token is not expired
    } catch (error) {
      return false;
    }
  }

  // Logout
  logout() {
    localStorage.removeItem(CONFIG.SECURITY.TOKEN_KEY);
    this.clearAllCache();
    window.location.href = 'index.html';
  }
}

// Create global API client instance
window.API = new APIClient();

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = APIClient;
}
