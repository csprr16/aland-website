const {
  handleCORS,
  checkRateLimit,
  sanitizeInput,
  createResponse,
  createErrorResponse,
  logSecurityEvent,
  verifyToken,
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
    
    // Rate limiting for order creation
    if (!checkRateLimit(clientIP, 'order-create', 10, 60 * 60 * 1000)) {
      logSecurityEvent(event, 'Rate limit exceeded for order creation', { ip: clientIP });
      return createErrorResponse(429, 'Too many order attempts, please try again later.');
    }

    // Verify JWT token
    const token = event.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return createErrorResponse(401, 'Access token required', 'TOKEN_REQUIRED');
    }

    const decoded = verifyToken(token);
    if (!decoded.success) {
      logSecurityEvent(event, 'Invalid token for order creation', { 
        ip: clientIP,
        error: decoded.error 
      });
      return createErrorResponse(401, 'Invalid access token', 'INVALID_TOKEN');
    }

    // Parse request body
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (error) {
      return createErrorResponse(400, 'Invalid JSON body');
    }

    const { items, shippingAddress, paymentMethod, notes } = body;

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return createErrorResponse(400, 'Order items are required');
    }

    if (!shippingAddress) {
      return createErrorResponse(400, 'Shipping address is required');
    }

    if (!paymentMethod) {
      return createErrorResponse(400, 'Payment method is required');
    }

    // Validate shipping address
    const { fullName, address, city, postalCode, phone } = shippingAddress;
    if (!fullName || !address || !city || !postalCode || !phone) {
      return createErrorResponse(400, 'Complete shipping address required (fullName, address, city, postalCode, phone)');
    }

    // Sanitize shipping address
    const sanitizedShippingAddress = {
      fullName: sanitizeInput(fullName),
      address: sanitizeInput(address),
      city: sanitizeInput(city),
      postalCode: sanitizeInput(postalCode),
      phone: sanitizeInput(phone)
    };

    // Validate address field lengths
    if (sanitizedShippingAddress.fullName.length < 2 || sanitizedShippingAddress.fullName.length > 100) {
      return createErrorResponse(400, 'Full name must be between 2-100 characters');
    }

    if (sanitizedShippingAddress.address.length < 5 || sanitizedShippingAddress.address.length > 200) {
      return createErrorResponse(400, 'Address must be between 5-200 characters');
    }

    if (sanitizedShippingAddress.city.length < 2 || sanitizedShippingAddress.city.length > 50) {
      return createErrorResponse(400, 'City must be between 2-50 characters');
    }

    // Validate payment method
    const allowedPaymentMethods = ['credit_card', 'debit_card', 'bank_transfer', 'e_wallet', 'cash_on_delivery'];
    if (!allowedPaymentMethods.includes(paymentMethod)) {
      return createErrorResponse(400, 'Invalid payment method');
    }

    // Process order items
    const processedItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const { productId, quantity } = item;

      if (!productId || !quantity || quantity <= 0) {
        return createErrorResponse(400, 'Invalid item: productId and positive quantity required');
      }

      // Find product
      const product = mockDB.products.find(p => p.id === parseInt(productId));
      if (!product) {
        return createErrorResponse(400, `Product with ID ${productId} not found`);
      }

      if (!product.isActive) {
        return createErrorResponse(400, `Product "${product.name}" is not available`);
      }

      // Check stock
      if (product.stock < quantity) {
        return createErrorResponse(400, `Insufficient stock for product "${product.name}". Available: ${product.stock}, Requested: ${quantity}`);
      }

      const itemTotal = product.price * quantity;
      totalAmount += itemTotal;

      processedItems.push({
        productId: product.id,
        productName: product.name,
        productImage: product.image,
        price: product.price,
        quantity: parseInt(quantity),
        subtotal: itemTotal
      });
    }

    // Calculate shipping cost (simple logic)
    const shippingCost = totalAmount > 100 ? 0 : 15; // Free shipping over $100
    const finalAmount = totalAmount + shippingCost;

    // Create new order
    const newOrder = {
      id: mockDB.orders.length + 1,
      userId: decoded.payload.id,
      orderNumber: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      items: processedItems,
      shippingAddress: sanitizedShippingAddress,
      paymentMethod: paymentMethod,
      notes: notes ? sanitizeInput(notes) : '',
      status: 'pending',
      subtotal: totalAmount,
      shippingCost: shippingCost,
      totalAmount: finalAmount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      trackingNumber: null,
      paymentStatus: 'pending'
    };

    // Update product stocks
    for (const item of processedItems) {
      const product = mockDB.products.find(p => p.id === item.productId);
      if (product) {
        product.stock -= item.quantity;
      }
    }

    // Add order to mock database
    mockDB.orders.push(newOrder);

    logSecurityEvent(event, 'New order created successfully', {
      userId: decoded.payload.id,
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      totalAmount: newOrder.totalAmount,
      itemCount: processedItems.length
    });

    return createResponse(201, {
      message: 'Order created successfully',
      data: {
        order: {
          id: newOrder.id,
          orderNumber: newOrder.orderNumber,
          status: newOrder.status,
          totalAmount: newOrder.totalAmount,
          createdAt: newOrder.createdAt,
          estimatedDelivery: newOrder.estimatedDelivery
        }
      }
    });

  } catch (error) {
    console.error('Order creation error:', error);
    logSecurityEvent(event, 'Order creation function error', { error: error.message });
    return createErrorResponse(500, 'Internal server error during order creation', 'ORDER_CREATE_ERROR');
  }
};
