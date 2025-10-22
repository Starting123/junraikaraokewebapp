# Junrai Karaoke Web App - Project Structure & File Descriptions

This README provides a comprehensive overview of the main files and folders in the Junrai Karaoke web application. It explains the purpose and functionality of each major component, helping developers and maintainers understand the architecture and code organization.

---

## Top-Level Files

- **app.js**: Main Express application entry point. Sets up middleware, routes, error handling, and server configuration.
- **package.json**: Node.js project manifest. Lists dependencies, scripts, and metadata.
- **README.md**: This documentation file.
- **nodemon.json**: Configuration for nodemon (auto-restart server on changes).
- **junraikaraokedatabase.sql**: SQL dump for initializing the main database schema.
- **add_otp_columns.sql**: SQL migration script to add OTP-related columns.

---

## Folders & Their Key Files

### bin/
- **www**: Server startup script for Express. Used by app.js to launch the HTTP server.

### config/
- **database.js**: Database connection setup (MySQL). Exports connection/pool for queries.
- **index.js**: Centralized configuration loader (environment variables, app settings).
- **stripe.js**: Stripe payment API configuration and initialization.

### controllers/
- **AdminController.js**: Handles admin dashboard logic, CRUD for rooms, users, bookings, and statistics.
- **AuthController.js**: Manages authentication (login, logout, registration) and logs login events.
- **BookingController.js**: Booking management (create, update, delete, view bookings).
- **OrderController.js**: Handles order-related actions (if separate from bookings).
- **PaymentController.js**: Payment processing, status updates, and integration with Stripe.
- **RoomController.js**: CRUD operations for karaoke rooms.
- **UserController.js**: User management (profile, roles, registration, etc.).

