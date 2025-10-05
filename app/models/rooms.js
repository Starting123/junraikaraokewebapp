const db = require('../db');

async function list({ q, type_id, status, limit = 100 } = {}) {
  const params = [];
  let sql = `SELECT r.*, rt.type_name, rt.price_per_hour FROM rooms r LEFT JOIN room_types rt ON r.type_id = rt.type_id`;
  const where = [];
  if (q) {
    where.push('(r.name LIKE ? OR rt.type_name LIKE ?)');
    params.push('%' + q + '%', '%' + q + '%');
  }
  if (type_id) {
    where.push('r.type_id = ?');
    params.push(type_id);
  }
  if (status) {
    where.push('r.status = ?');
    params.push(status);
  }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY r.room_id DESC LIMIT ?';
  params.push(limit);
  const [rows] = await db.query(sql, params);
  return rows;
}

async function getById(room_id) {
  const [rows] = await db.query('SELECT r.*, rt.type_name, rt.price_per_hour FROM rooms r LEFT JOIN room_types rt ON r.type_id = rt.type_id WHERE r.room_id = ? LIMIT 1', [room_id]);
  return rows.length ? rows[0] : null;
}

// เพิ่มฟังก์ชันสำหรับอัปเดตสถานะห้องแบบ real-time
async function updateRoomStatus() {
  // เรียก stored procedure UpdateRoomStatus
  await db.query('CALL UpdateRoomStatus()');
  return true;
}

// ตรวจสอบห้องว่าง
async function getAvailableRooms(start_time, end_time) {
  const sql = `
    SELECT r.*, rt.type_name, rt.price_per_hour 
    FROM rooms r 
    LEFT JOIN room_types rt ON r.type_id = rt.type_id 
    WHERE r.room_id NOT IN (
      SELECT DISTINCT room_id 
      FROM bookings 
      WHERE status = 'active' 
      AND NOT (end_time <= ? OR start_time >= ?)
    )
    ORDER BY rt.price_per_hour ASC, r.name ASC
  `;
  const [rows] = await db.query(sql, [start_time, end_time]);
  return rows;
}

// ตรวจสอบความพร้อมของห้องพร้อมข้อมูลการจองที่ขัดแย้ง
async function checkRoomAvailability(room_id, start_time, end_time) {
  // ตรวจสอบการจองที่ขัดแย้ง
  const conflictSql = `
    SELECT b.*, u.name as user_name
    FROM bookings b 
    JOIN users u ON b.user_id = u.user_id
    WHERE b.room_id = ? AND b.status = 'active' 
    AND NOT (b.end_time <= ? OR b.start_time >= ?)
    ORDER BY b.start_time ASC
  `;
  const [conflicts] = await db.query(conflictSql, [room_id, start_time, end_time]);
  
  if (conflicts.length === 0) {
    return { available: true };
  }
  
  // หาเวลาถัดไปที่ห้องจะว่าง
  const nextAvailableSql = `
    SELECT MIN(end_time) as next_available 
    FROM bookings 
    WHERE room_id = ? AND status = 'active' 
    AND end_time > ?
  `;
  const [nextAvailable] = await db.query(nextAvailableSql, [room_id, new Date()]);
  
  return { 
    available: false, 
    conflicts,
    nextAvailable: nextAvailable[0]?.next_available,
    message: `ห้องนี้ถูกใช้งานอยู่ในเวลา ${new Date(conflicts[0].start_time).toLocaleTimeString('th-TH', {hour: '2-digit', minute: '2-digit'})}–${new Date(conflicts[0].end_time).toLocaleTimeString('th-TH', {hour: '2-digit', minute: '2-digit'})}`
  };
}

async function create({ name, type_id, capacity = 1, status = 'available' }) {
  const [result] = await db.query('INSERT INTO rooms (name, type_id, capacity, status) VALUES (?,?,?,?)', [name, type_id, capacity, status]);
  return { insertId: result.insertId };
}

async function update(room_id, fields = {}) {
  const sets = [];
  const params = [];
  for (const k of ['name','type_id','capacity','status']) {
    if (fields[k] !== undefined) { sets.push(`${k} = ?`); params.push(fields[k]); }
  }
  if (!sets.length) return null;
  params.push(room_id);
  await db.query(`UPDATE rooms SET ${sets.join(', ')} WHERE room_id = ?`, params);
  return getById(room_id);
}

