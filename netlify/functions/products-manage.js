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

  // Only allow PUT and DELETE requests
  if (!['PUT', 'DELETE'].includes(event.httpMethod)) {
    return createErrorResponse(405, 'Method not allowed');
  }

  try {
    const clientIP = event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown';
    
    // Rate limiting for product management
    if (!checkRateLimit(clientIP, 'product-manage', 20, 60 * 60 * 1000)) {
      logSecurityEvent(event, 'Rate limit exceeded for product management', { ip: clientIP });
      return createErrorResponse(429, 'Too many product management requests, please try again later.');
    }

    // Verify JWT token
    const token = event.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return createErrorResponse(401, 'Access token required', 'TOKEN_REQUIRED');
    }

    const decoded = verifyToken(token);
    if (!decoded.success) {
      logSecurityEvent(event, 'Invalid token for product management', { 
        ip: clientIP,
        error: decoded.error 
      });
      return createErrorResponse(401, 'Invalid access token', 'INVALID_TOKEN');
    }

    // Check admin role
    if (!checkAdminRole(decoded.payload)) {
      logSecurityEvent(event, 'Non-admin attempted product management', {
        userId: decoded.payload.id,
        role: decoded.payload.role,
        method: event.httpMethod
      });
      return createErrorResponse(403, 'Admin access required', 'ADMIN_REQUIRED');
    }

    // Extract product ID from path
    const pathSegments = event.path.split('/');
    const productId = pathSegments[pathSegments.length - 1];
    
    if (!productId || isNaN(parseInt(productId))) {
      return createErrorResponse(400, 'Valid product ID required');
    }

    const numProductId = parseInt(productId);

    // Find existing product
    const productIndex = mockDB.products.findIndex(p => p.id === numProductId);
    
    if (productIndex === -1) {
      logSecurityEvent(event, 'Attempt to manage non-existent product', {
        adminId: decoded.payload.id,
        productId: numProductId,
        method: event.httpMethod
      });
      return createErrorResponse(404, 'Product not found', 'PRODUCT_NOT_FOUND');
    }

    const existingProduct = mockDB.products[productIndex];

    if (event.httpMethod === 'DELETE') {
      // Delete product
      mockDB.products.splice(productIndex, 1);

      logSecurityEvent(event, 'Product deleted successfully', {
        adminId: decoded.payload.id,
        productId: numProductId,
        productName: existingProduct.name
      });

      return createResponse(200, {
        message: 'Product deleted successfully',
        data: {
          deletedProduct: {
            id: existingProduct.id,
            name: existingProduct.name
          }
        }
      });
    }

    if (event.httpMethod === 'PUT') {
      // Update product
      let body;
      try {
        body = JSON.parse(event.body);
      } catch (error) {
        return createErrorResponse(400, 'Invalid JSON body');
      }

      const { name, description, price, category, image, stock, isActive } = body;

      // Create updated product object
      const updatedProduct = { ...existingProduct };
      let hasChanges = false;

      // Update fields if provided
      if (name !== undefined) {
        const sanitizedName = sanitizeInput(name);
        if (sanitizedName.length < 2 || sanitizedName.length > 100) {
          return createErrorResponse(400, 'Product name must be between 2-100 characters');
        }
        
        // Check for duplicate name (excluding current product)
        const duplicateName = mockDB.products.find(
          p => p.id !== numProductId && p.name.toLowerCase() === sanitizedName.toLowerCase()
        );
        
        if (duplicateName) {
          return createErrorResponse(409, 'Product with this name already exists', 'PRODUCT_NAME_EXISTS');
        }
        
        updatedProduct.name = sanitizedName;
        hasChanges = true;
      }

      if (description !== undefined) {
        const sanitizedDescription = sanitizeInput(description);
        if (sanitizedDescription.length < 10 || sanitizedDescription.length > 500) {
          return createErrorResponse(400, 'Product description must be between 10-500 characters');
        }
        updatedProduct.description = sanitizedDescription;
        hasChanges = true;
      }

      if (price !== undefined) {
        const numPrice = parseFloat(price);
        if (isNaN(numPrice) || numPrice < 0) {
          return createErrorResponse(400, 'Price must be a valid positive number');
        }
        updatedProduct.price = numPrice;
        hasChanges = true;
      }

      if (category !== undefined) {
        const sanitizedCategory = sanitizeInput(category);
        if (sanitizedCategory.length < 2 || sanitizedCategory.length > 50) {
          return createErrorResponse(400, 'Category must be between 2-50 characters');
        }
        updatedProduct.category = sanitizedCategory;
        hasChanges = true;
      }

      if (image !== undefined) {
        updatedProduct.image = sanitizeInput(image) || updatedProduct.image;
        hasChanges = true;
      }

      if (stock !== undefined) {
        const numStock = parseInt(stock);
        if (isNaN(numStock) || numStock < 0) {
          return createErrorResponse(400, 'Stock must be a valid non-negative number');
        }
        updatedProduct.stock = numStock;
        hasChanges = true;
      }

      if (isActive !== undefined) {
        updatedProduct.isActive = Boolean(isActive);
        hasChanges = true;
      }

      if (!hasChanges) {
        return createErrorResponse(400, 'No valid fields provided for update');
      }

      // Update timestamp
      updatedProduct.updatedAt = new Date().toISOString();

      // Save updated product
      mockDB.products[productIndex] = updatedProduct;

      logSecurityEvent(event, 'Product updated successfully', {
        adminId: decoded.payload.id,
        productId: numProductId,
        productName: updatedProduct.name,
        changes: Object.keys(body).filter(key => body[key] !== undefined)
      });

      return createResponse(200, {
        message: 'Product updated successfully',
        data: {
          product: updatedProduct
        }
      });
    }

  } catch (error) {
    console.error('Product management error:', error);
    logSecurityEvent(event, 'Product management function error', { 
      error: error.message,
      method: event.httpMethod 
    });
    return createErrorResponse(500, 'Internal server error during product management', 'PRODUCT_MANAGE_ERROR');
  }
};
