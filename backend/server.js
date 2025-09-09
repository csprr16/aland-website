const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult, param } = require('express-validator');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
require('dotenv').config();

// Import security utilities
const { logger, requestLogger, checkSecurityHeaders, createDatabaseBackup } = require('./security-utils');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_in_production';

// Security Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    }
}));

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'];
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
}));

// Rate Limiting
const generalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 auth requests per windowMs
    message: {
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: 900
    },
    skipSuccessfulRequests: true
});

const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 admin requests per windowMs
    message: {
        error: 'Too many admin requests, please try again later.',
        retryAfter: 900
    }
});

app.use(generalLimiter);

// Security middleware
app.use(checkSecurityHeaders);
app.use(requestLogger);

// Body parsing middleware with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Manual data sanitization (safer than express-mongo-sanitize)
function sanitizeObject(obj) {
    if (obj && typeof obj === 'object') {
        for (const key in obj) {
            if (key.includes('$') || key.includes('.')) {
                logger.warning('Suspicious key detected and removed', { key });
                delete obj[key];
            } else if (typeof obj[key] === 'object') {
                sanitizeObject(obj[key]);
            } else if (typeof obj[key] === 'string') {
                obj[key] = sanitizeInput(obj[key]);
            }
        }
    }
    return obj;
}

app.use((req, res, next) => {
    req.body = sanitizeObject(req.body);
    req.query = sanitizeObject(req.query);
    next();
});

// Prevent parameter pollution
app.use(hpp());

// Static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Multer untuk upload gambar
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../frontend/images/products'))
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});
const upload = multer({ storage: storage });

// Database files
const usersFile = path.join(__dirname, 'data/users.json');
const productsFile = path.join(__dirname, 'data/products.json');
const ordersFile = path.join(__dirname, 'data/orders.json');

