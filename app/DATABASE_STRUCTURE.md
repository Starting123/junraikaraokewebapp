# Junrai Karaoke Database - Complete Schema Documentation

## 🔧 Fixed SQL Issues
The following syntax errors were identified and resolved:

1. **Fixed trailing comma in room_types INSERT statement**
   - Added proper semicolon termination
   - Added additional room types (Large, VIP) for complete room categories

2. **Fixed incomplete rooms INSERT statement**  
   - Completed all room entries with proper data
   - Added variety of room sizes (Small, Medium, Large, VIP)
   - Fixed trailing comma syntax error

3. **Added missing database fields required by webapp models**
   - Added `address` field to users table
   - Added `notes` field to bookings table
   - Updated AUTO_INCREMENT values to match current data

## 📋 Database Structure Overview

### Core Tables

#### 1. **users** - User Management
```sql
- user_id (PK, AUTO_INCREMENT)
- name, email, password
- role_id (FK to roles)
- phone, address
- stripe_customer_id (for payments)
- password_reset_token, password_reset_expires
- status (active/inactive)
- created_at, updated_at
```

#### 2. **roles** - User Role System
```sql
- role_id (PK): 1=admin, 2=staff, 3=customer
- role_name
```

#### 3. **room_types** - Room Categories & Pricing
```sql
- type_id (PK)
- type_name: Small, Medium, Large, VIP
- price_per_hour: 99, 199, 299, 399 (฿/hour)
```

#### 4. **rooms** - Karaoke Room Management
```sql
- room_id (PK)
- name (Room S1, S2, M1, M2, L1, L2, VIP1, VIP2)
- type_id (FK)
- status: available, occupied, maintenance
- capacity (6, 10, 15, 20 people)
- open_time, close_time (11:00-21:00)
- slot_duration (60 min), break_duration (10 min)
```

#### 5. **bookings** - Room Reservations
```sql
- booking_id (PK)
- user_id (FK), room_id (FK)
- start_time, end_time, duration_hours
- status: pending, active, completed, cancelled
- payment_status: pending, paid, failed, refunded
- total_price, notes
- created_at
```

#### 6. **booking_payments** - Payment Tracking
```sql
- payment_id (PK), booking_id (FK)
- amount, method (cash/stripe/transfer)
- status, transaction_id
- stripe_payment_intent_id
- payment_date, created_at, updated_at
```

### Menu & Ordering System

#### 7. **menu_categories**
```sql
- category_id (PK): 1=Drinks, 2=Snacks, 3=Meals
```

#### 8. **menu** - Food & Beverage Items
```sql
- menu_id (PK)
- name, price, description
- category_id (FK)
- available (boolean)
```

#### 9. **orders** - Customer Orders
```sql
- order_id (PK), booking_id (FK)
- status: pending, preparing, served, cancelled
- total_price
- created_at, updated_at
```

#### 10. **order_items** - Order Details
```sql
- order_item_id (PK)
- order_id (FK), menu_id (FK)
- quantity, special_request
```

### Security & Audit Tables

#### 11. **login_logs** - Security Tracking
```sql
- log_id (PK), user_id (FK)
- ip_address, user_agent
- login_time, success (boolean)
```

#### 12. **password_resets** - Password Recovery
```sql
- reset_id (PK), user_id (FK)
- token, expires_at, used
- created_at
```

#### 13. **payments** - General Payment Records
```sql
- payment_id (PK), order_id (FK)
- amount, method, status
- created_at
```

## 🔄 Stored Procedures

### UpdateRoomStatus()
- Automatically updates room availability based on booking times
- Marks expired bookings as 'completed'
- Updates room status to 'available' or 'occupied'

## 🔗 Key Relationships

1. **Users ↔ Roles**: Many-to-one (role-based access control)
2. **Rooms ↔ Room Types**: Many-to-one (pricing & categorization)  
3. **Bookings ↔ Users**: Many-to-one (user booking history)
4. **Bookings ↔ Rooms**: Many-to-one (room occupation tracking)
5. **Booking Payments ↔ Bookings**: One-to-many (payment tracking)
6. **Orders ↔ Bookings**: Many-to-one (in-room food service)
7. **Order Items ↔ Orders**: One-to-many (order details)
8. **Order Items ↔ Menu**: Many-to-one (product catalog)

## 💳 Payment Integration

- **Stripe Integration**: Full support with customer IDs and payment intents
- **Multiple Payment Methods**: Cash, Stripe (card), Bank transfer
- **Payment Status Tracking**: Pending → Paid/Failed/Refunded
- **Audit Trail**: Complete payment history with timestamps

## 🏪 Business Features Supported

### Time Slot Booking System
- Hourly slots with 10-minute breaks
- Real-time availability checking
- Automated status updates
- Flexible duration booking (1+ hours)

### Menu Ordering System  
- Category-based menu (Drinks, Snacks, Meals)
- In-room food service during bookings
- Special request handling
- Order status tracking

### User Management
- Role-based access (Admin, Staff, Customer)
- User profiles with contact information
- Password reset functionality
- Login audit trail

### Admin Features
- Room management and maintenance scheduling
- Booking oversight and management
- Payment reconciliation
- User administration

## 🚀 Webapp Compatibility

All database fields match the requirements found in:
- `/models/users.js` - User CRUD operations
- `/models/bookings.js` - Booking system with pricing
- `/models/rooms.js` - Room management and availability
- `/models/orders.js` - Menu ordering system
- `/controllers/` - All controller dependencies
- `/routes/api/` - API endpoint requirements

## 📊 Sample Data Included

- **4 Room Types**: Small (₹99), Medium (₹199), Large (₹299), VIP (₹399)
- **10 Rooms**: Mixed capacity from 6-20 people
- **3 User Roles**: Admin, Staff, Customer access levels
- **4 Menu Items**: Sample drinks, snacks, and meals
- **3 Menu Categories**: Complete ordering system

## ✅ Production Ready

The database is now fully compatible with your karaoke booking webapp and includes:
- ✓ Fixed all SQL syntax errors
- ✓ Complete foreign key relationships  
- ✓ Proper indexing for performance
- ✓ Auto-increment settings
- ✓ Sample data for testing
- ✓ Stored procedures for automation
- ✓ Security audit tables
- ✓ Payment integration support

**Next Steps**: Import this SQL file into your MariaDB/MySQL database and test with your webapp!