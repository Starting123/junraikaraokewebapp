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