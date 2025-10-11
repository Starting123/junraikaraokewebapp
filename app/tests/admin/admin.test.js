const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_in_production';

describe('Admin API Endpoints', () => {
  let adminToken;
  let userToken;

  beforeAll(async () => {
    // Create admin token for testing
    adminToken = jwt.sign(
      { user_id: 1, email: 'admin@test.com', role_id: 1 },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create regular user token for testing
    userToken = jwt.sign(
      { user_id: 2, email: 'user@test.com', role_id: 3 },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('Authentication & Authorization', () => {
    test('should deny access without token', async () => {
      const response = await request(app)
        .get('/api/admin/users');
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'missing token');
    });

    test('should deny access with invalid token', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer invalid-token');
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'invalid token');
    });

    test('should deny access for non-admin users', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'admin required');
    });

    test('should allow access for admin users', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
    });
  });

  describe('Users Management', () => {
    test('should list users with pagination', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
      expect(Array.isArray(response.body.users)).toBe(true);
    });

    test('should get user by ID', async () => {
      const response = await request(app)
        .get('/api/admin/users/1')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('user_id', 1);
    });

    test('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/admin/users/99999')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'user not found');
    });

    test('should validate user ID parameter', async () => {
      const response = await request(app)
        .get('/api/admin/users/invalid')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    test('should update user with valid data', async () => {
      const updateData = {
        role_id: 2,
        status: 'inactive'
      };

      const response = await request(app)
        .put('/api/admin/users/3')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.status).toBe('inactive');
    });

    test('should validate update data', async () => {
      const invalidData = {
        role_id: 'invalid',
        status: 'invalid-status'
      };

      const response = await request(app)
        .put('/api/admin/users/3')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    test('should handle empty update data', async () => {
      const response = await request(app)
        .put('/api/admin/users/3')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'nothing to update');
    });
  });

  describe('Rooms Management', () => {
    test('should list rooms with pagination', async () => {
      const response = await request(app)
        .get('/api/admin/rooms?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('rooms');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('currentPage', 1);
    });

    test('should create room with valid data', async () => {
      const roomData = {
        name: 'Test Room',
        type_id: 1,
        capacity: 6,
        status: 'available'
      };

      const response = await request(app)
        .post('/api/admin/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(roomData);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('room');
      expect(response.body.room.name).toBe(roomData.name);
    });

    test('should validate room creation data', async () => {
      const invalidData = {
        name: '', // Empty name
        type_id: 'invalid',
        capacity: -1,
        status: 'invalid-status'
      };

      const response = await request(app)
        .post('/api/admin/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    test('should filter rooms by status', async () => {
      const response = await request(app)
        .get('/api/admin/rooms?status=available')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('rooms');
      // All returned rooms should have 'available' status
      response.body.rooms.forEach(room => {
        expect(room.status).toBe('available');
      });
    });

    test('should search rooms by name', async () => {
      const response = await request(app)
        .get('/api/admin/rooms?q=VIP')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('rooms');
    });
  });

  describe('Audit Logging', () => {
    test('should log admin actions', async () => {
      // Perform an admin action
      await request(app)
        .put('/api/admin/users/3')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'active' });

      // Check if the action was logged
      const logsResponse = await request(app)
        .get('/api/admin/logs')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(logsResponse.status).toBe(200);
      expect(logsResponse.body).toHaveProperty('logs');
      expect(Array.isArray(logsResponse.body.logs)).toBe(true);

      // Find the log entry for our action
      const updateLog = logsResponse.body.logs.find(log => 
        log.action === 'UPDATE' && 
        log.target_type === 'user' && 
        log.admin_id === 1
      );
      expect(updateLog).toBeDefined();
    });

    test('should get filtered logs', async () => {
      const response = await request(app)
        .get('/api/admin/logs?action=UPDATE&target_type=user')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('logs');
      
      // All logs should match the filter criteria
      response.body.logs.forEach(log => {
        expect(log.action).toBe('UPDATE');
        expect(log.target_type).toBe('user');
      });
    });
  });

  describe('Statistics Dashboard', () => {
    test('should get dashboard statistics', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalUsers');
      expect(response.body).toHaveProperty('totalRooms');
      expect(response.body).toHaveProperty('totalBookings');
      expect(response.body).toHaveProperty('totalRevenue');
      expect(typeof response.body.totalUsers).toBe('number');
      expect(typeof response.body.totalRevenue).toBe('number');
    });
  });

  describe('Security & Validation', () => {
    test('should prevent SQL injection in search', async () => {
      const maliciousQuery = "'; DROP TABLE users; --";
      
      const response = await request(app)
        .get(`/api/admin/rooms?q=${encodeURIComponent(maliciousQuery)}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      // Should not crash and return normal response
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('rooms');
    });

    test('should sanitize user input in room creation', async () => {
      const roomData = {
        name: '<script>alert("xss")</script>Test Room',
        type_id: 1,
        capacity: 4,
        status: 'available'
      };

      const response = await request(app)
        .post('/api/admin/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(roomData);
      
      if (response.status === 201) {
        // Script tags should be escaped or removed
        expect(response.body.room.name).not.toContain('<script>');
      }
    });

    test('should validate pagination parameters', async () => {
      const response = await request(app)
        .get('/api/admin/rooms?page=-1&limit=1000')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });
});

describe('Password Security', () => {
  test('should hash passwords with bcrypt', async () => {
    const usersModel = require('../../models/users');
    
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'TestPassword123!'
    };

    const result = await usersModel.create(userData);
    expect(result).toHaveProperty('insertId');

    // Fetch the created user and verify password is hashed
    const user = await usersModel.findByEmail(userData.email);
    expect(user.password).not.toBe(userData.password);
    expect(user.password).toMatch(/^\$2b\$12\$/); // bcrypt hash pattern
  });

  test('should verify passwords correctly', async () => {
    const usersModel = require('../../models/users');
    
    const plainPassword = 'TestPassword123!';
    const user = await usersModel.findByEmail('test@example.com');
    
    const isValid = await usersModel.verifyPassword(plainPassword, user.password);
    expect(isValid).toBe(true);

    const isInvalid = await usersModel.verifyPassword('wrongpassword', user.password);
    expect(isInvalid).toBe(false);
  });
});