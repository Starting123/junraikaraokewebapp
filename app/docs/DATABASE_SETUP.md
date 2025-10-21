# Junrai Karaoke Database Setup

## 🎤 Complete Database Schema with Time Slot Booking System

This database includes a complete karaoke room booking system with cinema-style time slot selection.

## 📋 Features

### ✅ Core System
- User Authentication & Authorization
- Room Management with Types & Pricing
- Booking System with Real-time Status Updates
- Payment Integration Ready

### ✨ Time Slot Booking System
- **Cinema-style Interface** - Select time slots like movie seats
- **Fixed Time Slots** - Configurable slot duration (default: 1 hour)
- **Break Time Management** - Automatic breaks between bookings (default: 10 min)
- **Per-room Operating Hours** - Customizable open/close times
- **Real-time Availability** - Live conflict checking and prevention
- **Responsive UI** - Works on all devices

## 🚀 Quick Setup

### 1. Create Database & Import Schema
```sql
-- Create database
CREATE DATABASE junraikaraokedatabase CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

-- Use the database
USE junraikaraokedatabase;

-- Import the complete schema
SOURCE junraikaraokedatabase.sql;
```

### 2. Verify Time Slot Configuration
```sql
-- Check rooms with time slot settings
SELECT room_id, name, open_time, close_time, slot_duration, break_duration 
FROM rooms;

-- Example output:
-- room_id | name      | open_time | close_time | slot_duration | break_duration
-- 1       | ห้อง A1   | 11:00:00  | 21:00:00   | 60           | 10
-- 6       | ห้อง VIP1 | 10:00:00  | 22:00:00   | 60           | 10
```

### 3. Test Time Slot Generation
The system automatically generates time slots based on:
- **Regular Rooms**: 11:00-21:00 (10 slots)
- **VIP Rooms**: 10:00-22:00 (12 slots)
- **Slot Duration**: 60 minutes each
- **Break Time**: 10 minutes between slots

## 🏗️ Database Structure

### Core Tables
- `users` - User accounts and authentication
- `rooms` - Room information with time slot settings
- `room_types` - Room categories and pricing
- `bookings` - Booking records with datetime slots
- `login_logs` - User activity tracking

### Time Slot Columns in `rooms`
```sql
open_time TIME DEFAULT '11:00:00'        -- Room opening time
close_time TIME DEFAULT '21:00:00'       -- Room closing time  
slot_duration INT DEFAULT 60             -- Slot length in minutes
break_duration INT DEFAULT 10            -- Break time in minutes
```

### Optimized Indexes
- `idx_room_time` - Fast room+time queries
- `idx_time_range` - Efficient time range searches
- `idx_room_time_slots` - Quick slot generation

## 🎯 API Endpoints

### Time Slot Management
- `GET /api/rooms/:id/slots?date=YYYY-MM-DD` - Get available slots
- `POST /api/rooms/:id/slots/check` - Check slot availability
- `GET /api/rooms/:id/slots/available` - Get next available slots
- `POST /api/bookings` - Create booking with time slots

### Example API Usage
```javascript
// Get time slots for room 1 on specific date
fetch('/api/rooms/1/slots?date=2025-10-04')
  .then(res => res.json())
  .then(data => console.log(data.slots));

// Create booking with time slot
fetch('/api/bookings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    room_id: 1,
    start_datetime: '2025-10-04T13:00:00',
    end_datetime: '2025-10-04T14:00:00'
  })
});
```

## 🎨 Frontend Components

### Cinema-Style UI
- **Time Slot Grid** - Visual slot selection
- **Legend System** - Available/Booked/Selected/Past status
- **Real-time Updates** - Live availability checking
- **Responsive Design** - Mobile-friendly interface

### File Locations
- **CSS**: `public/stylesheets/bookings.css`
- **JavaScript**: `public/javascripts/timeSlotBooking.js`
- **Template**: `views/bookings.ejs`

## ⚙️ Configuration

### Default Time Slot Settings
```javascript
// Standard Rooms
open_time: '11:00:00'     // 11 AM
close_time: '21:00:00'    // 9 PM
slot_duration: 60         // 1 hour
break_duration: 10        // 10 minutes

// VIP Rooms  
open_time: '10:00:00'     // 10 AM
close_time: '22:00:00'    // 10 PM
```

### Customizing Time Slots
```sql
-- Update specific room's time settings
UPDATE rooms SET 
  open_time = '09:00:00',
  close_time = '23:00:00',
  slot_duration = 90,
  break_duration = 15
WHERE room_id = 1;
```

## 🧪 Sample Data

The database includes sample data for testing:
- **6 Rooms** with different types and capacities
- **4 Room Types** with pricing
- **Sample Bookings** for current date testing
- **Test Users** with different roles

## 🔧 Troubleshooting

### Common Issues
1. **Time slots not showing**: Check room `open_time`/`close_time` settings
2. **Booking conflicts**: Verify datetime format and availability checking
3. **UI not loading**: Ensure JavaScript files are properly included

### Database Validation
```sql
-- Check if time slot columns exist
DESCRIBE rooms;

-- Verify sample bookings
SELECT * FROM bookings WHERE date(start_time) = CURDATE();

-- Test room availability
SELECT room_id, name, open_time, close_time FROM rooms WHERE status = 'available';
```

---

🎉 **Your Junrai Karaoke Time Slot Booking System is ready!**

Visit `/bookings` to see the cinema-style interface in action.