# 🏗️ **JUNRAI KARAOKE WEB APP - MODULAR REFACTOR PLAN**

## **📋 Executive Summary**

This document outlines the comprehensive refactoring plan to transform the Junrai Karaoke webapp from a mixed-structure application into a clean, modular, feature-based architecture following SOLID principles and industry best practices.

---

## **🔍 CURRENT STATE AUDIT**

### **Structural Issues Identified**

#### **1. Redundant Directories**
- ✅ `/services/` (root) - contains only `paymentService.js`, should be in `/src/services/`
- ✅ `/src/routes/legacy/` - contains deprecated auth routes that duplicate functionality
- ✅ Multiple authentication middleware definitions scattered across:
  - `/middleware/auth.js`
  - `/src/middleware/auth.js`
  - `/routes/api/auth.js` (inline definitions)
  - `/src/routes/legacy/api/auth.js`

#### **2. Misplaced Files**
- `/middleware/auth.js` exists outside `/src/`
- Legacy controllers in root `/controllers/` directory
- Root `/app.js` vs `/src/app.js` confusion
- Two `/bin/www` entry points (root and src)

#### **3. Route-Controller Mapping**
**Current Routes:**
- ✅ `/src/routes/auth.js` → `AuthController` (GOOD)
- ❌ `/routes/api/auth.js` → Inline handlers (LEGACY)
- ❌ `/src/routes/legacy/api/auth.js` → Deprecated (REMOVE)
- ✅ `/src/routes/bookings.js` → `BookingController` (GOOD)
- ✅ `/src/routes/payments.js` → `PaymentController` (GOOD)
- ✅ `/src/routes/rooms.js` → `RoomController` (GOOD)
- ✅ `/src/routes/admin.js` → `AdminController` (GOOD)
- ✅ `/src/routes/users.js` → `UserController` (GOOD)

#### **4. Legacy & Unused Endpoints**
- `/routes/api/users.js` - Session-based auth (duplicates `/src/routes/auth.js`)
- `/routes/api/admin.js` - Inline auth middleware (use `/src/middleware/auth.js`)
- `/routes/api/orders.js`, `/routes/api/bookings.js`, etc. - Duplicate functionality

#### **5. View Management Issues**
- Views scattered: `/views/` (root) and `/views/auth/` subfolder
- Module-specific views should live inside module directories
- Shared partials in `/views/partials/` (KEEP GLOBAL)

---

## **🎯 TARGET ARCHITECTURE**

### **Feature-Based Modular Structure**

```
src/
├── modules/
│   ├── auth/
│   │   ├── controllers/
│   │   │   └── AuthController.js
│   │   ├── services/
│   │   │   ├── AuthService.js
│   │   │   └── MailService.js
│   │   ├── models/
│   │   │   └── User.js
│   │   ├── routes/
│   │   │   └── auth.routes.js
│   │   ├── validators/
│   │   │   └── authValidators.js
│   │   ├── views/
│   │   │   ├── forgot-password.ejs
│   │   │   ├── reset-password.ejs
│   │   │   └── auth.ejs
│   │   └── README.md
│   ├── bookings/
│   │   ├── controllers/
│   │   │   └── BookingController.js
│   │   ├── services/
│   │   │   └── BookingService.js
│   │   ├── models/
│   │   │   └── Booking.js
│   │   ├── routes/
│   │   │   └── bookings.routes.js
│   │   ├── validators/
│   │   │   └── bookingValidators.js
│   │   ├── views/
│   │   │   └── bookings.ejs
│   │   └── README.md
│   ├── payments/
│   │   ├── controllers/
│   │   │   └── PaymentController.js
│   │   ├── services/
│   │   │   ├── PaymentService.js
│   │   │   ├── ReceiptService.js
│   │   │   ├── SimpleReceiptService.js
│   │   │   └── UnicodeReceiptService.js
│   │   ├── routes/
│   │   │   └── payments.routes.js
│   │   ├── views/
│   │   │   ├── payment.ejs
│   │   │   ├── payment-success.ejs
│   │   │   └── payment-cancel.ejs
│   │   └── README.md
│   ├── rooms/
│   │   ├── controllers/
│   │   │   └── RoomController.js
│   │   ├── models/
│   │   │   └── Room.js
│   │   ├── routes/
│   │   │   └── rooms.routes.js
│   │   ├── views/
│   │   │   ├── rooms.ejs
│   │   │   └── roomForm.ejs
│   │   └── README.md
│   ├── users/
│   │   ├── controllers/
│   │   │   └── UserController.js
│   │   ├── models/
│   │   │   └── User.js
│   │   ├── routes/
│   │   │   └── users.routes.js
│   │   └── README.md
│   ├── admin/
│   │   ├── controllers/
│   │   │   └── AdminController.js
│   │   ├── routes/
│   │   │   └── admin.routes.js
│   │   ├── views/
│   │   │   └── admin.ejs
│   │   └── README.md
│   ├── orders/
│   │   ├── controllers/
│   │   │   └── OrderController.js
│   │   ├── models/
│   │   │   └── Order.js
│   │   ├── routes/
│   │   │   └── orders.routes.js
│   │   └── README.md
│   └── index.js  # Central module loader
├── core/
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── security.js
│   │   ├── logging.js
│   │   └── errorHandler.js
│   ├── config/
│   │   ├── database.js
│   │   ├── stripe.js
│   │   └── index.js
│   ├── utils/
│   │   ├── Logger.js
│   │   └── Utils.js
│   └── validators/
│       └── (shared validators)
├── public/
│   ├── css/
│   ├── js/
│   └── images/
├── bin/
│   └── www
└── app.js  # Main application entry
```

