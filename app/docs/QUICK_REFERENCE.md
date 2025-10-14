# 🚀 QUICK REFERENCE - Modular Architecture

**Last Updated:** October 14, 2025  
**Status:** ✅ Production Ready

---

## 📁 **FOLDER STRUCTURE**

```
src/
├── modules/
│   ├── auth/           # Login, Register, Password Reset
│   ├── bookings/       # Room Bookings
│   ├── payments/       # Stripe Payments & Receipts
│   ├── rooms/          # Room Management
│   ├── users/          # User Management
│   ├── admin/          # Admin Dashboard
│   ├── orders/         # Order Processing
│   └── index.js        # Route Loader
├── core/
│   ├── middleware/     # Auth, Security, Logging
│   ├── config/         # Database, Stripe
│   └── utils/          # Logger, Utils
├── bin/www             # Server Entry
└── app.js              # Express App
```

---

## 🔗 **IMPORT PATTERNS**

### **Within Module**
```javascript
const Service = require('../services/MyService');
const Model = require('../models/MyModel');
```

### **Cross-Module**
```javascript
const User = require('../../auth/models/User');
const Room = require('../../rooms/models/Room');
```

### **Core Utilities**
```javascript
const logger = require('../../core/utils/Logger');
const db = require('../../core/config/database');
const { authenticateToken } = require('../../core/middleware/auth');
```

---

## 🚀 **COMMON COMMANDS**

```bash
# Start Development Server
npm run dev

# Start Production Server
npm start

# Test Application Load
node -e "require('./src/app.js'); console.log('✅ OK')"

# Check Syntax
node -c src/app.js
```

---

## 📍 **ROUTE ENDPOINTS**

| Module | Endpoint | Description |
|--------|----------|-------------|
| Auth | `/auth/login` | Login page |
| Auth | `/auth/register` | Register page |
| Auth | `/auth/forgot-password` | Password reset |
| Bookings | `/bookings` | List bookings |
| Bookings | `/bookings/:id` | Booking details |
| Payments | `/payments/create-intent` | Create payment |
| Rooms | `/rooms` | List rooms |
| Admin | `/admin` | Dashboard |

---

## 🔧 **ADDING NEW FEATURE**

```bash
# 1. Create Module
mkdir -p src/modules/myfeature/{controllers,services,models,routes}

# 2. Create Files
touch src/modules/myfeature/controllers/MyController.js
touch src/modules/myfeature/routes/myfeature.routes.js

# 3. Register Route (src/modules/index.js)
router.use('/myfeature', require('./myfeature/routes/myfeature.routes'));
```

---

## 🐛 **TROUBLESHOOTING**

### **Cannot find module**
- Check import path relative to current file
- Use `../../` to go up directories

### **404 on endpoint**
- Check route registration in `src/modules/index.js`
- Verify controller method exists

### **Database connection error**
- Check `.env` file exists
- Verify `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`

---

## 📚 **DOCUMENTATION**

- `MIGRATION_COMPLETE.md` - Full migration report
- `REFACTOR_PLAN.md` - Detailed refactor plan
- `MODULAR_ARCHITECTURE.md` - Architecture overview

---

**Server:** http://localhost:3000  
**Branch:** `refactor/modular-structure`  
**Status:** ✅ **READY**
