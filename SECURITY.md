# 🔒 Security Documentation - AlandStore

## Overview
AlandStore telah dilengkapi dengan berbagai lapisan keamanan untuk melindungi dari serangan umum dan menjaga data tetap aman.

## 🛡️ Security Features Implemented

### 1. **Authentication & Authorization**
- ✅ JWT-based authentication dengan expiration
- ✅ Bcrypt password hashing (12 salt rounds)
- ✅ Role-based access control (Admin/User)
- ✅ Token validation dengan payload verification
- ✅ Generic error messages untuk mencegah user enumeration

### 2. **Input Validation & Sanitization**
- ✅ Express-validator untuk validasi input
- ✅ Input sanitization untuk mencegah XSS
- ✅ SQL injection pattern detection
- ✅ File upload validation dan size limits
- ✅ Parameter pollution protection (HPP)

### 3. **Rate Limiting**
- ✅ General rate limiting: 100 requests/15 minutes
- ✅ Auth endpoints: 5 attempts/15 minutes  
- ✅ Admin endpoints: 20 requests/15 minutes
- ✅ Customizable via environment variables

### 4. **Security Headers**
- ✅ Helmet.js untuk security headers
- ✅ Content Security Policy (CSP)
- ✅ Cross-Origin Resource Policy
- ✅ CORS configuration dengan whitelist

### 5. **Data Protection**
- ✅ Environment variables untuk secrets
- ✅ Secure file operations dengan backup
- ✅ Database backup system (hourly)
- ✅ Logging system untuk security events
- ✅ Sensitive data masking dalam logs

### 6. **Request Security**
- ✅ Body parser size limits (10MB)
- ✅ Suspicious pattern detection
- ✅ Request logging dengan metadata
- ✅ Error handling tanpa stack trace di production

### 7. **Session Management**
- ✅ JWT dengan secure payload
- ✅ Token expiration enforcement
- ✅ Last login tracking
- ✅ Account deactivation support

## 🚀 Deployment Security Checklist

### Before Going Live:

#### 1. **Environment Configuration**
```bash
# Change these in production:
JWT_SECRET=your_super_secure_jwt_secret_key_here_change_this_in_production_2025
BCRYPT_SALT_ROUNDS=12
NODE_ENV=production

# Configure allowed origins:
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

#### 2. **Server Security**
- [ ] Use HTTPS/SSL certificates
- [ ] Configure firewall (UFW/iptables)
- [ ] Use reverse proxy (Nginx/Apache)
- [ ] Enable fail2ban for brute force protection
- [ ] Regular system updates
- [ ] Non-root user untuk aplikasi

#### 3. **Application Security**
- [ ] Change default admin credentials
- [ ] Update JWT_SECRET ke value yang secure
- [ ] Set NODE_ENV=production
- [ ] Configure proper CORS origins
- [ ] Set up monitoring dan alerting

#### 4. **Database Security**
- [ ] Regular backups ke external storage
- [ ] File permissions yang benar (600)
- [ ] Database encryption (jika diperlukan)
- [ ] Backup retention policy

#### 5. **Monitoring & Logging**
- [ ] Setup log rotation
- [ ] Monitor security logs
- [ ] Alerting untuk failed login attempts
- [ ] Disk space monitoring

## 🔧 Production Environment Variables

Buat file `.env` untuk production:

```bash
# Production Configuration
NODE_ENV=production
PORT=3000

# JWT Configuration (CHANGE THIS!)
JWT_SECRET=your_very_secure_random_string_here_minimum_32_characters
JWT_EXPIRE=24h

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50

# Security
BCRYPT_SALT_ROUNDS=12

# Database
DB_BACKUP_INTERVAL=3600000

# CORS (UPDATE WITH YOUR DOMAIN)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Admin (CHANGE THESE!)
DEFAULT_ADMIN_EMAIL=your-admin@yourdomain.com
DEFAULT_ADMIN_PASSWORD=very_secure_password_here
```

## 📝 Security Logs

### Log Files Location:
- Security events: `backend/logs/security.log`
- Error events: `backend/logs/error.log`
- Database backups: `backend/backups/`

### Log Monitoring:
```bash
# Monitor security events
tail -f backend/logs/security.log

# Check for failed login attempts
grep "Failed login attempt" backend/logs/security.log

# Monitor suspicious requests
grep "Suspicious Request" backend/logs/security.log
```

## 🚨 Incident Response

### If You Detect Suspicious Activity:

1. **Immediate Actions:**
   - Check security logs
   - Verify database integrity
   - Change JWT secret if compromised
   - Disable affected user accounts

2. **Investigation:**
   - Review access logs
   - Check for data breaches
   - Analyze attack patterns
   - Document findings

3. **Recovery:**
   - Restore from backup if needed
   - Update security measures
   - Notify users if required
   - Implement additional protections

## 🛠️ Security Tools & Commands

### Generate Secure JWT Secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Check File Permissions:
```bash
ls -la backend/data/
ls -la backend/logs/
```

### Monitor Process:
```bash
# Check if server is running
ps aux | grep node

# Monitor resource usage
top -p $(pgrep node)
```

## 📞 Security Contacts

If you discover security vulnerabilities:
- Email: security@alandstore.com  
- Create secure backup sebelum melaporkan
- Gunakan responsible disclosure

## 🔄 Security Updates

Regular security maintenance:
- [ ] Monthly dependency updates
- [ ] Quarterly security review
- [ ] Semi-annual penetration testing
- [ ] Annual security audit

---

**Remember:** Security adalah ongoing process, bukan one-time setup. Selalu monitor, update, dan improve security measures secara berkala.

**Created by:** alandyudhistira 2025  
**Last Updated:** January 2025
