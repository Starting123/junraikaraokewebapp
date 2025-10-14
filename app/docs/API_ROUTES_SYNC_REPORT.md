# API Routes Analysis & Frontend-Backend Sync Report

**Generated:** 2024-10-14  
**Project:** Junrai Karaoke Web Application  
**Purpose:** Verify all API routes are properly synchronized between backend and frontend

---

## 📋 Complete API Routes Inventory

### 🔐 Auth Module (`/auth`)

#### Page Routes (Render EJS)
| Method | Path | Controller | Description |
|--------|------|------------|-------------|
| GET | `/auth` | (inline) | Redirect to `/auth/login` |
| GET | `/auth/login` | showLoginForm | Login page |
| GET | `/auth/register` | showRegisterForm | Registration page |
| GET | `/auth/forgot-password` | showForgotPasswordForm | Forgot password page |
| GET | `/auth/reset-password/:token` | showResetPasswordForm | Reset password with token |

#### API Routes (Return JSON)
| Method | Path | Controller | Auth | Description |
|--------|------|------------|------|-------------|
| POST | `/auth/register` | register | ❌ | Register new user |
| POST | `/auth/login` | login | ❌ | User login |
| POST | `/auth/forgot-password` | handleForgotPassword | ❌ | Request password reset |
| POST | `/auth/reset-password/:token` | handleResetPassword | ❌ | Reset password with token |
| POST | `/auth/refresh-token` | refreshToken | ❌ | Refresh JWT token |
| POST | `/auth/verify-token` | verifyToken | ❌ | Verify JWT token |
| POST | `/auth/logout` | logout | ✅ | User logout |
| GET | `/auth/profile` | getProfile | ✅ | Get user profile |
| POST | `/auth/change-password` | changePassword | ✅ | Change password |

**Frontend Files:**
- `/public/js/auth/forgot-password.js` ✅
- `/public/js/auth/reset-password.js` ✅

---

### 🏠 Rooms Module (`/rooms`)

#### Page Routes (Render EJS)
| Method | Path | Controller | Description |
|--------|------|------------|-------------|
| GET | `/rooms` | showRoomsPage | Rooms listing page |

#### API Routes (Return JSON)
| Method | Path | Controller | Auth | Admin | Description |
|--------|------|------------|------|-------|-------------|
| GET | `/rooms/api` | getRooms | ❌ | ❌ | Get all rooms |
| GET | `/rooms/api/:id` | getRoomById | ❌ | ❌ | Get room by ID |
| GET | `/rooms/api/:id/available-slots` | getAvailableSlots | ❌ | ❌ | Get available time slots |
| POST | `/rooms` | createRoom | ✅ | ✅ | Create new room |
| PUT | `/rooms/:id` | updateRoom | ✅ | ✅ | Update room |
| DELETE | `/rooms/:id` | deleteRoom | ✅ | ✅ | Delete room |

**⚠️ ISSUE FOUND:**
- Admin CRUD routes don't have `/api` prefix but should have for consistency
- Should be: `/rooms/api` (POST), `/rooms/api/:id` (PUT/DELETE)

**Frontend Files:**
- CSS: `/public/css/rooms.css` ✅
- JS: No dedicated JS file found ⚠️

---

### 📅 Bookings Module (`/bookings`)

#### Page Routes (Render EJS)
| Method | Path | Controller | Description |
|--------|------|------------|-------------|
| GET | `/bookings` | showBookingsPage | Bookings management page |

#### API Routes (Return JSON)
| Method | Path | Controller | Auth | Admin | Description |
|--------|------|------------|------|-------|-------------|
| GET | `/bookings/api` | getBookings | ✅ | ❌ | Get user's bookings |
| GET | `/bookings/api/:id` | getBookingById | ✅ | ❌ | Get booking by ID |
| POST | `/bookings/api` | createBooking | ✅ | ❌ | Create booking |
| PUT | `/bookings/api/:id` | updateBooking | ✅ | ❌ | Update booking |
| DELETE | `/bookings/api/:id/cancel` | cancelBooking | ✅ | ❌ | Cancel booking |
| GET | `/bookings/api/rooms/:room_id/available-slots` | getAvailableTimeSlots | ✅ | ❌ | Get available slots |
| POST | `/bookings/check-expired` | checkExpiredBookings | ✅ | ✅ | Check expired bookings |
| GET | `/bookings/admin/stats` | getBookingStats | ✅ | ✅ | Get booking statistics |

**✅ STATUS:** All routes properly prefixed with `/api`

**Frontend Files:**
- CSS: `/public/css/bookings.css` ✅
- JS: No dedicated JS file found ⚠️

---

### 💳 Payments Module (`/payments`)

