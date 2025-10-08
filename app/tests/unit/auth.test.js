const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock the database module before requiring the app
jest.mock('../../db');

const app = require('../../app');

describe('Auth API Unit Tests', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Reset the mock implementation
    const db = require('../../db');
    db.query.mockClear();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const db = require('../../db');
      
      // Mock database responses
      db.query
        .mockResolvedValueOnce([[]]) // No existing user
        .mockResolvedValueOnce([{ insertId: 1 }]); // Successful insert

      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('registered successfully');
      expect(db.query).toHaveBeenCalledTimes(2);
    });

    it('should reject registration with existing email', async () => {
      const db = require('../../db');
      
      // Mock existing user found
      db.query.mockResolvedValueOnce([{ user_id: 1 }]);

      const userData = {
        name: 'Test User',
        email: 'existing@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.error).toBe('email already in use');
    });

    it('should reject weak password', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: '123456', // Too weak
        confirmPassword: '123456'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].msg).toContain('Password must contain');
    });

    it('should reject mismatched passwords', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
        confirmPassword: 'DifferentPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const db = require('../../db');
      
      const hashedPassword = await bcrypt.hash('Password123!', 4);
      
      // Mock user found with correct password
      db.query
        .mockResolvedValueOnce([[{
          user_id: 1,
          username: 'testuser',
          email: 'test@example.com',
          password: hashedPassword,
          role_id: 0,
          status: 'active'
        }]])
        .mockResolvedValueOnce([]); // Mock login log insert

      const loginData = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should reject invalid email', async () => {
      const db = require('../../db');
      
      // Mock no user found
      db.query
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([]); // Mock login log insert

      const loginData = {
        email: 'nonexistent@example.com',
        password: 'Password123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject invalid password', async () => {
      const db = require('../../db');
      
      const hashedPassword = await bcrypt.hash('CorrectPassword123!', 4);
      
      // Mock user found with different password
      db.query
        .mockResolvedValueOnce([[{
          user_id: 1,
          email: 'test@example.com',
          password: hashedPassword,
          status: 'active'
        }]])
        .mockResolvedValueOnce([]); // Mock login log insert

      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject inactive user', async () => {
      const db = require('../../db');
      
      const hashedPassword = await bcrypt.hash('Password123!', 4);
      
      // Mock inactive user
      db.query
        .mockResolvedValueOnce([[{
          user_id: 1,
          email: 'test@example.com',
          password: hashedPassword,
          status: 'inactive'
        }]])
        .mockResolvedValueOnce([]); // Mock login log insert

      const loginData = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(403);

      expect(response.body.error).toBe('Account is not active');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should initiate password reset for valid email', async () => {
      const db = require('../../db');
      
      // Mock user found
      db.query
        .mockResolvedValueOnce([[{
          user_id: 1,
          email: 'test@example.com',
          first_name: 'Test'
        }]])
        .mockResolvedValueOnce([]); // Mock token insert

      // Mock email service
      const emailService = require('../../services/emailService');
      emailService.sendPasswordResetEmail = jest.fn().mockResolvedValue(true);

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.message).toContain('reset instructions have been sent');
    });

    it('should not reveal non-existent email', async () => {
      const db = require('../../db');
      
      // Mock no user found
      db.query.mockResolvedValueOnce([[]]);

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.message).toContain('reset instructions have been sent');
    });
  });

  describe('JWT Token Validation', () => {
    it('should validate valid JWT token', () => {
      const payload = { user_id: 1, email: 'test@example.com' };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.user_id).toBe(1);
      expect(decoded.email).toBe('test@example.com');
    });

    it('should reject invalid JWT token', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => {
        jwt.verify(invalidToken, process.env.JWT_SECRET);
      }).toThrow();
    });
  });
});