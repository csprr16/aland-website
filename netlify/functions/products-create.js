const {
  handleCORS,
  checkRateLimit,
  sanitizeInput,
  createResponse,
  createErrorResponse,
  logSecurityEvent,
  verifyToken,
  checkAdminRole,
  mockDB
} = require('./utils');

exports.handler = async (event, context) => {
  // Handle CORS preflight
  const corsResponse = handleCORS(event);
  if (corsResponse) return corsResponse;

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return createErrorResponse(405, 'Method not allowed');
  }

  try {
    const clientIP = event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown';
    
    // Rate limiting for product creation
    if (!checkRateLimit(clientIP, 'product-create', 10, 60 * 60 * 1000)) {
      logSecurityEvent(event, 'Rate limit exceeded for product creation', { ip: clientIP });
      return createErrorResponse(429, 'Too many product creation attempts, please try again later.');
    }

    // Verify JWT token
    const token = event.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return createErrorResponse(401, 'Access token required', 'TOKEN_REQUIRED');
    }

    const decoded = verifyToken(token);
    if (!decoded.success) {
      logSecurityEvent(event, 'Invalid token for product creation', { 
        ip: clientIP,
        error: decoded.error 
      });
      return createErrorResponse(401, 'Invalid access token', 'INVALID_TOKEN');
    }

    // Check admin role
    if (!checkAdminRole(decoded.payload)) {
      logSecurityEvent(event, 'Non-admin attempted product creation', {
        userId: decoded.payload.id,
        role: decoded.payload.role
      });
      return createErrorResponse(403, 'Admin access required', 'ADMIN_REQUIRED');
    }

    // Parse request body
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (error) {
      return createErrorResponse(400, 'Invalid JSON body');
    }

    const { name, description, price, category, image, stock = 0 } = body;

    // Validation
    if (!name || !description || !price || !category) {
      return createErrorResponse(400, 'Required fields: name, description, price, category');
    }

    // Sanitize inputs
    const sanitizedName = sanitizeInput(name);
    const sanitizedDescription = sanitizeInput(description);
    const sanitizedCategory = sanitizeInput(category);
    const sanitizedImage = sanitizeInput(image || '');

    // Validate lengths
    if (sanitizedName.length < 2 || sanitizedName.length > 100) {
      return createErrorResponse(400, 'Product name must be between 2-100 characters');
    }

    if (sanitizedDescription.length < 10 || sanitizedDescription.length > 500) {
      return createErrorResponse(400, 'Product description must be between 10-500 characters');
    }

    if (sanitizedCategory.length < 2 || sanitizedCategory.length > 50) {
      return createErrorResponse(400, 'Category must be between 2-50 characters');
    }

    // Validate price
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      return createErrorResponse(400, 'Price must be a valid positive number');
    }

    // Validate stock
    const numStock = parseInt(stock);
    if (isNaN(numStock) || numStock < 0) {
      return createErrorResponse(400, 'Stock must be a valid non-negative number');
    }

    // Check for duplicate product name
    const existingProduct = mockDB.products.find(
      p => p.name.toLowerCase() === sanitizedName.toLowerCase()
    );

    if (existingProduct) {
      logSecurityEvent(event, 'Attempt to create duplicate product', {
        adminId: decoded.payload.id,
        productName: sanitizedName
      });
      return createErrorResponse(409, 'Product with this name already exists', 'PRODUCT_EXISTS');
    }

    // Create new product
    const newProduct = {
      id: mockDB.products.length + 1,
      name: sanitizedName,
      description: sanitizedDescription,
      price: numPrice,
      category: sanitizedCategory,
      image: sanitizedImage || `https://picsum.photos/400/300?random=${Date.now()}`,
      stock: numStock,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: decoded.payload.id,
      isActive: true,
      rating: 0,
      reviewCount: 0
    };

    // Add product to mock database
    mockDB.products.push(newProduct);

    logSecurityEvent(event, 'New product created successfully', {
      adminId: decoded.payload.id,
      productId: newProduct.id,
      productName: newProduct.name,
      category: newProduct.category,
      price: newProduct.price
    });

    return createResponse(201, {
      message: 'Product created successfully',
      data: {
        product: newProduct
      }
    });

  } catch (error) {
    console.error('Product creation error:', error);
    logSecurityEvent(event, 'Product creation function error', { error: error.message });
    return createErrorResponse(500, 'Internal server error during product creation', 'PRODUCT_CREATE_ERROR');
  }
};
