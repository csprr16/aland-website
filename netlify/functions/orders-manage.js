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

  // Only allow PUT requests for updating order status
  if (event.httpMethod !== 'PUT') {
    return createErrorResponse(405, 'Method not allowed');
  }

  try {
    const clientIP = event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown';
    
    // Rate limiting for order management
    if (!checkRateLimit(clientIP, 'order-manage', 20, 60 * 60 * 1000)) {
      logSecurityEvent(event, 'Rate limit exceeded for order management', { ip: clientIP });
      return createErrorResponse(429, 'Too many order management requests, please try again later.');
    }

    // Verify JWT token
    const token = event.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return createErrorResponse(401, 'Access token required', 'TOKEN_REQUIRED');
    }

    const decoded = verifyToken(token);
    if (!decoded.success) {
      logSecurityEvent(event, 'Invalid token for order management', { 
        ip: clientIP,
        error: decoded.error 
      });
      return createErrorResponse(401, 'Invalid access token', 'INVALID_TOKEN');
    }

    // Check admin role
    if (!checkAdminRole(decoded.payload)) {
      logSecurityEvent(event, 'Non-admin attempted order management', {
        userId: decoded.payload.id,
        role: decoded.payload.role
      });
      return createErrorResponse(403, 'Admin access required', 'ADMIN_REQUIRED');
    }

    // Extract order ID from path
    const pathSegments = event.path.split('/');
    const orderId = pathSegments[pathSegments.length - 1];
    
    if (!orderId || isNaN(parseInt(orderId))) {
      return createErrorResponse(400, 'Valid order ID required');
    }

    const numOrderId = parseInt(orderId);

    // Parse request body
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (error) {
      return createErrorResponse(400, 'Invalid JSON body');
    }

    const { status, trackingNumber, notes, paymentStatus } = body;

    // Find existing order
    const orderIndex = mockDB.orders.findIndex(o => o.id === numOrderId);
    
    if (orderIndex === -1) {
      logSecurityEvent(event, 'Attempt to manage non-existent order', {
        adminId: decoded.payload.id,
        orderId: numOrderId
      });
      return createErrorResponse(404, 'Order not found', 'ORDER_NOT_FOUND');
    }

    const existingOrder = mockDB.orders[orderIndex];
    
    // Create updated order object
    const updatedOrder = { ...existingOrder };
    let hasChanges = false;
    const changes = [];

    // Update status if provided
    if (status !== undefined) {
      const allowedStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
      const sanitizedStatus = sanitizeInput(status.toLowerCase());
      
      if (!allowedStatuses.includes(sanitizedStatus)) {
        return createErrorResponse(400, 'Invalid status. Allowed: ' + allowedStatuses.join(', '));
      }
      
      // Validate status transitions
      const statusTransitions = {
        'pending': ['confirmed', 'cancelled'],
        'confirmed': ['processing', 'cancelled'],
        'processing': ['shipped', 'cancelled'],
        'shipped': ['delivered', 'cancelled'],
        'delivered': [], // Final status
        'cancelled': [] // Final status
      };
      
      const currentStatus = existingOrder.status.toLowerCase();
      if (currentStatus !== sanitizedStatus && 
          !statusTransitions[currentStatus]?.includes(sanitizedStatus)) {
        return createErrorResponse(400, `Cannot change status from "${currentStatus}" to "${sanitizedStatus}"`);
      }
      
      if (currentStatus !== sanitizedStatus) {
        updatedOrder.status = sanitizedStatus;
        changes.push(`status: ${currentStatus} → ${sanitizedStatus}`);
        hasChanges = true;

        // Handle stock restoration for cancelled orders
        if (sanitizedStatus === 'cancelled' && currentStatus !== 'cancelled') {
          // Restore product stocks
          for (const item of existingOrder.items) {
            const product = mockDB.products.find(p => p.id === item.productId);
            if (product) {
              product.stock += item.quantity;
            }
          }
          changes.push('stock restored for cancelled items');
        }
      }
    }

    // Update tracking number if provided
    if (trackingNumber !== undefined) {
      const sanitizedTrackingNumber = sanitizeInput(trackingNumber) || null;
      if (existingOrder.trackingNumber !== sanitizedTrackingNumber) {
        updatedOrder.trackingNumber = sanitizedTrackingNumber;
        changes.push(`trackingNumber: ${existingOrder.trackingNumber || 'null'} → ${sanitizedTrackingNumber || 'null'}`);
        hasChanges = true;
      }
    }

    // Update payment status if provided
    if (paymentStatus !== undefined) {
      const allowedPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];
      const sanitizedPaymentStatus = sanitizeInput(paymentStatus.toLowerCase());
      
      if (!allowedPaymentStatuses.includes(sanitizedPaymentStatus)) {
        return createErrorResponse(400, 'Invalid payment status. Allowed: ' + allowedPaymentStatuses.join(', '));
      }
      
      if (existingOrder.paymentStatus !== sanitizedPaymentStatus) {
        updatedOrder.paymentStatus = sanitizedPaymentStatus;
        changes.push(`paymentStatus: ${existingOrder.paymentStatus} → ${sanitizedPaymentStatus}`);
        hasChanges = true;
      }
    }

    // Add admin notes if provided
    if (notes !== undefined) {
      const sanitizedNotes = sanitizeInput(notes);
      const existingNotes = existingOrder.adminNotes || '';
      
      if (existingNotes !== sanitizedNotes) {
        updatedOrder.adminNotes = sanitizedNotes;
        changes.push('adminNotes updated');
        hasChanges = true;
      }
    }

    if (!hasChanges) {
      return createErrorResponse(400, 'No valid changes provided');
    }

    // Update timestamp
    updatedOrder.updatedAt = new Date().toISOString();

    // Update estimated delivery for shipped orders
    if (updatedOrder.status === 'shipped' && !updatedOrder.estimatedDelivery) {
      updatedOrder.estimatedDelivery = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 days
    }

    // Save updated order
    mockDB.orders[orderIndex] = updatedOrder;

    // Get user info for logging
    const user = mockDB.users.find(u => u.id === existingOrder.userId);

    logSecurityEvent(event, 'Order updated successfully by admin', {
      adminId: decoded.payload.id,
      orderId: numOrderId,
      orderNumber: existingOrder.orderNumber,
      userId: existingOrder.userId,
      userEmail: user?.email,
      changes: changes
    });

    return createResponse(200, {
      message: 'Order updated successfully',
      data: {
        order: {
          id: updatedOrder.id,
          orderNumber: updatedOrder.orderNumber,
          status: updatedOrder.status,
          paymentStatus: updatedOrder.paymentStatus,
          trackingNumber: updatedOrder.trackingNumber,
          updatedAt: updatedOrder.updatedAt,
          estimatedDelivery: updatedOrder.estimatedDelivery
        },
        changes: changes
      }
    });

  } catch (error) {
    console.error('Order management error:', error);
    logSecurityEvent(event, 'Order management function error', { 
      error: error.message 
    });
    return createErrorResponse(500, 'Internal server error during order management', 'ORDER_MANAGE_ERROR');
  }
};