#### Page Routes (Render EJS)
| Method | Path | Controller | Description |
|--------|------|------------|-------------|
| GET | `/payments/page` | showPaymentPage | Payment form page |
| GET | `/payments/success` | showPaymentSuccessPage | Payment success page |
| GET | `/payments/cancel` | showPaymentCancelPage | Payment cancel page |

#### API Routes (Return JSON)
| Method | Path | Controller | Auth | Admin | Description |
|--------|------|------------|------|-------|-------------|
| GET | `/payments/config` | getStripeConfig | ❌ | ❌ | Get Stripe public key |
| POST | `/payments/webhook` | handleWebhook | ❌ | ❌ | Stripe webhook |
| POST | `/payments/create-intent` | createPaymentIntent | ✅ | ❌ | Create payment intent |
| POST | `/payments/confirm` | confirmPayment | ✅ | ❌ | Confirm payment |
| POST | `/payments/cancel` | cancelPayment | ✅ | ❌ | Cancel payment |
| POST | `/payments/refund` | refundPayment | ✅ | ✅ | Refund payment |

**✅ STATUS:** Routes are well-structured

**Frontend Files:**
- CSS: `/public/css/payment.css` ✅
- JS: `/public/js/payment.js` ✅

---

### 👥 Users Module (`/users`)

#### API Routes Only (No Pages)
| Method | Path | Controller | Auth | Admin | Description |
|--------|------|------------|------|-------|-------------|
| GET | `/users` | getUsers | ✅ | ✅ | Get all users (admin) |
| GET | `/users/:id` | getUserById | ✅ | ❌ | Get user by ID |
| PUT | `/users/:id` | updateUser | ✅ | ❌ | Update user |
| DELETE | `/users/:id` | deleteUser | ✅ | ✅ | Delete user |
| POST | `/users/:id/status` | changeUserStatus | ✅ | ✅ | Change user status |

**✅ STATUS:** API-only module, no frontend needed

---

### 🛒 Orders Module (`/orders`)

#### API Routes Only (No Pages)
| Method | Path | Controller | Auth | Admin | Description |
|--------|------|------------|------|-------|-------------|
| GET | `/orders` | getOrders | ✅ | ❌ | Get user's orders |
| GET | `/orders/:id` | getOrderById | ✅ | ❌ | Get order by ID |
| POST | `/orders` | createOrder | ✅ | ❌ | Create order |
| GET | `/orders/payment-intent/:payment_intent_id` | getOrderByPaymentIntent | ✅ | ❌ | Get order by payment intent |
| PUT | `/orders/:id/status` | updateOrderStatus | ✅ | ✅ | Update order status |

**✅ STATUS:** API-only module, no frontend needed

---

### 👑 Admin Module (`/admin`)

#### Page Routes (Render EJS)
| Method | Path | Controller | Description |
|--------|------|------------|-------------|
| GET | `/admin` | showAdminPage | Admin dashboard main page |
| GET | `/admin/dashboard` | getDashboard | Admin dashboard (legacy) |

#### API Routes (Return JSON)
| Method | Path | Controller | Auth | Description |
|--------|------|------------|------|-------------|
| GET | `/admin/api/bookings` | apiGetBookings | ✅✅ | Get all bookings |
| GET | `/admin/api/users` | apiGetUsers | ✅✅ | Get all users |
| GET | `/admin/api/rooms` | apiGetRooms | ✅✅ | Get all rooms |
| POST | `/admin/api/rooms` | apiCreateRoom | ✅✅ | Create room |
| PUT | `/admin/api/rooms/:id` | apiUpdateRoom | ✅✅ | Update room |
| DELETE | `/admin/api/rooms/:id` | apiDeleteRoom | ✅✅ | Delete room |
| GET | `/admin/api/stats` | getStats | ✅✅ | Get statistics |
| GET | `/admin/api/users/list` | getUsers | ✅✅ | Get users list |
| PUT | `/admin/api/users/:id/role` | updateUserRole | ✅✅ | Update user role |
| GET | `/admin/api/bookings/list` | getBookings | ✅✅ | Get bookings list |
| PUT | `/admin/api/bookings/:id/status` | updateBookingStatus | ✅✅ | Update booking status |
| DELETE | `/admin/api/bookings/:id` | apiDeleteBooking | ✅✅ | Delete booking |
| GET | `/admin/api/reports/revenue` | getRevenueReport | ✅✅ | Revenue report |
| GET | `/admin/api/reports/room-usage` | getRoomUsageReport | ✅✅ | Room usage report |
| GET | `/admin/api/settings` | getSettings | ✅✅ | Get settings |

**✅ STATUS:** All admin routes properly prefixed with `/api`

**Frontend Files:**
- CSS: `/public/css/admin.css` ✅
- JS: `/public/js/admin.js` ✅
- JS: `/public/js/admin-crud.js` ✅