---

## **📦 MIGRATION PHASES**

### **Phase 0: Immediate Fix (DONE ✅)**
- [x] Fix package.json entry point to `src/bin/www`
- [x] Verify views path in `src/app.js` points to `../views`
- [x] Test `/auth/forgot-password` endpoint

### **Phase 1: Create Module Infrastructure**
```bash
# Create modular directories
mkdir -p src/modules/{auth,bookings,payments,rooms,users,admin,orders}/{controllers,services,models,routes,validators,views}
mkdir -p src/core/{middleware,config,utils,validators}
```

### **Phase 2: Migrate Auth Module (PRIORITY)**

#### **Step 2.1: Move Files**
```bash
# Controllers
mv src/controllers/AuthController.js src/modules/auth/controllers/

# Services
mv src/services/AuthService.js src/modules/auth/services/
mv src/services/MailService.js src/modules/auth/services/

# Models
mv src/models/User.js src/modules/auth/models/

# Routes
mv src/routes/auth.js src/modules/auth/routes/auth.routes.js

# Validators
mv src/validators/authValidators.js src/modules/auth/validators/

# Views
mv views/auth/forgot-password.ejs src/modules/auth/views/
mv views/auth/reset-password.ejs src/modules/auth/views/
mv views/auth.ejs src/modules/auth/views/
```

#### **Step 2.2: Update Imports**
Update `src/modules/auth/routes/auth.routes.js`:
```javascript
const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { authenticateToken } = require('../../../core/middleware/auth');
const authValidators = require('../validators/authValidators');

// Auth page routes
router.get('/forgot-password', AuthController.showForgotPasswordForm);
router.post('/forgot-password', AuthController.handleForgotPassword);
router.get('/reset-password/:token', AuthController.showResetPasswordForm);
router.post('/reset-password/:token', AuthController.handleResetPassword);
router.get('/login', AuthController.showLoginForm);
router.post('/login', authValidators.login, AuthController.login);
router.get('/register', AuthController.showRegisterForm);
router.post('/register', authValidators.register, AuthController.register);

// API routes
router.post('/refresh-token', AuthController.refreshToken);
router.post('/verify-token', AuthController.verifyToken);

// Protected routes
router.post('/logout', authenticateToken, AuthController.logout);
router.get('/profile', authenticateToken, AuthController.getProfile);
router.post('/change-password', authenticateToken, authValidators.changePassword, AuthController.changePassword);

module.exports = router;
```

Update `src/modules/auth/controllers/AuthController.js`:
```javascript
const AuthService = require('../services/AuthService');
const MailService = require('../services/MailService');
const { validationResult } = require('express-validator');

class AuthController {
    // ... controller methods ...
}

module.exports = AuthController;
```