// Initialize database files
function initializeDB() {
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    if (!fs.existsSync(usersFile)) {
        fs.writeFileSync(usersFile, JSON.stringify([]));
    }
    
    if (!fs.existsSync(productsFile)) {
        const defaultProducts = [
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
            {
                id: 6,
                name: "MacBook Pro M3",
                price: 25999000,
                description: "Laptop profesional dengan chip M3 untuk performa luar biasa",
                image: "https://picsum.photos/400/400?random=6",
                category: "Electronics",
                stock: 3,
                featured: true
            },
            {
                id: 7,
                name: "Nike Air Jordan Retro",
                price: 2499000,
                description: "Sepatu basket klasik dengan design ikonik dan kualitas premium",
                image: "https://picsum.photos/400/400?random=7",
                category: "Fashion",
                stock: 15,
                featured: false
            },
            {
                id: 8,
                name: "Adidas Ultraboost 22",
                price: 2199000,
                description: "Sepatu running dengan teknologi Boost untuk kenyamanan maksimal",
                image: "https://picsum.photos/400/400?random=8",
                category: "Fashion",
                stock: 25,
                featured: false
            },
            {
                id: 9,
                name: "Sony WH-1000XM5 Headphones",
                price: 4999000,
                description: "Headphone wireless dengan noise cancelling terbaik di kelasnya",
                image: "https://picsum.photos/400/400?random=9",
                category: "Electronics",
                stock: 12,
                featured: false
            },
            {
                id: 10,
                name: "iPad Pro 12.9 inch",
                price: 16999000,
                description: "Tablet profesional dengan layar Liquid Retina XDR",
                image: "https://picsum.photos/400/400?random=10",
                category: "Electronics",
                stock: 7,
                featured: true
            },
            {
                id: 11,
                name: "Samsung Galaxy Tab S9",
                price: 9999000,
                description: "Tablet Android premium dengan S Pen dan performa tinggi",
                image: "https://picsum.photos/400/400?random=11",
                category: "Electronics",
                stock: 10,
                featured: false
            },
            {
                id: 12,
                name: "Samsung Galaxy Watch 6",
                price: 5999000,
                description: "Smartwatch Android dengan fitur kesehatan dan fitness lengkap",
                image: "https://picsum.photos/400/400?random=12",
                category: "Electronics",
                stock: 18,
                featured: true
            },
            {
                id: 13,
                name: "Kemeja Formal Premium",
                price: 599000,
                description: "Kemeja formal berkualitas tinggi untuk tampilan profesional",
                image: "https://picsum.photos/400/400?random=13",
                category: "Fashion",
                stock: 30,
                featured: false
            },
            {
                id: 14,
                name: "Jaket Denim Vintage",
                price: 799000,
                description: "Jaket denim dengan gaya vintage yang tidak lekang oleh waktu",
                image: "https://picsum.photos/400/400?random=14",
                category: "Fashion",
                stock: 20,
                featured: false
            },
            {
                id: 15,
                name: "Tas Laptop Business",
                price: 1299000,
                description: "Tas laptop premium untuk kebutuhan bisnis dan travel",
                image: "https://picsum.photos/400/400?random=15",
                category: "Fashion",
                stock: 15,
                featured: false
            },
            {
                id: 16,
                name: "Gaming Chair RGB",
                price: 3999000,
                description: "Kursi gaming dengan pencahayaan RGB dan fitur ergonomis",
                image: "https://picsum.photos/400/400?random=16",
                category: "Home",
                stock: 8,
                featured: false
            },
            {
                id: 17,
                name: "Standing Desk Adjustable",
                price: 2799000,
                description: "Meja kerja yang dapat disesuaikan tingginya untuk produktivitas optimal",
                image: "https://picsum.photos/400/400?random=17",
                category: "Home",
                stock: 12,
                featured: false
            },
            {
                id: 18,
                name: "Smart TV 55 Inch 4K Samsung",
                price: 8999000,
                description: "Smart TV 4K dengan teknologi HDR dan sistem operasi Tizen",
                image: "https://picsum.photos/400/400?random=18",
                category: "Electronics",
                stock: 6,
                featured: true
            },
            {
                id: 19,
                name: "Mechanical Keyboard RGB",
                price: 1599000,
                description: "Keyboard mechanical dengan switch premium dan lampu RGB",
                image: "https://picsum.photos/400/400?random=19",
                category: "Electronics",
                stock: 20,
                featured: false
            },
            {
                id: 20,
                name: "Wireless Gaming Mouse",
                price: 999000,
                description: "Mouse gaming wireless dengan sensor presisi tinggi",
                image: "https://picsum.photos/400/400?random=20",
                category: "Electronics",
                stock: 25,
                featured: false
            },
            {
                id: 21,
                name: "Sepatu Bola Nike Mercurial",
                price: 1799000,
                description: "Sepatu bola profesional untuk performa maksimal di lapangan",
                image: "https://picsum.photos/400/400?random=21",
                category: "Sports",
                stock: 18,
                featured: false
            },
            {
                id: 22,
                name: "Dumbell Set 20KG",
                price: 899000,
                description: "Set dumbell adjustable untuk home gym dan fitness",
                image: "https://picsum.photos/400/400?random=22",
                category: "Sports",
                stock: 12,
                featured: false
            },
            {
                id: 23,
                name: "Yoga Mat Premium",
                price: 299000,
                description: "Matras yoga anti slip dengan ketebalan optimal untuk kenyamanan",
                image: "https://picsum.photos/400/400?random=23",
                category: "Sports",
                stock: 30,
                featured: false
            }
        ];
        fs.writeFileSync(productsFile, JSON.stringify(defaultProducts, null, 2));
    }
    
    if (!fs.existsSync(ordersFile)) {
        fs.writeFileSync(ordersFile, JSON.stringify([]));
    }
}

// Validation helpers
function validateInput(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            message: 'Input validation failed',
            errors: errors.array().map(error => ({
                field: error.path,
                message: error.msg
            }))
        });
    }
    next();
}

function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>"']/g, '');
}

// Secure file operations
function safeReadFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            return [];
        }
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error.message);
        return [];
    }
}