// ==========================================
// Time Slots Functions
// ==========================================

/**
 * สร้าง time slots สำหรับห้องตามเวลาเปิด-ปิด
 * @param {number} room_id - ID ของห้อง
 * @param {string} date - วันที่ในรูปแบบ 'YYYY-MM-DD'
 * @returns {Array} array ของ time slots
 */
async function generateTimeSlots(room_id, date = null) {
  // ใช้วันที่ปัจจุบันถ้าไม่ได้ระบุ
  if (!date) {
    date = new Date().toISOString().split('T')[0];
  }
  
  // ดึงข้อมูลห้องและเวลาทำการ
  const room = await getById(room_id);
  if (!room) {
    throw new Error('ไม่พบห้องที่ระบุ');
  }
  
  // ค่าเริ่มต้นถ้าไม่มีข้อมูลเวลาทำการ
  const openTime = room.open_time || '11:00:00';
  const closeTime = room.close_time || '21:00:00';
  const slotDuration = room.slot_duration || 60; // นาที
  const breakDuration = room.break_duration || 10; // นาที
  
  const slots = [];
  
  // แปลงเวลาเป็น Date objects สำหรับการคำนวณ
  const [openHour, openMinute] = openTime.split(':').map(Number);
  const [closeHour, closeMinute] = closeTime.split(':').map(Number);
  
  // สร้าง Date objects ด้วย local time (แก้ไข timezone)
  const startDate = new Date(`${date}T${openTime}`);
  const endDate = new Date(`${date}T${closeTime}`);
  
  let currentTime = new Date(startDate);
  
  while (currentTime < endDate) {
    const slotStart = new Date(currentTime);
    const slotEnd = new Date(currentTime.getTime() + (slotDuration * 60 * 1000));
    
    // ตรวจสอบว่า slot นี้ไม่เกินเวลาปิด
    if (slotEnd <= endDate) {
      // Format time for display (แก้ไขให้ทำงานถูกต้อง)
      const startHour = slotStart.getHours().toString().padStart(2, '0');
      const startMinute = slotStart.getMinutes().toString().padStart(2, '0');
      const endHour = slotEnd.getHours().toString().padStart(2, '0');
      const endMinute = slotEnd.getMinutes().toString().padStart(2, '0');
      
      const startTimeStr = `${startHour}:${startMinute}`;
      const endTimeStr = `${endHour}:${endMinute}`;
      
      slots.push({
        start_time: startTimeStr,
        end_time: endTimeStr,
        start_datetime: slotStart.toISOString(),
        end_datetime: slotEnd.toISOString(),
        duration: slotDuration,
        isBooked: false // จะอัปเดตในฟังก์ชันถัดไป
      });
    }
    
    // เลื่อนไปยัง slot ถัดไป (รวมเวลาพัก)
    currentTime = new Date(currentTime.getTime() + ((slotDuration + breakDuration) * 60 * 1000));
  }
  
  return slots;
}

/**
 * ดึง time slots พร้อมสถานะการจอง
 * @param {number} room_id - ID ของห้อง
 * @param {string} date - วันที่ในรูปแบบ 'YYYY-MM-DD'
 * @returns {Array} array ของ time slots พร้อมสถานะ
 */
