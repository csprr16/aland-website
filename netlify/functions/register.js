const {
  handleCORS,
  checkRateLimit,
  validateEmail,
  validatePassword,
  sanitizeInput,
  createResponse,
  createErrorResponse,
  logSecurityEvent,
  mockDB,
  bcrypt,
  BCRYPT_SALT_ROUNDS
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
    
    // Rate limiting for registration attempts
    if (!checkRateLimit(clientIP, 'register', 3, 60 * 60 * 1000)) {
      logSecurityEvent(event, 'Rate limit exceeded for registration', { ip: clientIP });
      return createErrorResponse(429, 'Too many registration attempts, please try again later.');
    }

    // Parse request body
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (error) {
      return createErrorResponse(400, 'Invalid JSON body');
    }

    const { username, email, password, fullName } = body;

    // Validation
    if (!username || !email || !password || !fullName) {
      return createErrorResponse(400, 'All fields are required: username, email, password, fullName');
    }

    if (!validateEmail(email)) {
      return createErrorResponse(400, 'Invalid email format');
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return createErrorResponse(400, passwordValidation.error);
    }

    // Sanitize inputs
    const sanitizedUsername = sanitizeInput(username.toLowerCase());
    const sanitizedEmail = sanitizeInput(email.toLowerCase());
    const sanitizedFullName = sanitizeInput(fullName);

    // Length validation
    if (sanitizedUsername.length < 3 || sanitizedUsername.length > 30) {
      return createErrorResponse(400, 'Username must be between 3-30 characters');
    }

    if (sanitizedFullName.length < 2 || sanitizedFullName.length > 100) {
      return createErrorResponse(400, 'Full name must be between 2-100 characters');
    }

    // Check for existing user
    const existingUser = mockDB.users.find(
      u => u.email.toLowerCase() === sanitizedEmail || u.username.toLowerCase() === sanitizedUsername
    );

    if (existingUser) {
      logSecurityEvent(event, 'Registration attempt with existing email/username', {
        email: sanitizedEmail,
        username: sanitizedUsername,
        existingField: existingUser.email.toLowerCase() === sanitizedEmail ? 'email' : 'username'
      });
      return createErrorResponse(409, 'User already exists with this email or username', 'USER_EXISTS');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // Create new user
    const newUser = {
      id: mockDB.users.length + 1,
      username: sanitizedUsername,
      email: sanitizedEmail,
      password: hashedPassword,
      fullName: sanitizedFullName,
      role: 'customer',
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      emailVerified: false, // In real app, you'd send verification email
      twoFactorEnabled: false
    };

    // Add user to mock database
    mockDB.users.push(newUser);

    logSecurityEvent(event, 'New user registered successfully', {
      userId: newUser.id,
      username: sanitizedUsername,
      email: sanitizedEmail
    });

    // Return success response (without password)
    return createResponse(201, {
      message: 'Registration successful',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
        createdAt: newUser.createdAt,
        emailVerified: newUser.emailVerified
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    logSecurityEvent(event, 'Registration function error', { error: error.message });
    return createErrorResponse(500, 'Internal server error during registration', 'REGISTRATION_ERROR');
  }
};