function safeWriteFile(filePath, data) {
    try {
        // Create backup before writing
        if (fs.existsSync(filePath)) {
            const backupPath = `${filePath}.backup`;
            fs.copyFileSync(filePath, backupPath);
        }
        
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing file ${filePath}:`, error.message);
        return false;
    }
}

// Helper functions untuk database
function readUsers() {
    return safeReadFile(usersFile);
}

function writeUsers(users) {
    return safeWriteFile(usersFile, users);
}

function readProducts() {
    return safeReadFile(productsFile);
}

function writeProducts(products) {
    return safeWriteFile(productsFile, products);
}

function readOrders() {
    return safeReadFile(ordersFile);
}

function writeOrders(orders) {
    return safeWriteFile(ordersFile, orders);
}

// Enhanced JWT verification middleware
function verifyToken(req, res, next) {
    try {
        const authHeader = req.header('Authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                message: 'Access denied. No valid token provided.',
                code: 'NO_TOKEN' 
            });
        }
        
        const token = authHeader.replace('Bearer ', '').trim();
        
        if (!token || token.length < 10) {
            return res.status(401).json({ 
                message: 'Invalid token format',
                code: 'INVALID_TOKEN_FORMAT' 
            });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Additional security checks
        if (!decoded.id || !decoded.email) {
            return res.status(401).json({ 
                message: 'Invalid token payload',
                code: 'INVALID_PAYLOAD' 
            });
        }
        
        // Check if token is not too old (additional security)
        const tokenAge = Date.now() / 1000 - decoded.iat;
        if (tokenAge > 24 * 60 * 60) { // 24 hours
            return res.status(401).json({ 
                message: 'Token expired',
                code: 'TOKEN_EXPIRED' 
            });
        }
        
        req.user = {
            id: decoded.id,
            email: decoded.email,
            username: decoded.username,
            role: decoded.role
        };
        
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                message: 'Token has expired',
                code: 'TOKEN_EXPIRED' 
            });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                message: 'Invalid token',
                code: 'INVALID_TOKEN' 
            });
        } else {
            console.error('JWT Verification Error:', error);
            return res.status(500).json({ 
                message: 'Token verification failed',
                code: 'VERIFICATION_ERROR' 
            });
        }
    }
}

// Middleware untuk admin
function verifyAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Akses ditolak. Admin only.' });
    }
    next();
}

// Routes

// Register with validation
app.post('/api/register', 
    authLimiter,
    [
        body('username')
            .isLength({ min: 3, max: 30 })
            .withMessage('Username must be between 3 and 30 characters')
            .matches(/^[a-zA-Z0-9_]+$/)
            .withMessage('Username can only contain letters, numbers, and underscores'),
        body('email')
            .isEmail()
            .withMessage('Must be a valid email address')
            .normalizeEmail(),
        body('password')
            .isLength({ min: 6, max: 128 })
            .withMessage('Password must be between 6 and 128 characters')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&].*$/)
            .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
        body('fullName')
            .isLength({ min: 2, max: 100 })
            .withMessage('Full name must be between 2 and 100 characters')
            .matches(/^[a-zA-Z\s]+$/)
            .withMessage('Full name can only contain letters and spaces')
    ],
    validateInput,
    async (req, res) => {
    try {
        let { username, email, password, fullName } = req.body;
        
        // Sanitize inputs
        username = sanitizeInput(username.toLowerCase());
        email = sanitizeInput(email.toLowerCase());
        fullName = sanitizeInput(fullName);
        
        const users = readUsers();
        
        // Check if user exists (case-insensitive)
        const existingUser = users.find(user => 
            user.email.toLowerCase() === email || 
            user.username.toLowerCase() === username
        );
        
        if (existingUser) {
            return res.status(409).json({ 
                message: 'User already exists with this email or username',
                code: 'USER_EXISTS' 
            });
        }
        
        // Hash password with higher salt rounds for production
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Generate unique ID more securely
        const newUserId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
        
        // Create new user
        const newUser = {
            id: newUserId,
            username,
            email,
            password: hashedPassword,
            fullName,
            role: 'user',
            createdAt: new Date().toISOString(),
            lastLogin: null,
            isActive: true
        };
        
        users.push(newUser);
        const success = writeUsers(users);
        
        if (!success) {
            return res.status(500).json({ 
                message: 'Failed to save user data',
                code: 'SAVE_ERROR' 
            });
        }
        
        // Log successful registration (without sensitive data)
        console.log(`New user registered: ${email} at ${new Date().toISOString()}`);
        
        res.status(201).json({ 
            message: 'User registered successfully', 
            userId: newUser.id,
            username: newUser.username 
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            message: 'Internal server error during registration',
            code: 'REGISTRATION_ERROR' 
        });
    }
});

// Login with validation
app.post('/api/login', 
    authLimiter,
    [
        body('email')
            .isEmail()
            .withMessage('Must be a valid email address')
            .normalizeEmail(),
        body('password')
            .isLength({ min: 1 })
            .withMessage('Password is required')
    ],
    validateInput,
    async (req, res) => {
    try {
        let { email, password } = req.body;
        
        // Sanitize email
        email = sanitizeInput(email.toLowerCase());
        
        const users = readUsers();
        
        // Find user (case-insensitive email)
        const user = users.find(u => u.email.toLowerCase() === email);
        
        if (!user) {
            // Generic error message to prevent user enumeration
            return res.status(401).json({ 
                message: 'Invalid email or password',
                code: 'INVALID_CREDENTIALS' 
            });
        }
        
        // Check if user is active
        if (user.isActive === false) {
            return res.status(403).json({ 
                message: 'Account is deactivated',
                code: 'ACCOUNT_DEACTIVATED' 
            });
        }
        
        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            // Log failed login attempt
            console.log(`Failed login attempt for email: ${email} at ${new Date().toISOString()}`);
            
            return res.status(401).json({ 
                message: 'Invalid email or password',
                code: 'INVALID_CREDENTIALS' 
            });
        }
        
        // Update last login
        const userIndex = users.findIndex(u => u.id === user.id);
        if (userIndex !== -1) {
            users[userIndex].lastLogin = new Date().toISOString();
            writeUsers(users);
        }
        
        // Create JWT token with expiration from env
        const tokenPayload = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            iat: Math.floor(Date.now() / 1000)
        };
        
        const token = jwt.sign(
            tokenPayload,
            JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '24h' }
        );
        
        // Log successful login (without sensitive data)
        console.log(`User logged in: ${email} at ${new Date().toISOString()}`);
        
        res.json({
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
        res.status(500).json({ 
            message: 'Internal server error during login',
            code: 'LOGIN_ERROR' 
        });
    }
});

// Get products
app.get('/api/products', (req, res) => {
    try {
        const products = readProducts();
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Error server', error: error.message });
    }
});

// Get single product
app.get('/api/products/:id', (req, res) => {
    try {
        const products = readProducts();
        const product = products.find(p => p.id === parseInt(req.params.id));
        
        if (!product) {
            return res.status(404).json({ message: 'Produk tidak ditemukan' });
        }
        
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Error server', error: error.message });
    }
});

// Add product (Admin only)
app.post('/api/products', 
    verifyToken, 
    verifyAdmin, 
    adminLimiter,
    upload.single('image'), 
    [
        body('name')
            .isLength({ min: 2, max: 200 })
            .withMessage('Product name must be between 2 and 200 characters')
            .matches(/^[a-zA-Z0-9\s\-_]+$/)
            .withMessage('Product name contains invalid characters'),
        body('price')
            .isInt({ min: 1, max: 999999999 })
            .withMessage('Price must be a positive integer'),
        body('category')
            .isIn(['Electronics', 'Fashion', 'Home', 'Sports'])
            .withMessage('Invalid category'),
        body('stock')
            .isInt({ min: 0, max: 999999 })
            .withMessage('Stock must be a non-negative integer'),
        body('description')
            .isLength({ min: 10, max: 1000 })
            .withMessage('Description must be between 10 and 1000 characters')
    ],
    validateInput,
    (req, res) => {
    try {
        const { name, price, description, category, stock } = req.body;
        const products = readProducts();
        
        const newProduct = {
            id: products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1,
            name,
            price: parseInt(price),
            description,
            category,
            stock: parseInt(stock),
            image: req.file ? `/images/products/${req.file.filename}` : '/images/products/default.jpg',
            featured: false,
            createdAt: new Date().toISOString()
        };
        
        products.push(newProduct);
        writeProducts(products);
        
        res.status(201).json({ message: 'Produk berhasil ditambahkan', product: newProduct });
    } catch (error) {
        res.status(500).json({ message: 'Error server', error: error.message });
    }
});

// Update product (Admin only)
app.put('/api/products/:id', verifyToken, verifyAdmin, upload.single('image'), (req, res) => {
    try {
        const { name, price, description, category, stock } = req.body;
        const products = readProducts();
        const productIndex = products.findIndex(p => p.id === parseInt(req.params.id));
        
        if (productIndex === -1) {
            return res.status(404).json({ message: 'Produk tidak ditemukan' });
        }
        
        products[productIndex] = {
            ...products[productIndex],
            name: name || products[productIndex].name,
            price: price ? parseInt(price) : products[productIndex].price,
            description: description || products[productIndex].description,
            category: category || products[productIndex].category,
            stock: stock ? parseInt(stock) : products[productIndex].stock,
            image: req.file ? `/images/products/${req.file.filename}` : products[productIndex].image,
            updatedAt: new Date().toISOString()
        };
        
        writeProducts(products);
        
        res.json({ message: 'Produk berhasil diupdate', product: products[productIndex] });
    } catch (error) {
        res.status(500).json({ message: 'Error server', error: error.message });
    }
});

// Delete product (Admin only)
app.delete('/api/products/:id', verifyToken, verifyAdmin, (req, res) => {
    try {
        const products = readProducts();
        const productIndex = products.findIndex(p => p.id === parseInt(req.params.id));
        
        if (productIndex === -1) {
            return res.status(404).json({ message: 'Produk tidak ditemukan' });
        }
        
        products.splice(productIndex, 1);
        writeProducts(products);
        
        res.json({ message: 'Produk berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ message: 'Error server', error: error.message });
    }
});

// Create order
app.post('/api/orders', verifyToken, (req, res) => {
    try {
        const { items, totalAmount, shippingAddress } = req.body;
        const orders = readOrders();
        
        const newOrder = {
            id: orders.length + 1,
            userId: req.user.id,
            items,
            totalAmount,
            shippingAddress,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        orders.push(newOrder);
        writeOrders(orders);
        
        res.status(201).json({ message: 'Order berhasil dibuat', order: newOrder });
    } catch (error) {
        res.status(500).json({ message: 'Error server', error: error.message });
    }
});

// Get user orders
app.get('/api/orders', verifyToken, (req, res) => {
    try {
        const orders = readOrders();
        const userOrders = orders.filter(order => order.userId === req.user.id);
        
        res.json(userOrders);
    } catch (error) {
        res.status(500).json({ message: 'Error server', error: error.message });
    }
});

// Get all orders (Admin only)
app.get('/api/admin/orders', verifyToken, verifyAdmin, (req, res) => {
    try {
        const orders = readOrders();
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Error server', error: error.message });
    }
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/register.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/admin.html'));
});

// Global error handler
app.use((error, req, res, next) => {
    logger.error('Unhandled Error', {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        url: req.url,
        method: req.method,
        ip: req.ip
    });
    
    res.status(500).json({
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        requestId: Date.now().toString(36) // Simple request ID for tracking
    });
});

// Handle 404
app.use((req, res) => {
    logger.warning('404 Not Found', {
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    
    res.status(404).json({
        message: 'Endpoint not found',
        code: 'NOT_FOUND'
    });
});

// Graceful shutdown handlers
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack
    });
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', {
        reason: reason,
        promise: promise
    });
});

// Initialize database and start server
initializeDB();

// Create initial backup
createDatabaseBackup();

// Schedule regular backups (every hour)
setInterval(() => {
    createDatabaseBackup();
}, parseInt(process.env.DB_BACKUP_INTERVAL) || 3600000);

app.listen(PORT, () => {
    logger.info('Server Started', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version
    });
    
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
    console.log(`📦 Toko Online by alandyudhistira 2025`);
    console.log(`🔒 Security features: Enabled`);
    console.log(`📝 Logging: ${process.env.NODE_ENV === 'development' ? 'Console + File' : 'File Only'}`);
});
