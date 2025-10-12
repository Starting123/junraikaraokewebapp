# 🧪 **AUTHENTICATION TESTING GUIDE**

## 📋 **Pre-Test Setup**

### 1. **Environment Setup**
```bash
# Set required environment variables
$env:JWT_SECRET="test-jwt-secret-key-at-least-32-characters-long-for-security"
$env:SESSION_SECRET="test-session-secret-key-at-least-32-characters-long-for-security"
$env:DB_HOST="127.0.0.1"
$env:DB_USER="root"
$env:DB_PASSWORD=""
$env:DB_NAME="junraikaraokedatabase"
```

### 2. **Create Test Users**
```bash
node create-test-users.js
```

### 3. **Start Development Server**
```bash
npm run dev
```

---

## 🔧 **MANUAL TEST STEPS**

### **Test 1: Basic Login Flow**

#### **Step 1.1: Admin Login**
1. Open browser: `http://localhost:3000/auth`
2. Enter credentials:
   - Email: `admin@test.com`
   - Password: `AdminPass123!`
3. Click "เข้าสู่ระบบ"

**Expected Result:** ✅
- Success message displayed
- Redirect to `/admin` (admin dashboard)
- Session cookie set (`karaoke-session`)

#### **Step 1.2: Regular User Login**
1. Logout first: `http://localhost:3000/logout`
2. Go to: `http://localhost:3000/auth`
3. Enter credentials:
   - Email: `user@test.com`
   - Password: `UserPass123!`
4. Click "เข้าสู่ระบบ"

**Expected Result:** ✅
- Success message displayed
- Redirect to `/dashboard` (user dashboard)
- Session cookie set

---

### **Test 2: Protected Route Access**

#### **Step 2.1: Access Protected Routes (Logged In)**
1. Login as regular user
2. Visit each URL:
   - `http://localhost:3000/dashboard` ✅ Should work
   - `http://localhost:3000/bookings` ✅ Should work
   - `http://localhost:3000/admin` ❌ Should show 403 error

#### **Step 2.2: Access Protected Routes (Not Logged In)**
1. Logout: `http://localhost:3000/logout`
2. Try to access directly:
   - `http://localhost:3000/dashboard` → Should redirect to `/auth?redirect=/dashboard`
   - `http://localhost:3000/bookings` → Should redirect to `/auth?redirect=/bookings`
   - `http://localhost:3000/admin` → Should redirect to `/auth?redirect=/admin`

#### **Step 2.3: Redirect After Login**
1. While logged out, visit: `http://localhost:3000/dashboard`
2. Should redirect to: `/auth?redirect=/dashboard`
3. Login with valid credentials
4. Should redirect back to: `/dashboard`

---

### **Test 3: Session Management**

#### **Step 3.1: Session Persistence**
1. Login successfully
2. Close browser tab (not entire browser)
3. Open new tab, go to `http://localhost:3000/dashboard`
4. Should still be logged in (no redirect)

#### **Step 3.2: Logout Functionality**
1. While logged in, visit: `http://localhost:3000/logout`
2. Should redirect to home page (`/`)
3. Try accessing: `http://localhost:3000/dashboard`
4. Should redirect to login page

#### **Step 3.3: API Session Check**
1. Login via web interface
2. Open browser console (F12)
3. Run: `fetch('/api/auth/me', {credentials: 'include'}).then(r=>r.json()).then(console.log)`
4. Should return user object with `isAdmin` flag

---

### **Test 4: Security Validation**

#### **Step 4.1: Invalid Credentials**
1. Try login with:
   - Email: `admin@test.com`
   - Password: `wrongpassword`
2. Should show error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง"

#### **Step 4.2: SQL Injection Attempts**
1. Try login with:
   - Email: `admin@test.com'; DROP TABLE users; --`
   - Password: `anything`
2. Should safely handle and show invalid credentials error

#### **Step 4.3: Rate Limiting**
1. Try 6 failed login attempts rapidly
2. 6th attempt should show rate limit error
3. Wait 15 minutes or restart server to reset

---

### **Test 5: Role-Based Access**

#### **Step 5.1: Admin Access**
1. Login as: `admin@test.com` / `AdminPass123!`
2. Visit: `http://localhost:3000/admin` ✅ Should work
3. Check API: `fetch('/api/auth/me').then(r=>r.json())` → `isAdmin: true`

#### **Step 5.2: Non-Admin Access**
1. Login as: `user@test.com` / `UserPass123!`
2. Visit: `http://localhost:3000/admin` ❌ Should show 403 error
3. Check API: `fetch('/api/auth/me').then(r=>r.json())` → `isAdmin: false`

---

## 🐛 **TROUBLESHOOTING**

### **Common Issues & Solutions**

| Issue | Symptom | Solution |
|-------|---------|----------|
| **500 Error on Login** | Server crashes on POST /api/auth/login | Check environment variables are set |
| **Session Not Persisting** | Redirected to login after successful auth | Check session secret length (32+ chars) |
| **Admin Access Denied** | 403 error for admin user | Verify role_id=1 in database |
| **Database Connection Error** | Cannot connect to DB | Check DB credentials and server status |
| **CSRF Token Issues** | Form submission fails | API routes skip CSRF, web routes need tokens |

### **Debug Commands**

```bash
# Check environment variables
node -e "console.log('JWT:', !!process.env.JWT_SECRET); console.log('SESSION:', !!process.env.SESSION_SECRET);"

# Test database connection
node -e "const mysql=require('mysql2/promise'); mysql.createConnection({host:'127.0.0.1',user:'root',password:'',database:'junraikaraokedatabase'}).then(()=>console.log('DB OK')).catch(console.error);"

# Check user table
node -e "const mysql=require('mysql2/promise'); (async()=>{const c=await mysql.createConnection({host:'127.0.0.1',user:'root',password:'',database:'junraikaraokedatabase'}); const [users]=await c.query('SELECT email,role_id FROM users LIMIT 5'); console.log(users); c.end();})();"
```

---

## ✅ **SUCCESS CRITERIA**

### **All Tests Must Pass:**
- ✅ Users can login with correct credentials
- ✅ Users cannot login with wrong credentials  
- ✅ Sessions persist across browser tabs
- ✅ Logout destroys sessions properly
- ✅ Protected routes redirect unauthenticated users
- ✅ Admin routes block non-admin users
- ✅ Rate limiting prevents brute force
- ✅ Form fields map correctly to req.body
- ✅ Password hashing works with bcrypt
- ✅ Session regeneration prevents fixation

### **Performance Checks:**
- ✅ Login response < 2 seconds
- ✅ Protected route redirect < 500ms
- ✅ Session check via API < 200ms

---

## 🚀 **PRODUCTION CHECKLIST**

Before deploying to production:

- [ ] Set strong JWT_SECRET (32+ random chars)
- [ ] Set strong SESSION_SECRET (32+ random chars)  
- [ ] Enable HTTPS (secure cookies)
- [ ] Configure database SSL
- [ ] Set up session store (Redis/Database)
- [ ] Enable rate limiting in reverse proxy
- [ ] Configure CORS for production domains
- [ ] Set up monitoring and alerting
- [ ] Regular security updates
- [ ] Backup and recovery procedures

---

*Testing Guide Generated: October 12, 2025*