#### **Step 2.3: Create Module README**
Create `src/modules/auth/README.md`:
```markdown
# Auth Module

Handles user authentication, registration, and password recovery.

## Routes

### Page Routes
- `GET /auth/login` → Render login form
- `POST /auth/login` → Handle login credentials
- `GET /auth/register` → Render registration form
- `POST /auth/register` → Create new user account
- `GET /auth/forgot-password` → Render forgot password form
- `POST /auth/forgot-password` → Send reset password email
- `GET /auth/reset-password/:token` → Render reset password form
- `POST /auth/reset-password/:token` → Update user password

### API Routes
- `POST /auth/refresh-token` → Refresh JWT token
- `POST /auth/verify-token` → Verify JWT token validity
- `GET /auth/profile` → Get current user profile (protected)
- `POST /auth/logout` → Logout user (protected)
- `POST /auth/change-password` → Change user password (protected)

## Controller Flow

```
AuthController → AuthService → User Model
             ↘ MailService
```

## Dependencies
- bcryptjs - Password hashing
- jsonwebtoken - JWT token generation
- nodemailer - Email sending
- express-validator - Input validation
```

### **Phase 3: Migrate Other Modules** (Similar Process)
- Bookings module
- Payments module
- Rooms module
- Users module
- Admin module
- Orders module

### **Phase 4: Create Core Infrastructure**
```bash
# Move shared utilities
mv src/middleware/* src/core/middleware/
mv src/config/* src/core/config/
mv src/utils/* src/core/utils/
mv src/validators/* src/core/validators/
```

### **Phase 5: Create Central Module Loader**

Create `src/modules/index.js`:
```javascript
const express = require('express');
const router = express.Router();

// Auto-load all module routes
const authRoutes = require('./auth/routes/auth.routes');
const bookingRoutes = require('./bookings/routes/bookings.routes');
const paymentRoutes = require('./payments/routes/payments.routes');
const roomRoutes = require('./rooms/routes/rooms.routes');
const userRoutes = require('./users/routes/users.routes');
const adminRoutes = require('./admin/routes/admin.routes');
const orderRoutes = require('./orders/routes/orders.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);
router.use('/rooms', roomRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/orders', orderRoutes);

module.exports = router;
```

### **Phase 6: Update Main App.js**

Update `src/app.js`:
```javascript
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

// Load environment variables
require('dotenv').config();

// Import core utilities
const config = require('./core/config');
const logger = require('./core/utils/Logger');
const { testConnection } = require('./core/config/database');

// Import core middleware
const { 
    cors, 
    helmet, 
    createRateLimiter, 
    errorHandler, 
    notFound 
} = require('./core/middleware/security');

const { 
    requestLogger, 
    responseTime, 
    requestId 
} = require('./core/middleware/logging');

// Import modular routes
const moduleRoutes = require('./modules');

// Import legacy routes (temporary)
const indexRouter = require('../routes/index');

const app = express();

// Test database connection on startup
testConnection().then(isConnected => {
    if (isConnected) {
        logger.info('Database connection established successfully');
    } else {
        logger.error('Failed to establish database connection');
    }
});

// View engine setup
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');

// Security middleware
app.use(helmet);
app.use(cors);
app.use(createRateLimiter());

// Logging middleware
app.use(requestId);
app.use(responseTime);
app.use(requestLogger(config.server.env));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Mount modular routes
app.use('/', moduleRoutes);

// Legacy routes (temporary for backward compatibility)
app.use('/', indexRouter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: config.server.env,
        version: process.env.npm_package_version || '2.0.0'
    });
});

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

module.exports = app;
```

### **Phase 7: Cleanup Legacy Files**

Delete deprecated files:
```bash
# Legacy routes
rm -rf src/routes/legacy/
rm -rf routes/api/

# Redundant services
rm services/paymentService.js  # Use src/modules/payments/services/PaymentService.js

# Old app.js (if not used)
# rm app.js  # Only if src/app.js is confirmed as main entry
```

### **Phase 8: ES Modules Migration (FUTURE)**

Convert to ES Modules syntax:
```javascript
// Before (CommonJS)
const express = require('express');
module.exports = router;

// After (ES Modules)
import express from 'express';
export default router;
```

Update `package.json`:
```json
{
  "type": "module"
}
```

---

## **🧪 TESTING STRATEGY**

### **After Each Phase:**

1. **Run Server:**
   ```bash
   npm run dev
   ```