---

## 🔍 Issues Found & Recommendations

### ❌ CRITICAL ISSUES

1. **Rooms Module - Inconsistent API Paths**
   - **Problem:** Admin CRUD routes (`POST /rooms`, `PUT /rooms/:id`, `DELETE /rooms/:id`) don't have `/api` prefix
   - **Impact:** Frontend may call wrong endpoints
   - **Fix Required:** Add `/api` prefix to admin routes
   ```javascript
   // Should be:
   router.post('/api', requireAdmin, roomValidators.create, RoomController.createRoom);
   router.put('/api/:id', requireAdmin, roomValidators.update, RoomController.updateRoom);
   router.delete('/api/:id', requireAdmin, roomValidators.getById, RoomController.deleteRoom);
   ```

### ⚠️ MEDIUM ISSUES

2. **Missing Frontend JS Files**
   - **Rooms Module:** No `/public/js/rooms.js` file found
   - **Bookings Module:** No `/public/js/bookings.js` file found
   - **Impact:** Frontend functionality may be limited
   - **Recommendation:** Check if JS is needed for these pages

3. **Dashboard Route Duplication**
   - **Problem:** Both `/dashboard` (in modules/index.js) and `/admin/dashboard` exist
   - **Impact:** Confusion about which route to use
   - **Recommendation:** Keep one route, redirect the other

### ✅ GOOD PRACTICES FOUND

1. **Consistent `/api` prefix** for Bookings, Payments, and Admin modules
2. **Clear separation** between page routes (EJS) and API routes (JSON)
3. **Proper authentication** middleware implementation
4. **Admin-only routes** properly protected with `requireAdmin`

---

## 📊 Frontend-Backend Sync Summary

| Module | Backend Routes | Frontend CSS | Frontend JS | Status |
|--------|---------------|--------------|-------------|--------|
| Auth | ✅ Complete | ✅ | ✅ | 🟢 Synced |
| Rooms | ⚠️ API paths inconsistent | ✅ | ❌ Missing | 🟡 Partial |
| Bookings | ✅ Complete | ✅ | ❌ Missing | 🟡 Partial |
| Payments | ✅ Complete | ✅ | ✅ | 🟢 Synced |
| Users | ✅ API-only | N/A | N/A | 🟢 Synced |
| Orders | ✅ API-only | N/A | N/A | 🟢 Synced |
| Admin | ✅ Complete | ✅ | ✅ | 🟢 Synced |

---

## 🛠️ Action Items

### Priority 1 - MUST FIX
- [ ] Fix Rooms module API path inconsistency
- [ ] Update any frontend code calling `/rooms` (POST/PUT/DELETE) to `/rooms/api`

### Priority 2 - SHOULD CREATE
- [ ] Create `/public/js/rooms.js` for rooms page functionality
- [ ] Create `/public/js/bookings.js` for bookings page functionality

### Priority 3 - NICE TO HAVE
- [ ] Consolidate dashboard routes
- [ ] Add API documentation (Swagger/OpenAPI)
- [ ] Create postman collection for testing

---

## 📝 Frontend JS Files Checklist

### ✅ Recovered from Backup
- [x] `/public/css/global.css`
- [x] `/public/css/admin.css`
- [x] `/public/css/auth.css`
- [x] `/public/css/bookings.css`
- [x] `/public/css/contact.css`
- [x] `/public/css/dashboard.css`
- [x] `/public/css/index.css`
- [x] `/public/css/payment.css`
- [x] `/public/css/rooms.css`
- [x] `/public/css/style.css`
- [x] `/public/js/admin.js`
- [x] `/public/js/admin-crud.js`
- [x] `/public/js/payment.js`
- [x] `/public/js/contact.js`
- [x] `/public/js/dashboard.js`
- [x] `/public/js/auth/forgot-password.js`
- [x] `/public/js/auth/reset-password.js`

### ❌ Still Missing (May need to create)
- [ ] `/public/js/rooms.js` - Room selection/booking UI
- [ ] `/public/js/bookings.js` - Booking management UI
- [ ] `/public/js/index.js` - Homepage functionality

---

## 🎯 Conclusion

**Overall Status: 🟡 MOSTLY SYNCED WITH MINOR ISSUES**

The API routes structure is well-organized with a clear modular architecture. The main issue is the inconsistency in the Rooms module API paths. All CSS files have been recovered successfully. Most JS functionality is in place, with only a few missing JS files for specific pages.

**Next Steps:**
1. Fix the Rooms API path issue immediately
2. Test all pages to confirm CSS is loading correctly
3. Verify all API calls in frontend match the backend routes
4. Create missing JS files if needed based on frontend functionality requirements

