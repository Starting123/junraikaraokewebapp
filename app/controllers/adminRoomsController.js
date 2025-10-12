/**
 * Admin Rooms Controller
 * Handles CRUD operations for rooms management
 */

const db = require('../db');
const { body, param, validationResult } = require('express-validator');

// Get all rooms with room types
async function listRooms(req, res) {
  try {
    const [rows] = await db.query(`
      SELECT r.*, rt.type_name, rt.price_per_hour, rt.description as type_description
      FROM rooms r 
      LEFT JOIN room_types rt ON r.type_id = rt.type_id 
      ORDER BY r.room_id ASC
    `);
    
    res.json({ 
      success: true, 
      rooms: rows,
      count: rows.length 
    });
  } catch (error) {
    console.error('Error listing rooms:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch rooms',
      message: error.message 
    });
  }
}

// Get single room by ID
async function getRoom(req, res) {
  try {
    const roomId = req.params.id;
    
    const [rows] = await db.query(`
      SELECT r.*, rt.type_name, rt.price_per_hour, rt.description as type_description
      FROM rooms r 
      LEFT JOIN room_types rt ON r.type_id = rt.type_id 
      WHERE r.room_id = ?
    `, [roomId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Room not found' 
      });
    }
    
    res.json({ 
      success: true, 
      room: rows[0] 
    });
  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch room',
      message: error.message 
    });
  }
}

// Create new room
async function createRoom(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    
    const { name, type_id, capacity, status = 'available', description } = req.body;
    
    const [result] = await db.query(
      'INSERT INTO rooms (name, type_id, capacity, status, description) VALUES (?, ?, ?, ?, ?)',
      [name, type_id, capacity, status, description]
    );
    
    // Fetch the created room with type info
    const [newRoom] = await db.query(`
      SELECT r.*, rt.type_name, rt.price_per_hour 
      FROM rooms r 
      LEFT JOIN room_types rt ON r.type_id = rt.type_id 
      WHERE r.room_id = ?
    `, [result.insertId]);
    
    res.status(201).json({ 
      success: true, 
      room: newRoom[0],
      message: 'Room created successfully' 
    });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create room',
      message: error.message 
    });
  }
}

// Update room
async function updateRoom(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    
    const roomId = req.params.id;
    const { name, type_id, capacity, status, description } = req.body;
    
    // Check if room exists
    const [existing] = await db.query('SELECT room_id FROM rooms WHERE room_id = ?', [roomId]);
    if (existing.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Room not found' 
      });
    }
    
    await db.query(
      'UPDATE rooms SET name = ?, type_id = ?, capacity = ?, status = ?, description = ?, updated_at = NOW() WHERE room_id = ?',
      [name, type_id, capacity, status, description, roomId]
    );
    
    // Fetch updated room
    const [updatedRoom] = await db.query(`
      SELECT r.*, rt.type_name, rt.price_per_hour 
      FROM rooms r 
      LEFT JOIN room_types rt ON r.type_id = rt.type_id 
      WHERE r.room_id = ?
    `, [roomId]);
    
    res.json({ 
      success: true, 
      room: updatedRoom[0],
      message: 'Room updated successfully' 
    });
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update room',
      message: error.message 
    });
  }
}

// Delete room
async function deleteRoom(req, res) {
  try {
    const roomId = req.params.id;
    
    // Check if room has active bookings
    const [activeBookings] = await db.query(
      'SELECT COUNT(*) as count FROM bookings WHERE room_id = ? AND status = "active"', 
      [roomId]
    );
    
    if (activeBookings[0].count > 0) {
      return res.status(409).json({ 
        success: false, 
        error: 'Cannot delete room with active bookings',
        message: `This room has ${activeBookings[0].count} active booking(s)` 
      });
    }
    
    // Check if room exists
    const [existing] = await db.query('SELECT room_id FROM rooms WHERE room_id = ?', [roomId]);
    if (existing.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Room not found' 
      });
    }
    
    await db.query('DELETE FROM rooms WHERE room_id = ?', [roomId]);
    
    res.json({ 
      success: true, 
      message: 'Room deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete room',
      message: error.message 
    });
  }
}

// Get room types for dropdown
async function getRoomTypes(req, res) {
  try {
    const [rows] = await db.query('SELECT * FROM room_types ORDER BY type_name ASC');
    
    res.json({ 
      success: true, 
      roomTypes: rows 
    });
  } catch (error) {
    console.error('Error fetching room types:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch room types',
      message: error.message 
    });
  }
}

module.exports = {
  listRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
  getRoomTypes
};