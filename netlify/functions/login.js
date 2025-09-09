const {
  handleCORS,
  checkRateLimit,
  validateEmail,
  sanitizeInput,
  createResponse,
  createErrorResponse,
  logSecurityEvent,
  mockDB,
  bcrypt,
  jwt,
  JWT_SECRET,
  JWT_EXPIRE
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
    
    // Rate limiting for login attempts - 10 attempts per 15 minutes
    if (!checkRateLimit(clientIP, 'login', 10, 15 * 60 * 1000)) {
      logSecurityEvent(event, 'Rate limit exceeded for login', { ip: clientIP });
      return createErrorResponse(429, 'Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.');
    }

    // Parse request body
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (error) {
      return createErrorResponse(400, 'Invalid JSON body');
    }

    const { email, password } = body;

    // Validation
    if (!email || !password) {
      return createErrorResponse(400, 'Email and password are required');
    }

    if (!validateEmail(email)) {
      return createErrorResponse(400, 'Invalid email format');
    }

    // Sanitize email
    const sanitizedEmail = sanitizeInput(email.toLowerCase());

    // Find user
    const user = mockDB.users.find(u => u.email.toLowerCase() === sanitizedEmail);
    
    if (!user) {
      logSecurityEvent(event, 'Login attempt with non-existent email', { email: sanitizedEmail });
      return createErrorResponse(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // Check if user is active
    if (user.isActive === false) {
      logSecurityEvent(event, 'Login attempt on deactivated account', { userId: user.id });
      return createErrorResponse(403, 'Account is deactivated', 'ACCOUNT_DEACTIVATED');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      logSecurityEvent(event, 'Failed login attempt - wrong password', { 
        email: sanitizedEmail,
        userId: user.id 
      });
      return createErrorResponse(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // Update last login
    user.lastLogin = new Date().toISOString();

    // Create JWT token
    const tokenPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000)
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRE });

    logSecurityEvent(event, 'Successful login', { 
      userId: user.id, 
      email: sanitizedEmail 
    });

    return createResponse(200, {
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    logSecurityEvent(event, 'Login function error', { error: error.message });
    return createErrorResponse(500, 'Internal server error during login', 'LOGIN_ERROR');
  }
};
