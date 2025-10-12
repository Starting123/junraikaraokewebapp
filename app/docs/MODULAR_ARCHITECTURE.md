# Junrai Karaoke Web Application

## 📁 โครงสร้าง Modular Architecture

```
app/
├── src/                          # ซอร์สโค้ดหลัก (Modular Structure)
│   ├── config/                   # การตั้งค่าทั้งหมด
│   │   ├── index.js             # ค่าตั้งค่าหลัก
│   │   ├── database.js          # การตั้งค่าฐานข้อมูล
│   │   └── stripe.js            # การตั้งค่า Stripe
│   ├── controllers/             # Controllers (Business Logic)
│   │   ├── AuthController.js    # จัดการเรื่อง Authentication
│   │   ├── BookingController.js # จัดการเรื่องการจอง
│   │   └── PaymentController.js # จัดการเรื่องการชำระเงิน
│   ├── models/                  # Models (Data Layer)
│   │   ├── User.js             # User model
│   │   ├── Booking.js          # Booking model
│   │   ├── Room.js             # Room model
│   │   └── Order.js            # Order model
│   ├── services/               # Services (Business Logic Layer)
│   │   ├── AuthService.js      # บริการเรื่อง Authentication
│   │   ├── BookingService.js   # บริการเรื่องการจอง
│   │   └── PaymentService.js   # บริการเรื่องการชำระเงิน
│   ├── routes/                 # API Routes
│   │   ├── auth.js            # เส้นทาง Authentication
│   │   ├── bookings.js        # เส้นทางการจอง
│   │   └── payments.js        # เส้นทางการชำระเงิน
│   ├── middleware/             # Middleware
│   │   ├── auth.js           # Authentication middleware
│   │   ├── security.js       # Security middleware
│   │   └── logging.js        # Logging middleware
│   ├── validators/             # Data Validation
│   │   ├── authValidators.js   # Validation สำหรับ Auth
│   │   └── bookingValidators.js # Validation สำหรับ Booking
│   ├── utils/                  # Utilities
│   │   ├── Utils.js           # Helper functions
│   │   └── Logger.js          # Logging utility
│   ├── bin/                   # Server startup
│   │   └── www                # Server entry point
│   └── app.js                 # Main application file
├── tests/                     # Test files
├── docs/                      # Documentation
├── scripts/                   # Utility scripts
├── logs/                      # Log files (generated)
├── public/                    # Static files (unchanged)
├── views/                     # EJS templates (unchanged)
├── routes/                    # Legacy routes (for compatibility)
└── package.json              # Dependencies และ scripts
```

## 🏗️ Architecture Layers

### 1. **Presentation Layer**
- **Routes**: จัดการ HTTP requests และ responses
- **Controllers**: จัดการ request/response และเรียก Services
- **Middleware**: Authentication, Validation, Security

### 2. **Business Logic Layer**
- **Services**: Business logic หลักของแอปพลิเคชัน
- **Validators**: ตรวจสอบข้อมูลที่ส่งเข้ามา

### 3. **Data Access Layer**
- **Models**: จัดการข้อมูลและการเชื่อมต่อฐานข้อมูล
- **Config**: การตั้งค่าฐานข้อมูลและ external services

### 4. **Infrastructure Layer**
- **Utils**: Helper functions และ utilities
- **Logger**: Logging system
- **Config**: Application configuration

## 🚀 การใช้งาน

### เรียกใช้แอปพลิเคชัน

```bash
# Development mode (legacy structure)
npm run dev

# Development mode (new modular structure)  
npm run dev:src

# Production mode
npm start
```

### API Endpoints

#### Authentication
```
POST /api/auth/register      # ลงทะเบียน
POST /api/auth/login         # เข้าสู่ระบบ
POST /api/auth/logout        # ออกจากระบบ
GET  /api/auth/profile       # ข้อมูลผู้ใช้
POST /api/auth/change-password # เปลี่ยนรหัสผ่าน
```

#### Bookings
```
POST /api/bookings           # สร้างการจอง
GET  /api/bookings           # ดูรายการการจอง
GET  /api/bookings/:id       # ดูรายละเอียดการจอง
PUT  /api/bookings/:id       # แก้ไขการจอง
DELETE /api/bookings/:id/cancel # ยกเลิกการจอง
GET  /api/bookings/rooms/:room_id/available-slots # ดูช่วงเวลาว่าง
```

#### Payments
```
POST /api/payments/create-intent # สร้าง Payment Intent
POST /api/payments/confirm       # ยืนยันการชำระเงิน
POST /api/payments/cancel        # ยกเลิกการชำระเงิน
POST /api/payments/refund        # คืนเงิน (Admin only)
GET  /api/payments/config        # ข้อมูล Stripe config
```

## 🔧 การพัฒนา

### เพิ่ม Feature ใหม่

1. **สร้าง Model** ใน `src/models/`
2. **สร้าง Service** ใน `src/services/`
3. **สร้าง Controller** ใน `src/controllers/`
4. **สร้าง Routes** ใน `src/routes/`
5. **เพิ่ม Validation** ใน `src/validators/`
6. **เพิ่ม Tests** ใน `tests/`

### การจัดการ Environment Variables

สร้างไฟล์ `.env` จาก `.env.example`:
```bash
cp .env.example .env
```

### Testing

```bash
npm test                # รัน tests ทั้งหมด
npm run test:watch      # รัน tests แบบ watch mode
```

### Linting

```bash
npm run lint           # ตรวจสอบ code style
npm run lint:fix       # แก้ไข code style อัตโนมัติ
```

## 📊 Benefits ของ Modular Architecture

### 1. **Separation of Concerns**
- แต่ละ module มีหน้าที่ชัดเจน
- ง่ายต่อการแก้ไขและบำรุงรักษา

### 2. **Scalability**  
- เพิ่ม feature ใหม่ได้ง่าย
- แยก service ออกเป็น microservices ได้

### 3. **Testability**
- Test แต่ละ layer แยกกันได้
- Mock dependencies ได้ง่าย

### 4. **Reusability**
- Service และ Utils สามารถนำไปใช้ซ้ำได้
- Model สามารถใช้ในหลาย Controller

### 5. **Maintainability**
- โค้ดจัดเป็นหมวดหมู่ชัดเจน
- ค้นหาและแก้ไขง่าย

## 🛠️ Tools และ Libraries

- **Express.js**: Web framework
- **MySQL2**: Database driver
- **JWT**: Authentication
- **Stripe**: Payment processing
- **bcryptjs**: Password hashing
- **Winston**: Logging
- **Helmet**: Security
- **CORS**: Cross-origin requests
- **Express-validator**: Input validation
- **Express-rate-limit**: Rate limiting

## 📝 Next Steps

1. ✅ สร้างโครงสร้าง modular
2. ✅ แยก business logic เป็น services  
3. ✅ สร้าง validation layer
4. ⏳ เขียน unit tests
5. ⏳ สร้าง API documentation
6. ⏳ ตั้งค่า CI/CD
7. ⏳ Docker containerization