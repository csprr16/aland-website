const {
  handleCORS,
  checkRateLimit,
  sanitizeInput,
  createResponse,
  createErrorResponse,
  logSecurityEvent,
  mockDB
} = require('./utils');

exports.handler = async (event, context) => {
  // Handle CORS preflight
  const corsResponse = handleCORS(event);
  if (corsResponse) return corsResponse;

  // Only allow GET requests for this endpoint
  if (event.httpMethod !== 'GET') {
    return createErrorResponse(405, 'Method not allowed');
  }

  try {
    const clientIP = event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown';
    
    // Rate limiting for products requests
    if (!checkRateLimit(clientIP, 'products', 100, 60 * 1000)) {
      logSecurityEvent(event, 'Rate limit exceeded for products', { ip: clientIP });
      return createErrorResponse(429, 'Too many requests, please try again later.');
    }

    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const { 
      category = '', 
      search = '', 
      limit = '20', 
      offset = '0',
      sortBy = 'name',
      sortOrder = 'asc'
    } = queryParams;

    // Sanitize inputs
    const sanitizedCategory = sanitizeInput(category.toLowerCase());
    const sanitizedSearch = sanitizeInput(search.toLowerCase());
    const sanitizedSortBy = sanitizeInput(sortBy.toLowerCase());
    const sanitizedSortOrder = sanitizeInput(sortOrder.toLowerCase());

    // Validate numeric parameters
    let numLimit, numOffset;
    try {
      numLimit = Math.max(1, Math.min(100, parseInt(limit) || 20));
      numOffset = Math.max(0, parseInt(offset) || 0);
    } catch (error) {
      return createErrorResponse(400, 'Invalid numeric parameters');
    }

    // Validate sort parameters
    const allowedSortFields = ['name', 'price', 'category', 'createdAt'];
    const allowedSortOrders = ['asc', 'desc'];
    
    if (!allowedSortFields.includes(sanitizedSortBy)) {
      return createErrorResponse(400, 'Invalid sort field');
    }
    
    if (!allowedSortOrders.includes(sanitizedSortOrder)) {
      return createErrorResponse(400, 'Invalid sort order');
    }

    // Get all products
    let products = [...mockDB.products];

    // Filter by category if specified
    if (sanitizedCategory) {
      products = products.filter(product => 
        product.category.toLowerCase().includes(sanitizedCategory)
      );
    }

    // Filter by search term if specified
    if (sanitizedSearch) {
      products = products.filter(product =>
        product.name.toLowerCase().includes(sanitizedSearch) ||
        product.description.toLowerCase().includes(sanitizedSearch) ||
        product.category.toLowerCase().includes(sanitizedSearch)
      );
    }

    // Sort products
    products.sort((a, b) => {
      let aValue = a[sanitizedSortBy];
      let bValue = b[sanitizedSortBy];

      // Handle different data types
      if (sanitizedSortBy === 'price') {
        aValue = parseFloat(aValue);
        bValue = parseFloat(bValue);
      } else if (sanitizedSortBy === 'createdAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else {
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
      }

      if (sanitizedSortOrder === 'desc') {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });

    // Get total count before pagination
    const totalProducts = products.length;

    // Apply pagination
    const paginatedProducts = products.slice(numOffset, numOffset + numLimit);

    // Get unique categories for filter options
    const categories = [...new Set(mockDB.products.map(p => p.category))].sort();

    logSecurityEvent(event, 'Products fetched successfully', {
      totalResults: totalProducts,
      returnedResults: paginatedProducts.length,
      category: sanitizedCategory,
      search: sanitizedSearch
    });

    return createResponse(200, {
      message: 'Products fetched successfully',
      data: {
        products: paginatedProducts,
        pagination: {
          total: totalProducts,
          limit: numLimit,
          offset: numOffset,
          hasMore: (numOffset + numLimit) < totalProducts
        },
        filters: {
          categories: categories,
          appliedCategory: sanitizedCategory,
          appliedSearch: sanitizedSearch
        },
        sorting: {
          sortBy: sanitizedSortBy,
          sortOrder: sanitizedSortOrder
        }
      }
    });

  } catch (error) {
    console.error('Products fetch error:', error);
    logSecurityEvent(event, 'Products function error', { error: error.message });
    return createErrorResponse(500, 'Internal server error while fetching products', 'PRODUCTS_FETCH_ERROR');
  }
};
