# 🔐 Environment Variables Configuration Guide

Panduan lengkap untuk setup environment variables di Netlify untuk AlandStore deployment.

## 📋 Table of Contents

- [Overview](#overview)
- [Required Variables](#required-variables)
- [Security Best Practices](#security-best-practices)
- [Netlify Dashboard Setup](#netlify-dashboard-setup)
- [Local Development](#local-development)
- [Production Values](#production-values)
- [Testing & Validation](#testing--validation)

---

## 🌍 Overview

Environment variables adalah cara aman untuk menyimpan sensitive data seperti API keys, JWT secrets, dan database credentials tanpa hardcoding di source code.

### Why Environment Variables?
- ✅ **Security**: Sensitive data tidak tersimpan di repository
- ✅ **Flexibility**: Different values untuk dev, staging, production
- ✅ **Scalability**: Easy configuration management
- ✅ **Compliance**: Meets security standards

---

## ⚡ Required Variables

### Core Application Variables

| Variable | Type | Description | Example | Required |
|----------|------|-------------|---------|----------|
| `NODE_ENV` | String | Application environment | `production` | ✅ |
| `JWT_SECRET` | String | JWT signing secret (min 32 chars) | `your_super_secure_jwt_secret_key_32_chars` | ✅ |
| `JWT_EXPIRE` | String | JWT token expiration time | `7d` | ✅ |
| `BCRYPT_SALT_ROUNDS` | Number | Bcrypt hashing rounds | `12` | ✅ |

### API Configuration Variables

| Variable | Type | Description | Example | Required |
|----------|------|-------------|---------|----------|
| `API_BASE_URL` | String | Base URL for API calls | `https://yoursite.netlify.app/.netlify/functions` | ✅ |
| `API_TIMEOUT` | Number | Request timeout in milliseconds | `10000` | ❌ |
| `CORS_ORIGIN` | String | Allowed CORS origins | `https://yoursite.netlify.app` | ❌ |

### Optional Enhancement Variables

| Variable | Type | Description | Example | Required |
|----------|------|-------------|---------|----------|
| `RATE_LIMIT_WINDOW_MS` | Number | Rate limit window in ms | `900000` | ❌ |
| `RATE_LIMIT_MAX_REQUESTS` | Number | Max requests per window | `100` | ❌ |
| `MAX_FILE_SIZE` | Number | Max upload file size | `5000000` | ❌ |
| `LOG_LEVEL` | String | Logging level | `info` | ❌ |

---

## 🔒 Security Best Practices

### JWT Secret Generation

#### Method 1: OpenSSL (Recommended)
```bash
openssl rand -base64 32
```
Output example: `K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols=`

#### Method 2: Node.js Crypto
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Output example: `a9b4c2d3e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`

#### Method 3: Online Generator (Development Only)
- [Generate Secret](https://generate-secret.vercel.app/32)
- [Random.org](https://www.random.org/strings/)

### Security Requirements

#### ✅ DO:
- **Minimum 32 characters** untuk JWT secret
- **Use cryptographically secure** random generation
- **Different secrets** untuk development dan production
- **Regular rotation** of secrets (quarterly)
- **Strong bcrypt salt rounds** (12+)
- **Backup secrets securely** (password manager)

#### ❌ DON'T:
- Use weak or predictable secrets
- Commit secrets to version control
- Share secrets via email/chat
- Use same secret across environments
- Hardcode secrets in code
- Use dictionary words or personal info

### Environment Variable Naming
```bash
# Good examples
JWT_SECRET=abc123def456ghi789...
BCRYPT_SALT_ROUNDS=12
NODE_ENV=production

# Bad examples (avoid)
secret=weak
PASSWORD=123456
key=simple
```

---

## 🚀 Netlify Dashboard Setup

### Step 1: Access Environment Variables
1. Login to [Netlify Dashboard](https://app.netlify.com)
2. Select your site
3. Go to **Site settings**
4. Click **Environment variables** (in sidebar)

### Step 2: Add Required Variables
Click **"Add a variable"** untuk setiap variable:

#### Core Variables
```
Variable name: NODE_ENV
Value: production
Scopes: All (atau pilih specific)
```

```
Variable name: JWT_SECRET  
Value: [GENERATED_32_CHAR_SECRET]
Scopes: All
```

```
Variable name: JWT_EXPIRE
Value: 7d
Scopes: All
```

```
Variable name: BCRYPT_SALT_ROUNDS
Value: 12
Scopes: All
```

### Step 3: Environment Scopes
Choose appropriate scopes:
- **All**: Variable available di semua deployments
- **Production**: Hanya production deployments
- **Deploy previews**: Hanya preview deployments
- **Branch deployments**: Specific branch deployments

### Step 4: Save & Deploy
After adding variables:
1. Click **"Save"**
2. **Redeploy** your site untuk apply changes
3. **Test** the deployment

---

## 💻 Local Development

### Setup Local Environment
```bash
# Copy template
cp .env.example .env

# Edit with your values
nano .env
```

### Local Development Values
```env
# Local Development Configuration
NODE_ENV=development
JWT_SECRET=local_development_jwt_secret_min_32_chars_for_testing_only
JWT_EXPIRE=24h
BCRYPT_SALT_ROUNDS=10

# API Configuration
API_BASE_URL=http://localhost:3000/api
API_TIMEOUT=10000

# Development Flags
DEV_MODE=true
DEBUG_MODE=true
LOG_LEVEL=debug

# Local Database (if applicable)
DATABASE_URL=mongodb://localhost:27017/alandstore_dev
```

### Local vs Production Differences
| Setting | Local | Production |
|---------|--------|------------|
| NODE_ENV | development | production |
| JWT_SECRET | Local secret | Strong production secret |
| JWT_EXPIRE | 24h (longer for dev) | 7d |
| BCRYPT_SALT_ROUNDS | 10 (faster) | 12 (more secure) |
| LOG_LEVEL | debug | info/warn |
| API_BASE_URL | localhost:3000 | Netlify functions URL |

---

## 🏭 Production Values

### Production Environment Variables
```env
# Production Configuration - Set in Netlify Dashboard
NODE_ENV=production
JWT_SECRET=[STRONG_32_CHAR_PRODUCTION_SECRET]
JWT_EXPIRE=7d
BCRYPT_SALT_ROUNDS=12

# Production API
API_BASE_URL=https://alandstore.netlify.app/.netlify/functions
API_TIMEOUT=10000
CORS_ORIGIN=https://alandstore.netlify.app

# Security Settings
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
MAX_FILE_SIZE=5000000

# Logging
LOG_LEVEL=info
```

### Production Secrets Generation
```bash
# Generate production JWT secret
openssl rand -base64 32

# Generate session secret
openssl rand -base64 24  

# Generate API key (if needed)
openssl rand -hex 16
```

### Security Checklist untuk Production
- [ ] JWT_SECRET minimum 32 karakter
- [ ] Different secret dari development
- [ ] BCRYPT_SALT_ROUNDS minimal 12
- [ ] NODE_ENV set to 'production'
- [ ] CORS_ORIGIN set ke domain spesifik
- [ ] No debug/development flags enabled
- [ ] All sensitive variables set in Netlify dashboard
- [ ] Regular backup of environment variables

---

## ✅ Testing & Validation

### Test Environment Variables
```bash
# Test locally
npm run dev

# Check if variables loaded correctly
curl http://localhost:8888/.netlify/functions/login -v
```

### Validate Production Setup
```bash
# Test production endpoints
curl https://yoursite.netlify.app/.netlify/functions/products

# Test authentication
curl -X POST https://yoursite.netlify.app/.netlify/functions/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@alandstore.com","password":"admin123"}'
```

### Debug Environment Issues

#### Check Variables in Functions
Add temporary logging:
```javascript
// In your function file
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length);
```

#### Common Issues & Solutions

**Issue**: `JWT_SECRET is not defined`
```bash
# Solution: Check variable name spelling in Netlify dashboard
# Ensure it's exactly: JWT_SECRET (case sensitive)
```

**Issue**: `Invalid JWT signature`
```bash
# Solution: Different JWT_SECRET between environments
# Generate new secret for production
```

**Issue**: `Function timeout`
```bash
# Solution: High BCRYPT_SALT_ROUNDS
# Use 12 for production, 10 for development
```

**Issue**: `CORS errors`
```bash
# Solution: Check CORS_ORIGIN setting
# Set to specific domain in production
```

### Validation Script
Create `scripts/validate-env.js`:
```javascript
// Validate environment variables
const requiredVars = [
  'NODE_ENV',
  'JWT_SECRET', 
  'JWT_EXPIRE',
  'BCRYPT_SALT_ROUNDS'
];

const missing = requiredVars.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('❌ Missing environment variables:', missing.join(', '));
  process.exit(1);
}

// Validate JWT_SECRET length
if (process.env.JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET must be at least 32 characters');
  process.exit(1);
}

console.log('✅ All environment variables valid');
```

Run validation:
```bash
node scripts/validate-env.js
```

---

## 🔄 Environment Management

### Regular Maintenance
- **Monthly**: Review dan rotate JWT secrets
- **Quarterly**: Generate new production secrets
- **Annually**: Complete security audit
- **As needed**: Update API endpoints, add new variables

### Backup Strategy
1. **Document variables**: Keep secure list of variable names
2. **Backup values**: Store encrypted in password manager
3. **Document changes**: Track when secrets were rotated
4. **Test backups**: Verify backup dapat restore functionality

### Multi-Environment Setup
```bash
# Development
NODE_ENV=development
JWT_SECRET=dev_secret_32_chars_minimum_length
API_BASE_URL=http://localhost:3000/api

# Staging  
NODE_ENV=staging
JWT_SECRET=staging_secret_32_chars_different_from_dev
API_BASE_URL=https://alandstore-staging.netlify.app/.netlify/functions

# Production
NODE_ENV=production  
JWT_SECRET=production_secret_32_chars_most_secure
API_BASE_URL=https://alandstore.netlify.app/.netlify/functions
```

---

## 📞 Support & Troubleshooting

### Common Commands
```bash
# List current environment
netlify env:list

# Set environment variable via CLI
netlify env:set JWT_SECRET your_secret_here

# Import from file
netlify env:import .env

# View function logs
netlify functions:log
```

### Getting Help
- [Netlify Environment Variables Docs](https://docs.netlify.com/environment-variables/overview/)
- [Netlify Community Forum](https://community.netlify.com/)
- [Environment Variables Best Practices](https://12factor.net/config)

---

## ✅ Final Checklist

### Before Deployment
- [ ] All required variables defined
- [ ] JWT_SECRET minimum 32 characters
- [ ] BCRYPT_SALT_ROUNDS set to 12+
- [ ] NODE_ENV set to 'production'
- [ ] No development flags in production
- [ ] CORS_ORIGIN configured correctly
- [ ] Variables tested locally
- [ ] Backup of all secrets created

### After Deployment  
- [ ] Variables loaded correctly in functions
- [ ] Authentication working
- [ ] API endpoints responding
- [ ] No environment-related errors
- [ ] Performance acceptable
- [ ] Security headers active

---

**🔐 Environment variables adalah fondasi security untuk aplikasi production. Setup dengan hati-hati!**