### core/
- **validators/**: Shared validation logic for requests and data models.
- **logs/**: (If present) Core logging utilities or log storage.

### middleware/
- **auth.js**: Authentication middleware (JWT, session checks).
- **logging.js**: Request/response logging middleware.
- **security.js**: Security-related middleware (headers, rate limiting).
- **legacy/auth.js**: Older authentication logic (for backward compatibility).

### models/
- **Booking.js**: Booking data model (ORM or query helpers).
- **Order.js**: Order data model.
- **Room.js**: Room data model.
- **User.js**: User data model.
- **legacy/**: Previous versions of models for migration or reference.

### modules/
Organized by feature for modular development. Each module may contain:
- **models/**: Feature-specific data models.
- **services/**: Business logic and helpers.
- **validators/**: Input validation for module routes.
- **routes/**: API endpoints for the module.
- **views/**: EJS or HTML templates for module UI.

### public/
Static assets for the frontend.
- **css/**: Stylesheets for admin, booking, rooms, global, etc.
- **js/**: Frontend scripts (admin-crud.js, admin.js, payment.js, etc.).
- **legacy/**: Older JS files (e.g., timeSlotBooking.js).
- **images/**, **fonts/**, **uploads/**: Media and file uploads.

### routes/
Express route definitions for each feature.
- **admin.js**: Admin dashboard and management routes.
- **auth.js**: Authentication routes.
- **bookings.js**: Booking management routes.
- **orders.js**: Order management routes.
- **payments.js**: Payment routes.
- **rooms.js**: Room management routes.
- **users.js**: User management routes.
- **legacy/**: Older or API-specific routes.

### services/
Business logic and integrations.
- **AuthService.js**: Authentication and user session logic.
- **BookingService.js**: Booking-related business logic.
- **MailService.js**: Email sending and notifications.
- **PaymentService.js**: Payment processing and status updates.
- **ReceiptService.js**, **SimpleReceiptService.js**, **UnicodeReceiptService.js**: Receipt generation and formatting.
- **legacy/**: Previous service implementations.

### utils/
Utility functions and helpers.
- **LegacyDb.js**: Legacy database helpers.
- **Logger.js**: Logging utility.
- **sendResponse.js**: Standardized API response formatting.
- **Utils.js**: Miscellaneous helpers.

### validators/
Validation logic for requests.
- **authValidators.js**: Validation for authentication-related requests.
- **bookingValidators.js**: Validation for booking-related requests.

### views/
EJS templates for rendering frontend pages.
- **admin.ejs**: Admin dashboard UI.
- **apiTester.ejs**: API testing interface.
- **bookings.ejs**: Booking management UI.
- **contact.ejs**: Contact page.
- **dashboard.ejs**: Main dashboard.
- **error.ejs**: Error page.
- **index.ejs**: Home page.
- **payment.ejs**, **payment-success.ejs**, **payment-cancel.ejs**: Payment flow pages.
- **receipts.ejs**: Receipt viewing page.
- **roomForm.ejs**, **rooms.ejs**: Room management UI.
- **stripe-checkout.ejs**: Stripe payment UI.
- **auth/**: Authentication pages (login, register, forgot/reset password).
- **partials/**: Shared UI components (navbar, etc.).

---

## How the App Works

- The backend (Node.js/Express) serves API endpoints and EJS views.
- Controllers handle business logic and interact with models/services.
- Models represent database tables and provide query helpers.
- Middleware secures routes and logs requests.
- Public folder serves static assets for the frontend.
- Views render dynamic HTML using EJS templates.
- Services encapsulate business logic and integrations (e.g., payments, email).
- Validators ensure incoming data is correct and safe.
- Utilities provide shared helper functions.

---

## Admin Dashboard Features
- Manage rooms, users, bookings, and payments.
- Search and filter functionality for rooms, users, and bookings (including payment status).
- View system statistics and reports.
- Edit and delete records via UI.
- Secure authentication and logging of login events.

---

For more details, see inline comments in each file or contact the project maintainer.
# Junrai Karaoke Booking System

ระบบจองห้องคาราโอเกะออนไลน์สำหรับห้องคาราโอเกะจันไร

## 🎯 คุณสมบัติหลัก

- 🏠 **หน้าแรก**: แสดงข้อมูลห้องคาราโอเกะและบริการ
- 🎤 **จองห้อง**: ระบบจองห้องคาราโอเกะแบบ real-time
- 💳 **ชำระเงิน**: รองรับการชำระเงินผ่าน Stripe
- 🧾 **ใบเสร็จ**: สร้างใบเสร็จ PDF ด้วยฟอนต์ไทย
- 👤 **จัดการผู้ใช้**: ระบบสมาชิกและการยืนยันตัวตน
- 📊 **Admin Dashboard**: จัดการห้อง การจอง และรายงาน
- 📱 **Responsive Design**: รองรับการใช้งานบนมือถือ

## 🛠️ เทคโนโลยีที่ใช้

### Backend
- **Node.js** v16+
- **Express.js** v4.16.1
- **MySQL** v8.0+
- **JWT** สำหรับ authentication

### Frontend
- **EJS** Template Engine
- **Vanilla JavaScript**
- **CSS3** with responsive design
- **Font Awesome** icons

### Payment & PDF
- **Stripe** Payment Gateway
- **PDFKit** สำหรับสร้าง PDF
- **THSarabun** ฟอนต์ไทยสำหรับ PDF

## 📁 โครงสร้างโปรเจค

```
app/
├── src/                          # Main application source
│   ├── controllers/              # Route controllers
│   ├── middleware/               # Auth & security middleware  
│   ├── models/                   # Database models
│   ├── routes/                   # API routes
│   ├── services/                 # Business logic services
│   ├── config/                   # Configuration files
│   └── utils/                    # Utility functions
├── views/                        # EJS templates
├── public/                       # Static files (CSS, JS, images)
├── assets/                       # Font files
├── docs/                         # Documentation
└── logs/                         # Application logs
```

## 🚀 การติดตั้งและใช้งาน

### 1. Clone โปรเจค
```bash
git clone [repository-url]
cd junraikaraokewebapp/app
```

### 2. ติดตั้ง Dependencies
```bash
npm install
```

### 3. ตั้งค่า Environment Variables
```bash
cp .env.example .env
```

แก้ไขไฟล์ `.env`:
```env
# Database
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=junraikaraoke

# JWT
JWT_SECRET=your_jwt_secret_key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Email (สำหรับ reset password)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

### 4. สร้างฐานข้อมูล
```bash
# Import database schema
mysql -u username -p junraikaraoke < junraikaraokedatabase.sql
```

### 5. รันแอปพลิเคชัน
```bash
# Development mode
npm run dev

# Production mode
npm start
```

แอปพลิเคชันจะรันที่ `http://localhost:3000`

## 📋 API Endpoints

### Authentication
- `POST /api/auth/register` - สมัครสมาชิก
- `POST /api/auth/login` - เข้าสู่ระบบ
- `POST /api/auth/forgot-password` - ลืมรหัสผ่าน
- `POST /api/auth/reset-password` - รีเซ็ตรหัสผ่าน

### Bookings
- `GET /api/bookings` - ดูการจองทั้งหมด
- `POST /api/bookings` - สร้างการจองใหม่
- `GET /api/bookings/:id` - ดูรายละเอียดการจอง
- `PUT /api/bookings/:id` - แก้ไขการจอง
- `DELETE /api/bookings/:id` - ยกเลิกการจอง

### Payments
- `POST /api/payments/create-payment-intent` - สร้าง Payment Intent
- `POST /api/payments/confirm-payment` - ยืนยันการชำระเงิน
- `GET /api/payments/my-payments` - ดูประวัติการชำระเงิน

### Receipts
- `GET /api/receipts/download/:filename` - ดาวน์โหลดใบเสร็จ
- `GET /api/receipts/view/:receiptNumber` - ดูใบเสร็จออนไลน์

## 👥 การจัดการผู้ใช้

### สิทธิ์ผู้ใช้
- **Customer**: จองห้อง, ชำระเงิน, ดูใบเสร็จ
- **Admin**: จัดการห้อง, ดูการจองทั้งหมด, รายงาน

### การสร้าง Admin
```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

## 🔧 การพัฒนา

### Script Commands
```bash
npm start          # รัน production server
npm run dev        # รัน development server กับ nodemon
npm test           # รัน tests (ถ้ามี)
```

### การเพิ่มฟีเจอร์ใหม่
1. สร้าง Controller ใน `src/controllers/`
2. สร้าง Service ใน `src/services/`
3. สร้าง Route ใน `src/routes/`
4. เพิ่ม View ใน `views/` (ถ้าจำเป็น)

## 📝 Log Files

แอปพลิเคชันจะสร้าง log files ใน `logs/`:
- `combined.log` - บันทึกทั่วไป
- `error.log` - บันทึกข้อผิดพลาด
- `exceptions.log` - บันทึก exceptions

## 🔒 ความปลอดภัย

- ใช้ HTTPS ใน production
- JWT tokens มี expiration time
- Password hashing ด้วย bcrypt
- Input validation และ sanitization
- Rate limiting สำหรับ API calls

## 📞 การสนับสนุน

สำหรับคำถามหรือปัญหา:
- ดูเอกสารใน `docs/` folder
- ตรวจสอบ logs ในกรณีมีข้อผิดพลาด
- ติดต่อทีมพัฒนา

## 📄 License

โปรเจคนี้ใช้สำหรับการศึกษาและพัฒนาธุรกิจ