async function getTimeSlotsWithBookingStatus(room_id, date = null) {
  const slots = await generateTimeSlots(room_id, date);
  
  if (!date) {
    date = new Date().toISOString().split('T')[0];
  }
  
  // ดึงการจองทั้งหมดในวันนั้น
  const bookingSql = `
    SELECT booking_id, start_time, end_time, status, user_id
    FROM bookings 
    WHERE room_id = ? 
    AND DATE(start_time) = ?
    AND status IN ('active', 'booked', 'paid')
    ORDER BY start_time ASC
  `;
  const [bookings] = await db.query(bookingSql, [room_id, date]);
  
  // อัปเดตสถานะของแต่ละ slot
  for (let slot of slots) {
    const slotStart = new Date(slot.start_datetime);
    const slotEnd = new Date(slot.end_datetime);
    
    // ตรวจสอบว่า slot นี้ถูกจองหรือไม่
    for (let booking of bookings) {
      const bookingStart = new Date(booking.start_time);
      const bookingEnd = new Date(booking.end_time);
      
      // ตรวจสอบการทับซ้อน
      if (!(slotEnd <= bookingStart || slotStart >= bookingEnd)) {
        slot.isBooked = true;
        slot.booking_id = booking.booking_id;
        slot.booking_status = booking.status;
        slot.user_id = booking.user_id;
        break;
      }
    }
    
    // ตรวจสอบว่าเป็นเวลาที่ผ่านไปแล้วหรือไม่
    const now = new Date();
    slot.isPast = slotStart < now;
  }
  
  return slots;
}

/**
 * ตรวจสอบความพร้อมของ time slot ที่เฉพาะเจาะจง
 * @param {number} room_id - ID ของห้อง
 * @param {string} start_datetime - เวลาเริ่มต้นในรูปแบบ ISO string
 * @param {string} end_datetime - เวลาสิ้นสุดในรูปแบบ ISO string
 * @returns {Object} ผลการตรวจสอบ
 */
async function checkTimeSlotAvailability(room_id, start_datetime, end_datetime) {
  // ตรวจสอบการจองที่ทับซ้อน
  const conflictSql = `
    SELECT booking_id, start_time, end_time, status
    FROM bookings 
    WHERE room_id = ? 
    AND status IN ('active', 'booked', 'paid')
    AND (
      (start_time < ? AND end_time > ?) OR
      (start_time < ? AND end_time > ?) OR
      (start_time >= ? AND end_time <= ?)
    )
  `;
  
  const [conflicts] = await db.query(conflictSql, [
    room_id, 
    end_datetime, start_datetime,    // booking starts before and ends after slot start
    start_datetime, end_datetime,    // booking starts before and ends after slot end  
    start_datetime, end_datetime     // booking is completely within slot
  ]);
  
  const isAvailable = conflicts.length === 0;
  
  return {
    is_available: isAvailable,
    conflict_bookings: conflicts,
    message: isAvailable 
      ? 'ช่วงเวลานี้ว่าง สามารถจองได้' 
      : `ช่วงเวลานี้ถูกจองแล้ว`
  };
}

/**
 * ดึงช่วงเวลาถัดไปที่ว่าง
 * @param {number} room_id - ID ของห้อง
 * @param {string} date - วันที่ในรูปแบบ 'YYYY-MM-DD'
 * @param {string} preferred_time - เวลาที่ต้องการในรูปแบบ 'HH:MM'
 * @returns {Array} time slots ที่ว่าง
 */
async function getNextAvailableSlots(room_id, date = null, preferred_time = null) {
  const slots = await getTimeSlotsWithBookingStatus(room_id, date);
  
  // กรอง slot ที่ว่างและไม่ใช่เวลาที่ผ่านไปแล้ว
  let availableSlots = slots.filter(slot => !slot.isBooked && !slot.isPast);
  
  // ถ้าระบุเวลาที่ต้องการ ให้หา slot ที่ใกล้เคียงที่สุด
  if (preferred_time) {
    const [hours, minutes] = preferred_time.split(':');
    const preferredMinutes = parseInt(hours) * 60 + parseInt(minutes);
    
    availableSlots = availableSlots.map(slot => {
      const [slotHours, slotMinutes] = slot.start_time.split(':');
      const slotTotalMinutes = parseInt(slotHours) * 60 + parseInt(slotMinutes);
      const timeDiff = Math.abs(slotTotalMinutes - preferredMinutes);
      
      return { ...slot, timeDiff };
    }).sort((a, b) => a.timeDiff - b.timeDiff);
  }
  
  return availableSlots;
}

module.exports = { 
  list, 
  getById, 
  create, 
  update, 
  updateRoomStatus, 
  getAvailableRooms, 
  checkRoomAvailability,
  generateTimeSlots,
  getTimeSlotsWithBookingStatus,
  checkTimeSlotAvailability,
  getNextAvailableSlots
};
