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

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return createErrorResponse(405, 'Method not allowed');
  }

  try {
    const clientIP = event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown';
    
    // Rate limiting for orders requests
    if (!checkRateLimit(clientIP, 'orders', 50, 60 * 1000)) {
      logSecurityEvent(event, 'Rate limit exceeded for orders', { ip: clientIP });
      return createErrorResponse(429, 'Too many requests, please try again later.');
    }

    // Verify JWT token
    const token = event.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return createErrorResponse(401, 'Access token required', 'TOKEN_REQUIRED');
    }

    const decoded = verifyToken(token);
    if (!decoded.success) {
      logSecurityEvent(event, 'Invalid token for orders access', { 
        ip: clientIP,
        error: decoded.error 
      });
      return createErrorResponse(401, 'Invalid access token', 'INVALID_TOKEN');
    }

    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const { 
      status = '', 
      limit = '20', 
      offset = '0',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      adminView = 'false'
    } = queryParams;

    // Check if this is an admin request for all orders
    const isAdminRequest = adminView === 'true';
    const isAdmin = checkAdminRole(decoded.payload);

    if (isAdminRequest && !isAdmin) {
      logSecurityEvent(event, 'Non-admin attempted to access all orders', {
        userId: decoded.payload.id,
        role: decoded.payload.role
      });
      return createErrorResponse(403, 'Admin access required for all orders view', 'ADMIN_REQUIRED');
    }

    // Sanitize inputs
    const sanitizedStatus = sanitizeInput(status.toLowerCase());
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
    const allowedSortFields = ['createdAt', 'updatedAt', 'totalAmount', 'status'];
    const allowedSortOrders = ['asc', 'desc'];
    
    if (!allowedSortFields.includes(sanitizedSortBy)) {
      return createErrorResponse(400, 'Invalid sort field');
    }
    
    if (!allowedSortOrders.includes(sanitizedSortOrder)) {
      return createErrorResponse(400, 'Invalid sort order');
    }

    // Get orders based on access level
    let orders;
    if (isAdminRequest && isAdmin) {
      // Admin gets all orders
      orders = [...mockDB.orders];
    } else {
      // Regular users get only their orders
      orders = mockDB.orders.filter(order => order.userId === decoded.payload.id);
    }

    // Filter by status if specified
    if (sanitizedStatus) {
      const allowedStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
      if (!allowedStatuses.includes(sanitizedStatus)) {
        return createErrorResponse(400, 'Invalid status filter');
      }
      
      orders = orders.filter(order => 
        order.status.toLowerCase() === sanitizedStatus
      );
    }

    // Sort orders
    orders.sort((a, b) => {
      let aValue = a[sanitizedSortBy];
      let bValue = b[sanitizedSortBy];

      // Handle different data types
      if (sanitizedSortBy === 'totalAmount') {
        aValue = parseFloat(aValue);
        bValue = parseFloat(bValue);
      } else if (sanitizedSortBy.includes('At')) {
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
    const totalOrders = orders.length;

    // Apply pagination
    const paginatedOrders = orders.slice(numOffset, numOffset + numLimit);

    // Format orders for response (remove sensitive info for non-admin)
    const formattedOrders = paginatedOrders.map(order => {
      const baseOrder = {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        estimatedDelivery: order.estimatedDelivery,
        trackingNumber: order.trackingNumber,
        paymentStatus: order.paymentStatus,
        itemCount: order.items.length
      };

      // Add detailed info for own orders or admin view
      if (order.userId === decoded.payload.id || isAdmin) {
        baseOrder.items = order.items;
        baseOrder.shippingAddress = order.shippingAddress;
        baseOrder.paymentMethod = order.paymentMethod;
        baseOrder.notes = order.notes;
        baseOrder.subtotal = order.subtotal;
        baseOrder.shippingCost = order.shippingCost;
        
        // Add user info for admin view
        if (isAdmin) {
          const user = mockDB.users.find(u => u.id === order.userId);
          baseOrder.user = user ? {
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.fullName
          } : null;
        }
      }

      return baseOrder;
    });

    // Get statistics
    const stats = {
      total: totalOrders,
      pending: orders.filter(o => o.status === 'pending').length,
      confirmed: orders.filter(o => o.status === 'confirmed').length,
      processing: orders.filter(o => o.status === 'processing').length,
      shipped: orders.filter(o => o.status === 'shipped').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length
    };

    logSecurityEvent(event, 'Orders fetched successfully', {
      userId: decoded.payload.id,
      isAdminRequest,
      totalResults: totalOrders,
      returnedResults: paginatedOrders.length,
      status: sanitizedStatus
    });

    return createResponse(200, {
      message: 'Orders fetched successfully',
      data: {
        orders: formattedOrders,
        pagination: {
          total: totalOrders,
          limit: numLimit,
          offset: numOffset,
          hasMore: (numOffset + numLimit) < totalOrders
        },
        filters: {
          appliedStatus: sanitizedStatus,
          availableStatuses: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']
        },
        sorting: {
          sortBy: sanitizedSortBy,
          sortOrder: sanitizedSortOrder
        },
        statistics: stats
      }
    });

  } catch (error) {
    console.error('Orders fetch error:', error);
    logSecurityEvent(event, 'Orders function error', { error: error.message });
    return createErrorResponse(500, 'Internal server error while fetching orders', 'ORDERS_FETCH_ERROR');
  }
};
