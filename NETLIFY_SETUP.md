# 🌍 Netlify Environment Setup Guide

Complete step-by-step guide untuk setup environment variables di Netlify dashboard untuk AlandStore production deployment.

## 📋 Table of Contents

- [Quick Setup](#quick-setup)
- [Manual Dashboard Setup](#manual-dashboard-setup)
- [CLI Setup](#cli-setup)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

---

## ⚡ Quick Setup

### 1. Generate Environment Variables
```bash
# Generate all required environment variables
node scripts/generate-env.js

# Validate local setup
node scripts/validate-env.js --local
```

### 2. Deploy via CLI (Fastest)
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Set environment variables automatically
bash scripts/netlify-env-commands.sh

# Deploy
netlify deploy --prod
```

---

## 🖥️ Manual Dashboard Setup

### Step 1: Access Netlify Dashboard
1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Login dengan GitHub/GitLab/Email account
3. Select your AlandStore site
4. Navigate to **Site settings** → **Environment variables**

### Step 2: Add Required Variables
Click **"Add a variable"** untuk setiap variable berikut:

#### Core Variables (Required)

**NODE_ENV**
```
Variable name: NODE_ENV
Value: production
Scopes: All deployments (default)
```

**JWT_SECRET**
```
Variable name: JWT_SECRET
Value: [COPY FROM scripts/production.env]
Scopes: All deployments
```
*⚠️ Must be minimum 32 characters, cryptographically secure*

**JWT_EXPIRE**
```
Variable name: JWT_EXPIRE
Value: 7d
Scopes: All deployments
```

**BCRYPT_SALT_ROUNDS**
```
Variable name: BCRYPT_SALT_ROUNDS
Value: 12
Scopes: All deployments
```

#### Performance Variables (Optional)

**API_TIMEOUT**
```
Variable name: API_TIMEOUT
Value: 10000
Scopes: All deployments
```

**RATE_LIMIT_WINDOW_MS**
```
Variable name: RATE_LIMIT_WINDOW_MS
Value: 900000
Scopes: All deployments
```

**RATE_LIMIT_MAX_REQUESTS**
```
Variable name: RATE_LIMIT_MAX_REQUESTS
Value: 100
Scopes: All deployments
```

**MAX_FILE_SIZE**
```
Variable name: MAX_FILE_SIZE
Value: 5000000
Scopes: All deployments
```

**LOG_LEVEL**
```
Variable name: LOG_LEVEL
Value: info
Scopes: All deployments
```

### Step 3: Save & Deploy
1. Click **"Save"** after adding all variables
2. Go to **Deploys** tab
3. Click **"Trigger deploy"** → **"Deploy site"**
4. Wait untuk deployment completion

---

## 💻 CLI Setup

### Method 1: Automatic Script
```bash
# Make sure you're in project directory
cd alandstore

# Run the generated script
bash scripts/netlify-env-commands.sh
```

### Method 2: Import from File
```bash
# Import all variables at once
netlify env:import scripts/production.env
```

### Method 3: Manual CLI Commands
```bash
# Set each variable individually
netlify env:set NODE_ENV "production"
netlify env:set JWT_SECRET "YOUR_GENERATED_JWT_SECRET"
netlify env:set JWT_EXPIRE "7d"
netlify env:set BCRYPT_SALT_ROUNDS "12"
netlify env:set API_TIMEOUT "10000"
netlify env:set RATE_LIMIT_WINDOW_MS "900000"
netlify env:set RATE_LIMIT_MAX_REQUESTS "100"
netlify env:set MAX_FILE_SIZE "5000000"
netlify env:set LOG_LEVEL "info"
```

### Deploy After Setting Variables
```bash
# Deploy to production
netlify deploy --prod

# Or trigger build
netlify sites:list
netlify api buildHook --site-id YOUR_SITE_ID
```

---

## ✅ Verification

### 1. Check Environment Variables
```bash
# List all environment variables
netlify env:list

# Check specific variable
netlify env:get JWT_SECRET
```

Expected output:
```
NODE_ENV: production
JWT_SECRET: [value is hidden for security]
JWT_EXPIRE: 7d
BCRYPT_SALT_ROUNDS: 12
...
```

### 2. Test Deployment
```bash
# Check deployment status
netlify status

# View recent deploys
netlify open:admin

# Test functions
curl https://your-site.netlify.app/.netlify/functions/products
```

### 3. Validate Functions
Test authentication endpoint:
```bash
# Test login function
curl -X POST https://your-site.netlify.app/.netlify/functions/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@alandstore.com","password":"admin123"}'
```

Expected response:
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@alandstore.com",
    "role": "admin"
  }
}
```

### 4. Check Function Logs
```bash
# View function logs
netlify functions:log

# Or view in dashboard
netlify open
# Go to Functions tab → View logs
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. "Environment variable not found"
**Problem**: Function returns `process.env.JWT_SECRET is undefined`

**Solutions**:
```bash
# Check if variable is set
netlify env:get JWT_SECRET

# If not set, add it
netlify env:set JWT_SECRET "your_secret_here"

# Redeploy
netlify deploy --prod
```

#### 2. "JWT malformed" atau "Invalid signature"
**Problem**: JWT verification fails

**Solutions**:
- Ensure JWT_SECRET is exactly the same as used untuk signing
- Check secret length (minimum 32 characters)
- No extra spaces atau line breaks di secret

```bash
# Generate new secure secret
openssl rand -base64 32

# Set new secret
netlify env:set JWT_SECRET "NEW_GENERATED_SECRET"
```

#### 3. Function timeout
**Problem**: Functions timeout after 10 seconds

**Solutions**:
- Check BCRYPT_SALT_ROUNDS (if too high, reduce to 12)
- Optimize function performance
- For Pro plan, increase timeout di netlify.toml:

```toml
[functions]
  timeout = 26  # seconds (Pro plan max)
```

#### 4. CORS errors
**Problem**: Browser blocks requests due to CORS

**Solutions**:
```bash
# Check if CORS headers are set correctly
curl -I https://your-site.netlify.app/.netlify/functions/products

# Should include:
# Access-Control-Allow-Origin: *
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

#### 5. "Cannot find module 'bcryptjs'"
**Problem**: Function can't find dependencies

**Solutions**:
- Ensure dependencies are listed in package.json:
```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2"
  }
}
```
- Redeploy to reinstall dependencies

### Debug Mode

Enable debug logging in functions:
```javascript
// Add to your functions untuk debugging
console.log('Environment:', process.env.NODE_ENV);
console.log('JWT Secret exists:', !!process.env.JWT_SECRET);
console.log('JWT Secret length:', process.env.JWT_SECRET?.length);
```

View debug output:
```bash
netlify functions:log --follow
```

### Environment Scopes Issues

If variables work in previews but not production:
1. Check variable scopes di dashboard
2. Ensure "Production" scope is selected
3. Or set scope to "All deployments"

---

## 🔒 Security Best Practices

### Environment Variable Security
- ✅ **Never commit** .env files atau production.env
- ✅ **Use strong secrets** (32+ characters)
- ✅ **Different secrets** per environment
- ✅ **Regular rotation** quarterly
- ✅ **Backup securely** in password manager

### Netlify Security Settings
```bash
# Enable security headers in netlify.toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
```

### Access Control
- Use **deployment contexts** untuk different environments
- Set **sensitive variables** only for production
- Enable **protected branches** in Git
- Use **branch deploy previews** untuk testing

---

## 📊 Monitoring & Maintenance

### Regular Checks
```bash
# Monthly: Check environment variables
netlify env:list

# Quarterly: Rotate JWT secrets
netlify env:set JWT_SECRET "NEW_GENERATED_SECRET"

# As needed: Update API endpoints
netlify env:set API_BASE_URL "https://new-domain.netlify.app/.netlify/functions"
```

### Performance Monitoring
- Monitor function execution times di Netlify dashboard
- Check error rates dan adjust rate limiting
- Monitor bandwidth usage
- Set up uptime monitoring (UptimeRobot, etc.)

### Backup Strategy
1. **Export current variables**:
```bash
netlify env:list > environment-backup-$(date +%Y%m%d).txt
```

2. **Store securely** in password manager
3. **Document changes** dengan dates
4. **Test restore** procedure regularly

---

## 📞 Getting Help

### Netlify Support
- **Community Forum**: [community.netlify.com](https://community.netlify.com)
- **Documentation**: [docs.netlify.com](https://docs.netlify.com)
- **Status Page**: [netlifystatus.com](https://netlifystatus.com)

### AlandStore Support
- **Issues**: Create GitHub issue
- **Documentation**: Check DEPLOYMENT.md
- **Email**: support@alandstore.com

---

## ✅ Final Checklist

### Pre-Deployment
- [ ] All required environment variables generated
- [ ] Variables validated locally
- [ ] Production secrets are secure (32+ chars)
- [ ] No sensitive data in Git repository

### Deployment
- [ ] Environment variables set di Netlify
- [ ] Site deployed successfully
- [ ] No build errors
- [ ] Functions deployed without errors

### Post-Deployment
- [ ] All API endpoints responding
- [ ] Authentication working correctly
- [ ] No environment variable errors di logs
- [ ] Security headers active
- [ ] Performance metrics acceptable

### Ongoing Maintenance
- [ ] Monitor function usage dan errors
- [ ] Regular security updates
- [ ] Quarterly secret rotation
- [ ] Backup environment configuration

---

**🎉 AlandStore is ready for production with secure environment variables!**

For additional help, refer to [DEPLOYMENT.md](DEPLOYMENT.md) and [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md).
