const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Environment variables untuk Netlify
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_in_production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '24h';
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

// Mock database (in production, you might want to use external DB)
let mockDB = {
  users: [
    {
      id: 1,
      username: 'admin',
      email: 'admin@alandstore.com',
      password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LtVNNSqk.hGx0/Y.a', // admin123
      fullName: 'Administrator',
      role: 'admin',
      createdAt: new Date().toISOString(),
      lastLogin: null,
      isActive: true
    },
    {
      id: 2,
      username: 'user',
      email: 'user@alandstore.com',
      password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LtVNNSqk.hGx0/Y.a', // user123
      fullName: 'Demo User',
      role: 'user',
      createdAt: new Date().toISOString(),
      lastLogin: null,
      isActive: true
    }
  ],
  products: [
    {
      id: 1,
      name: "Smartphone Samsung Galaxy S24",
      price: 5999000,
      description: "Smartphone flagship dengan kamera terbaik dan performa tinggi",
      image: "https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=1",
      category: "Electronics",
      stock: 10,
      featured: true
    },
    {
      id: 2,
      name: "Laptop Gaming ASUS ROG",
      price: 15999000,
      description: "Laptop gaming dengan spesifikasi tinggi untuk para gamer",
      image: "https://images.pexels.com/photos/2047905/pexels-photo-2047905.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=1",
      category: "Electronics",
      stock: 5,
      featured: true
    },
    {
      id: 3,
      name: "Sepatu Sneakers Nike Air",
      price: 899000,
      description: "Sepatu sneakers dengan kualitas premium dan design modern",
      image: "https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=1",
      category: "Fashion",
      stock: 20,
      featured: false
    },
    {
      id: 4,
      name: "Apple Watch Series 9",
      price: 2499000,
      description: "Smart watch dengan fitur kesehatan dan notifikasi lengkap",
      image: "https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=1",
      category: "Electronics",
      stock: 15,
      featured: true
    },
    {
      id: 5,
      name: "iPhone 15 Pro Max",
      price: 18999000,
      description: "iPhone terbaru dengan kamera pro dan performa maksimal",
      image: "https://picsum.photos/400/400?random=5",
      category: "Electronics",
      stock: 8,
      featured: true
    },
    // Add more products as needed...
  ],
  orders: []
};

// Rate limiting (simple in-memory store)
const rateLimitStore = new Map();

// Utility functions
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>\"']/g, '');
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function checkRateLimit(clientIP, endpoint, maxRequests = 5, windowMs = 15 * 60 * 1000) {
  const key = `${clientIP}:${endpoint}`;
  const now = Date.now();
  const windowStart = now - windowMs;
  
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, []);
  }
  
  const requests = rateLimitStore.get(key);
  const validRequests = requests.filter(timestamp => timestamp > windowStart);
  
  if (validRequests.length >= maxRequests) {
    return false;
  }
  
  validRequests.push(now);
  rateLimitStore.set(key, validRequests);
  return true;
}

function handleCORS(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  return null;
}

function verifyToken(token) {
  try {
    if (!token || !token.startsWith('Bearer ')) {
      throw new Error('Invalid token format');
    }
    
    const actualToken = token.replace('Bearer ', '').trim();
    const decoded = jwt.verify(actualToken, JWT_SECRET);
    
    if (!decoded.id || !decoded.email) {
      throw new Error('Invalid token payload');
    }
    
    return decoded;
  } catch (error) {
    throw new Error('Token verification failed');
  }
}

function createResponse(statusCode, body, additionalHeaders = {}) {
  return {
    statusCode,
    headers: { ...headers, ...additionalHeaders },
    body: JSON.stringify(body)
  };
}

function createErrorResponse(statusCode, message, code = null) {
  const body = { message };
  if (code) body.code = code;
  
  return createResponse(statusCode, body);
}

function logSecurityEvent(event, message, metadata = {}) {
  console.log(`[SECURITY] ${message}`, {
    timestamp: new Date().toISOString(),
    ip: event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown',
    userAgent: event.headers['user-agent'] || 'unknown',
    path: event.path,
    method: event.httpMethod,
    ...metadata
  });
}

module.exports = {
  headers,
  mockDB,
  JWT_SECRET,
  JWT_EXPIRE,
  BCRYPT_SALT_ROUNDS,
  sanitizeInput,
  validateEmail,
  checkRateLimit,
  handleCORS,
  verifyToken,
  createResponse,
  createErrorResponse,
  logSecurityEvent,
  bcrypt,
  jwt
};
