const { jest } = require('@jest/globals');
require('dotenv').config({ path: '.env.test' });

// Mock database connection for tests
const mockPool = {
  query: jest.fn(),
  getConnection: jest.fn(),
  on: jest.fn(),
  end: jest.fn()
};

// Override database connection for tests
jest.doMock('../db', () => mockPool);

// Global test helpers
global.mockDb = mockPool;

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.BCRYPT_ROUNDS = '4'; // Faster for tests

// Suppress console.log in tests unless explicitly needed
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
  
  // Suppress console output unless NODE_ENV=test-verbose
  if (process.env.NODE_ENV !== 'test-verbose') {
    console.log = jest.fn();
    console.error = jest.fn();
  }
});

afterEach(() => {
  // Restore console
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

// Global teardown
afterAll(async () => {
  // Clean up any open handles
  if (global.mockDb && global.mockDb.end) {
    await global.mockDb.end();
  }
});