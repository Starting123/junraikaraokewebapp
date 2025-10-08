# 🧪 JUNRAI KARAOKE - TESTING & VERIFICATION GUIDE

## 📋 **Pre-Deployment Checklist**

### **1. Install Dependencies**
```bash
cd app
npm install

# Install additional security dependencies
npm install helmet cors compression express-mongo-sanitize xss-clean winston
npm install --save-dev jest supertest eslint eslint-config-standard
```

### **2. Database Migration**
```bash
# Run the security migration
mysql -u root -p junraikaraokedatabase < database/migration-001-security-performance.sql

# Verify tables were created
mysql -u root -p -e "USE junraikaraokedatabase; SHOW TABLES; DESCRIBE audit_logs; DESCRIBE login_logs;"
```

### **3. Environment Setup**
```bash
# Copy production environment template
cp .env.production .env

# Edit .env with your actual values
nano .env

# Required changes:
# - JWT_SECRET (generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
# - DB_PASSWORD
# - SMTP credentials
# - Stripe keys (if using payments)
```

## 🔍 **Security Testing**

### **Test 1: Authentication Security**
```bash
# Run auth unit tests
npm run test:unit -- --testNamePattern="Auth"

# Manual testing:
# 1. Try login with wrong password (should be rate limited after 5 attempts)
# 2. Check login_logs table for proper logging
# 3. Verify JWT tokens expire correctly
```

### **Test 2: Input Validation**
```bash
# Test XSS protection
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"<script>alert(1)</script>","email":"test@test.com","password":"Test123!"}'

# Should return sanitized input, not execute script
```

### **Test 3: SQL Injection Protection**
```bash
# Test parameterized queries
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com'\'' OR 1=1--","password":"anything"}'

# Should fail safely without exposing database structure
```

### **Test 4: Rate Limiting**
```bash
# Test login rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"wrong@test.com","password":"wrong"}' \
    -w "Attempt $i: %{http_code}\n"
done

# Should return 429 after 5 attempts
```

## 🎯 **Functionality Testing**

### **Test 5: Admin Dashboard**
```bash
# 1. Navigate to http://localhost:3000/admin (should redirect to login)
# 2. Login with default admin: admin@junraikaraoke.com / AdminSecure123!
# 3. Verify all CRUD operations work for:
#    - Users/Members
#    - Rooms
#    - Bookings
#    - Payments
```

### **Test 6: Payment Flow**
```bash
# Test Thai PDF generation
curl -X POST http://localhost:3000/api/payments/receipt \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"bookingId":1,"customerName":"ทดสอบ ไทย","amount":500}'

# Should generate PDF with Thai characters
```

### **Test 7: File Uploads**
```bash
# Test secure file upload
curl -X POST http://localhost:3000/admin/upload \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "file=@test-image.jpg"

# Verify file validation and storage
```

## 🚀 **Performance Testing**

### **Test 8: Database Performance**
```bash
# Run performance tests
npm run test:integration -- --testNamePattern="Performance"

# Check slow query log
mysql -u root -p -e "
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;
SHOW VARIABLES LIKE 'slow_query%';"
```

### **Test 9: Memory Usage**
```bash
# Monitor memory usage
npm start &
PID=$!
echo "Server PID: $PID"

# Run load test
for i in {1..100}; do
  curl -s http://localhost:3000/ > /dev/null &
done

# Check memory
ps aux | grep node
kill $PID
```

### **Test 10: Asset Loading**
```bash
# Test compression
curl -H "Accept-Encoding: gzip" -s -w "%{size_download} bytes\n" http://localhost:3000/stylesheets/style.css

# Test caching headers
curl -I http://localhost:3000/stylesheets/style.css | grep -E "(Cache-Control|ETag)"
```

## 🔐 **Security Audit**

### **Test 11: Security Headers**
```bash
# Check security headers
curl -I http://localhost:3000/ | grep -E "(X-|Strict-Transport|Content-Security)"

# Expected headers:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 1; mode=block
# Content-Security-Policy: default-src 'self'
```

### **Test 12: Vulnerability Scan**
```bash
# Run npm audit
npm audit --audit-level=moderate

# Check for outdated packages
npm outdated

# Run security audit
npm run security:audit
```

## 📱 **Mobile & Accessibility Testing**

### **Test 13: Responsive Design**
```bash
# Test mobile viewport
curl -A "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)" http://localhost:3000/

# Manual testing:
# 1. Test on mobile devices (320px, 768px, 1024px)
# 2. Check touch targets (minimum 44px)
# 3. Verify text readability
```

