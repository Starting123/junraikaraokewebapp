# วิธีการรัน Database Migration Script

## วิธีที่ 1: ใช้ MySQL Command Line
```bash
# เข้าสู่ MySQL
mysql -u root -p

# รัน script
source "E:/us workspace/3rddatabaseapp/junraikaraokewebapp/app/database_migration.sql"

# หรือ
mysql -u root -p junraikaraokedatabase < "E:/us workspace/3rddatabaseapp/junraikaraokewebapp/app/database_migration.sql"
```

## วิธีที่ 2: ใช้ phpMyAdmin
1. เปิด phpMyAdmin ในเว็บเบราว์เซอร์
2. เลือกฐานข้อมูล `junraikaraokedatabase`
3. คลิก Tab "SQL"
4. Copy และ paste เนื้อหาจากไฟล์ `database_migration.sql`
5. คลิก "Go" เพื่อรัน script

## วิธีที่ 3: ใช้ MySQL Workbench
1. เปิด MySQL Workbench
2. เชื่อมต่อกับเซิร์ฟเวอร์ MySQL
3. เปิดไฟล์ `database_migration.sql`
4. รัน script โดยกด Ctrl+Shift+Enter

## สิ่งที่ Script จะทำ:
- ✅ เพิ่ม column `receipt_pdf_path` ในตาราง `bookings`
- ✅ เพิ่ม column `proof_of_payment_path` ในตาราง `booking_payments` 
- ✅ อัปเดต enum ของ `method` ให้รองรับ `bank_transfer` และ `qr_code`
- ✅ เพิ่ม indexes เพื่อปรับปรุงประสิทธิภาพ
- ✅ แสดงผลลัพธ์การอัปเดต

## หมายเหตุ:
- Script มีการตรวจสอบว่า columns หรือ indexes มีอยู่แล้วหรือไม่
- สามารถรันซ้ำได้โดยไม่เกิด error
- แสดงผลลัพธ์ให้ดูหลังจากการอัปเดตเสร็จ