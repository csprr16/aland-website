# 🚀 AlandStore Deployment Guide

Panduan lengkap untuk deploy AlandStore ke Netlify dengan serverless functions dan security terbaik.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Environment Variables](#environment-variables)
- [Netlify Deployment](#netlify-deployment)
- [Security Configuration](#security-configuration)
- [Post-Deployment Testing](#post-deployment-testing)
- [Troubleshooting](#troubleshooting)
- [Monitoring & Maintenance](#monitoring--maintenance)

---

## 🛠️ Prerequisites

### Required Tools
- **Node.js** 18+ dan npm 9+
- **Git** untuk version control
- **Netlify CLI** untuk local development
- **GitHub/GitLab account** untuk repository hosting
- **Netlify account** (gratis)

### Install Netlify CLI
```bash
npm install -g netlify-cli
```

### Verify Installation
```bash
node --version    # Should be 18+
npm --version     # Should be 9+
netlify --version # Should be latest
```

---

## 💻 Local Development Setup

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/yourusername/alandstore.git
cd alandstore
npm install
```

### 2. Environment Variables
Copy environment template:
```bash
cp .env.example .env
```

Edit `.env` dengan nilai yang sesuai:
```env
# Essential Variables
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
JWT_EXPIRE=7d
BCRYPT_SALT_ROUNDS=12

# API Configuration
API_BASE_URL=http://localhost:3000/api
API_TIMEOUT=10000
```

### 3. Start Local Development
```bash
# Start with Netlify Dev (recommended)
npm run dev

# Or start Express server only
npm run dev:backend
```

Local URLs:
- **Frontend**: http://localhost:8888
- **Backend API**: http://localhost:3000/api
- **Netlify Functions**: http://localhost:8888/.netlify/functions

---

## 🌍 Environment Variables

### Required Variables untuk Production

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `production` | ✅ |
| `JWT_SECRET` | JWT signing secret | `super_secure_32_char_minimum_key` | ✅ |
| `JWT_EXPIRE` | JWT expiration time | `7d` | ✅ |
| `BCRYPT_SALT_ROUNDS` | Bcrypt salt rounds | `12` | ✅ |
| `API_BASE_URL` | API base URL | `https://yoursite.netlify.app/.netlify/functions` | ✅ |

### Security Best Practices untuk Environment Variables

#### ✅ DO:
- Use minimum 32 character JWT secret
- Set BCRYPT_SALT_ROUNDS to 12 atau lebih
- Gunakan strong passwords untuk demo accounts
- Set NODE_ENV ke 'production'

#### ❌ DON'T:
- Jangan commit .env files
- Jangan hardcode secrets di code
- Jangan gunakan weak JWT secrets
- Jangan expose API keys di frontend

### Generate Secure JWT Secret
```bash
# Method 1: OpenSSL
openssl rand -base64 32

# Method 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Method 3: Online (hanya untuk development)
# https://generate-secret.vercel.app/32
```

---

## 🚀 Netlify Deployment

### Method 1: Git-based Deployment (Recommended)

#### 1. Push to GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

#### 2. Connect Netlify ke Repository
1. Login ke [Netlify Dashboard](https://app.netlify.com)
2. Click "New site from Git"
3. Connect GitHub/GitLab
4. Select repository
5. Configure build settings:
   - **Base directory**: (leave blank)
   - **Build command**: (leave blank)
   - **Publish directory**: `frontend`
   - **Functions directory**: `netlify/functions`

#### 3. Environment Variables di Netlify
Go to Site settings → Environment variables:
```
NODE_ENV=production
JWT_SECRET=your_secure_32_character_minimum_secret_key
JWT_EXPIRE=7d
BCRYPT_SALT_ROUNDS=12
```

#### 4. Deploy
Click "Deploy site" - Netlify akan:
- Clone repository
- Install dependencies
- Build functions
- Deploy ke global CDN

### Method 2: CLI Deployment

#### 1. Login Netlify CLI
```bash
netlify login
```

#### 2. Initialize Site
```bash
netlify init
```

#### 3. Deploy
```bash
# Preview deployment
netlify deploy

# Production deployment
netlify deploy --prod
```

### Method 3: Manual Upload (Not Recommended)
```bash
# Build project
npm run build

# Deploy manual
netlify deploy --prod --dir=frontend
```

---

## 🔒 Security Configuration

### 1. Content Security Policy (CSP)
File `netlify.toml` sudah dikonfigurasi dengan CSP yang restrictive:
```toml
Content-Security-Policy = '''
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https:;
  connect-src 'self' https:;
'''
```

### 2. Security Headers
Automatic security headers:
- `X-Frame-Options: DENY` - Prevent clickjacking
- `X-Content-Type-Options: nosniff` - Prevent MIME sniffing
- `X-XSS-Protection: 1; mode=block` - XSS protection
- `Referrer-Policy: strict-origin-when-cross-origin`

### 3. HTTPS & SSL
- **Auto SSL**: Netlify provides automatic SSL certificates
- **Force HTTPS**: All HTTP traffic redirected to HTTPS
- **HSTS**: HTTP Strict Transport Security enabled

### 4. Function Security
- **JWT Authentication**: All protected endpoints require valid JWT
- **Rate Limiting**: Prevent abuse dengan client-side rate limiting
- **Input Validation**: Comprehensive input sanitization
- **Error Handling**: No sensitive data leaked di error messages

### 5. CORS Configuration
```javascript
// Configured di functions untuk security
Access-Control-Allow-Origin: *  // Ubah ke domain spesifik untuk production
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## 🧪 Post-Deployment Testing

### 1. Functional Testing

#### Test Authentication
```bash
# Register new user
curl -X POST https://yoursite.netlify.app/.netlify/functions/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"Test123!","fullName":"Test User"}'

# Login
curl -X POST https://yoursite.netlify.app/.netlify/functions/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

#### Test Products API
```bash
# Get products (public)
curl https://yoursite.netlify.app/.netlify/functions/products

# Get products with filters
curl "https://yoursite.netlify.app/.netlify/functions/products?category=Electronics&limit=5"
```

#### Test Protected Endpoints
```bash
# Test dengan JWT token
curl -X POST https://yoursite.netlify.app/.netlify/functions/orders-create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"items":[{"productId":1,"quantity":2}],"shippingAddress":{}}'
```

### 2. Security Testing

#### Check Security Headers
```bash
curl -I https://yoursite.netlify.app
```

Expected headers:
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'...
```

#### Test Rate Limiting
```bash
# Test multiple rapid requests
for i in {1..10}; do
  curl https://yoursite.netlify.app/.netlify/functions/products &
done
```

### 3. Performance Testing
- **Lighthouse**: Test di Chrome DevTools
- **GTmetrix**: https://gtmetrix.com/
- **PageSpeed**: https://pagespeed.web.dev/

Target Metrics:
- **Performance Score**: 90+
- **First Contentful Paint**: <2s
- **Largest Contentful Paint**: <3s
- **Cumulative Layout Shift**: <0.1

---

## 🐛 Troubleshooting

### Common Issues & Solutions

#### 1. Function Deployment Errors
```
Error: Cannot find module 'bcryptjs'
```
**Solution**: Add dependencies ke `package.json`:
```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2"
  }
}
```

#### 2. CORS Errors
```
Access to fetch blocked by CORS policy
```
**Solution**: Check `netlify.toml` CORS headers:
```toml
[[headers]]
  for = "/.netlify/functions/*"
  [headers.values]
    Access-Control-Allow-Origin = "*"
```

#### 3. Function Timeout
```
Task timed out after 10.00 seconds
```
**Solution**: Optimize function performance atau increase timeout:
```toml
[functions]
  timeout = 26  # Max for Pro tier
```

#### 4. JWT Errors
```
jwt malformed / invalid signature
```
**Solution**: 
- Check JWT_SECRET di environment variables
- Ensure same secret di development dan production
- Check token format di Authorization header

#### 5. Environment Variables Not Working
**Solution**:
1. Check di Netlify dashboard: Site settings → Environment variables
2. Redeploy site setelah adding variables
3. Clear browser cache
4. Check variable names (case sensitive)

### Debug Mode
Enable debug logging:
```javascript
// Add di function untuk debugging
console.log('Environment:', process.env.NODE_ENV);
console.log('JWT Secret exists:', !!process.env.JWT_SECRET);
```

View logs:
```bash
netlify functions:log
```

---

## 📊 Monitoring & Maintenance

### 1. Netlify Analytics
Enable di Site settings → Analytics:
- **Page views**
- **Unique visitors**
- **Top pages**
- **Referrers**
- **Device types**

### 2. Function Usage
Monitor di Functions tab:
- **Invocations per day**
- **Runtime duration**
- **Error rates**
- **Memory usage**

### 3. Performance Monitoring
- **Core Web Vitals**: Monitor via Google Search Console
- **Uptime Monitoring**: Use services like UptimeRobot
- **Error Tracking**: Implement Sentry atau similar

### 4. Security Monitoring
- **SSL Certificate**: Auto-renewal by Netlify
- **Security Headers**: Test monthly
- **Dependency Updates**: Update npm packages regularly
- **Access Logs**: Monitor untuk suspicious activity

### 5. Backup Strategy
- **Code**: Git repository (automatic)
- **Functions**: Deployed code (automatic)
- **User Data**: Implement periodic exports (manual)
- **Environment Variables**: Backup securely (manual)

### 6. Update Process
```bash
# Update dependencies
npm update
npm audit fix

# Test locally
npm run dev

# Deploy updates
git add .
git commit -m "Update dependencies"
git push origin main
```

---

## 🔄 CI/CD Pipeline

### Automatic Deployment
Netlify automatically deploys ketika:
- Push ke main branch
- Pull request created (deploy previews)
- Manual trigger di dashboard

### Deploy Previews
- Every pull request gets unique preview URL
- Test changes before merging
- Share dengan team untuk review

### Branch Deployments
- Feature branches dapat di-deploy
- Custom domains untuk staging
- Independent environments

---

## 📞 Support & Resources

### Documentation
- [Netlify Docs](https://docs.netlify.com/)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
- [Netlify CLI](https://cli.netlify.com/)

### Community
- [Netlify Community](https://community.netlify.com/)
- [Discord](https://discord.gg/netlify)
- [GitHub Issues](https://github.com/netlify/cli/issues)

### Professional Support
- **Pro Plan**: Priority support
- **Business Plan**: SLA & dedicated support
- **Enterprise**: Custom support options

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] Code tested locally
- [ ] All environment variables configured
- [ ] Security headers verified
- [ ] Performance optimized
- [ ] Error handling implemented
- [ ] Dependencies updated

### Deployment
- [ ] Repository connected to Netlify
- [ ] Build settings configured
- [ ] Environment variables set
- [ ] Functions deployed successfully
- [ ] Domain configured (custom domain)
- [ ] SSL certificate active

### Post-Deployment
- [ ] All endpoints tested
- [ ] Authentication working
- [ ] Security headers active
- [ ] Performance metrics good
- [ ] Error monitoring setup
- [ ] Analytics enabled
- [ ] Backup strategy in place

### Production Readiness
- [ ] Demo accounts working
- [ ] All features functional
- [ ] Mobile responsive
- [ ] Cross-browser tested
- [ ] SEO optimized
- [ ] Documentation complete

---

## 🎯 Production Recommendations

### Performance
- Enable **Netlify CDN** untuk global delivery
- Use **Image Optimization** untuk faster loading
- Implement **Service Worker** untuk offline support
- Enable **Prerender** untuk SEO

### Security
- Use **Custom Domain** dengan SSL
- Enable **Security Headers** monitoring
- Implement **Content Security Policy** logging
- Regular **Security Audits**

### Scalability
- Monitor **Function Usage** limits
- Plan untuk **Bandwidth** requirements
- Consider **Database** upgrade untuk real data
- Implement **Caching** strategies

### User Experience
- Setup **Error Pages** (404, 500)
- Enable **Form Handling** untuk contact
- Implement **Progressive Web App** features
- Add **Loading States** dan **Offline Support**

---

**🎉 Selamat! AlandStore siap untuk production deployment!**

Untuk bantuan lebih lanjut, hubungi: support@alandstore.com