### **Test 14: Accessibility**
```bash
# Install accessibility testing tools
npm install -g pa11y

# Run accessibility audit
pa11y http://localhost:3000/
pa11y http://localhost:3000/auth
pa11y http://localhost:3000/rooms
```

## 🌐 **Load Testing**

### **Test 15: Concurrent Users**
```bash
# Install Apache Bench
# Ubuntu: sudo apt install apache2-utils
# macOS: brew install apache2-utils

# Test concurrent users
ab -n 1000 -c 10 http://localhost:3000/

# Test API endpoints
ab -n 500 -c 5 -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/rooms
```

### **Test 16: Database Load**
```bash
# Test database connections
for i in {1..20}; do
  mysql -u root -p -e "SELECT 'Connection $i', NOW();" &
done
wait

# Monitor connection pool
mysql -u root -p -e "SHOW STATUS LIKE 'Threads_%';"
```

## 📊 **Monitoring Setup**

### **Test 17: Logging**
```bash
# Check log files are created
ls -la logs/

# Test log rotation
tail -f logs/combined.log &
curl http://localhost:3000/
# Should see request logged

# Test error logging
curl http://localhost:3000/nonexistent
# Should see 404 error logged
```

### **Test 18: Health Checks**
```bash
# Create health check endpoint test
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","timestamp":"2024-01-01T12:00:00.000Z","uptime":3600}
```

## ✅ **Production Deployment Checklist**

### **Pre-Production**
- [ ] All tests pass (`npm test`)
- [ ] Security audit clean (`npm run security:audit`)
- [ ] Environment variables configured
- [ ] Database migration completed
- [ ] SSL certificate installed
- [ ] Backup system configured
- [ ] Monitoring setup complete

### **Post-Deployment**
- [ ] Health check responds correctly
- [ ] Admin login works
- [ ] Payment flow functional
- [ ] Thai PDF generation works
- [ ] Email notifications sent
- [ ] Error logging functional
- [ ] Performance metrics acceptable

## 🚨 **Troubleshooting Common Issues**

### **Database Connection Issues**
```bash
# Test database connection
node -e "
const db = require('./db');
db.query('SELECT 1 as test')
  .then(result => console.log('✅ Database connected:', result))
  .catch(err => console.error('❌ Database error:', err));
"
```

### **Email Not Sending**
```bash
# Test email configuration
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});
transporter.verify()
  .then(() => console.log('✅ Email configured correctly'))
  .catch(err => console.error('❌ Email error:', err));
"
```

### **Thai Font Issues**
```bash
# Check font files exist
ls -la fonts/NotoSansThai*

# Test Thai text rendering
node -e "
const ThaiPDFGenerator = require('./services/ThaiPDFGenerator');
const generator = new ThaiPDFGenerator();
console.log('Thai font available:', generator.hasThaiFont());
"
```

## 📈 **Performance Benchmarks**

### **Expected Metrics**
- **Response Time**: < 200ms for static pages, < 500ms for API
- **Memory Usage**: < 512MB for 100 concurrent users
- **Database Queries**: < 50ms average response time
- **File Upload**: < 5MB files processed in < 3 seconds
- **PDF Generation**: < 2 seconds for Thai receipts

### **Monitoring Commands**
```bash
# Monitor server resources
top -p $(pgrep node)

# Database performance
mysql -u root -p -e "SHOW FULL PROCESSLIST;"

# Disk usage
df -h
du -sh logs/ public/uploads/
```

---

## 🎯 **Final Verification**

Run this comprehensive test to verify all systems:

```bash
#!/bin/bash
echo "🧪 Running Junrai Karaoke System Verification..."

# 1. Dependencies
echo "📦 Checking dependencies..."
npm list --depth=0 | grep -E "(helmet|cors|winston|jest)"

# 2. Database
echo "🗄️ Testing database..."
mysql -u root -p -e "USE junraikaraokedatabase; SELECT COUNT(*) as users FROM users;"

# 3. Security
echo "🔐 Testing security..."
curl -s -I http://localhost:3000/ | grep -q "X-Content-Type-Options" && echo "✅ Security headers OK"

# 4. API
echo "🌐 Testing API..."
curl -s http://localhost:3000/api/rooms | grep -q "success" && echo "✅ API responding"

# 5. Admin
echo "👨‍💼 Testing admin access..."
curl -s http://localhost:3000/admin | grep -q "login" && echo "✅ Admin protection active"

echo "🎉 System verification complete!"
```

Save as `verify-system.sh`, make executable (`chmod +x verify-system.sh`), and run before deployment.