2. **Test Critical Endpoints:**
   ```bash
   # Auth endpoints
   curl -i http://localhost:3000/auth/forgot-password
   curl -i http://localhost:3000/auth/login
   curl -i -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"password"}'
   
   # Booking endpoints
   curl -i http://localhost:3000/bookings
   
   # Admin endpoints
   curl -i http://localhost:3000/admin
   ```

3. **Check Logs:**
   ```bash
   tail -f logs/app.log
   ```

---

## **📊 MIGRATION CHECKLIST**

### **Phase 0: Immediate Fix**
- [x] Update package.json to use `src/bin/www`
- [x] Verify views path in `src/app.js`
- [x] Test `/auth/forgot-password` endpoint

### **Phase 1: Infrastructure**
- [ ] Create `src/modules/` directory structure
- [ ] Create `src/core/` directory structure
- [ ] Create module subdirectories (controllers, services, models, routes, validators, views)

### **Phase 2: Auth Module**
- [ ] Move AuthController to `src/modules/auth/controllers/`
- [ ] Move AuthService & MailService to `src/modules/auth/services/`
- [ ] Move User model to `src/modules/auth/models/`
- [ ] Move auth routes to `src/modules/auth/routes/auth.routes.js`
- [ ] Move authValidators to `src/modules/auth/validators/`
- [ ] Move auth views to `src/modules/auth/views/`
- [ ] Update all import paths in auth module
- [ ] Create `src/modules/auth/README.md`
- [ ] Test auth endpoints

### **Phase 3: Other Modules**
- [ ] Migrate bookings module
- [ ] Migrate payments module
- [ ] Migrate rooms module
- [ ] Migrate users module
- [ ] Migrate admin module
- [ ] Migrate orders module

### **Phase 4: Core Infrastructure**
- [ ] Move middleware to `src/core/middleware/`
- [ ] Move config to `src/core/config/`
- [ ] Move utils to `src/core/utils/`
- [ ] Move validators to `src/core/validators/`

### **Phase 5: Central Loader**
- [ ] Create `src/modules/index.js`
- [ ] Register all module routes
- [ ] Test route mounting

### **Phase 6: Update App.js**
- [ ] Update `src/app.js` with new imports
- [ ] Mount modular routes
- [ ] Remove old route definitions

### **Phase 7: Cleanup**
- [ ] Delete `src/routes/legacy/`
- [ ] Delete root `/routes/api/`
- [ ] Delete root `/services/paymentService.js`
- [ ] Delete root `/middleware/` (if empty)

### **Phase 8: Documentation**
- [ ] Update main README.md
- [ ] Create module READMEs
- [ ] Document API endpoints
- [ ] Update deployment guide

---

## **🚨 ROLLBACK PLAN**

If issues occur during migration:

1. **Create backup branch before starting:**
   ```bash
   git checkout -b backup/pre-refactor
   git push origin backup/pre-refactor
   ```

2. **If problems occur, revert:**
   ```bash
   git checkout main
   git merge backup/pre-refactor
   ```

3. **Keep legacy routes working** during transition period

---

## **💡 BEST PRACTICES**

1. **One Module at a Time** - Migrate and test incrementally
2. **Keep Legacy Routes Working** - Don't break existing functionality
3. **Test After Each Change** - Ensure endpoints work
4. **Document Changes** - Update README for each module
5. **Use Feature Branches** - Create branches for each phase
6. **Backup Before Changes** - Always have rollback option

---

## **📚 MAINTAINER NOTES**

### **After Full Migration:**

- All routes follow RESTful conventions
- Each module is self-contained
- Shared utilities are in `src/core/`
- Views are co-located with their modules
- Documentation lives with each module
- Easy to add new features (just create new module)
- Clear separation of concerns
- SOLID principles followed

### **Adding New Features:**

1. Create new module directory under `src/modules/`
2. Add controllers, services, models, routes, views
3. Register routes in `src/modules/index.js`
4. Create module README.md
5. Test endpoints
6. Deploy

---

## **✅ SUCCESS CRITERIA**

Migration is complete when:

- ✅ All endpoints return 200 (not 404)
- ✅ All module READMEs exist
- ✅ No legacy routes remain
- ✅ All imports use correct paths
- ✅ Views render correctly
- ✅ Tests pass
- ✅ Documentation is updated
- ✅ Code follows DRY, KISS, SOLID principles

---

**Last Updated:** October 14, 2025  
**Author:** Senior Node.js Architect  
**Version:** 1.0
