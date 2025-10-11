# Manual Verification Guide
## Junrai Karaoke Admin Security Audit

### Prerequisites
```bash
# Start the application
cd app
npm start

# Open new terminal for testing
export ADMIN_TOKEN="your_admin_jwt_token_here"
export USER_TOKEN="your_regular_user_token_here"
```

### 1. Authentication & Authorization Tests

#### Test 1: No Token Access Denial
```bash
curl -X GET "http://localhost:3000/api/admin/users"
# Expected: 401 Unauthorized with "missing token" error
```

#### Test 2: Invalid Token Rejection  
```bash
curl -X GET "http://localhost:3000/api/admin/users" \
  -H "Authorization: Bearer invalid-token-12345"
# Expected: 401 Unauthorized with "invalid token" error
```

#### Test 3: Non-Admin User Denial
```bash
curl -X GET "http://localhost:3000/api/admin/users" \
  -H "Authorization: Bearer $USER_TOKEN"
# Expected: 403 Forbidden with "admin required" error
```

#### Test 4: Admin User Access
```bash
curl -X GET "http://localhost:3000/api/admin/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# Expected: 200 OK with users array
```

### 2. SQL Injection Prevention Tests

#### Test 1: Malicious Query in Search
```bash
curl -X GET "http://localhost:3000/api/admin/rooms?q='; DROP TABLE users; --" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# Expected: 200 OK, application should not crash, no data loss
```

#### Test 2: Malicious Query in Pagination
```bash
curl -X GET "http://localhost:3000/api/admin/rooms?page=1'; DELETE FROM rooms; --" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# Expected: 400 Bad Request with validation error
```

#### Test 3: XSS Prevention in Room Creation
```bash
curl -X POST "http://localhost:3000/api/admin/rooms" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"<script>alert(\"xss\")</script>Test Room","type_id":1,"capacity":4}'
# Expected: Script tags should be escaped or validation error
```

### 3. Password Security Tests

#### Test 1: Check Password Hashing (Database)
```sql
-- Connect to MySQL and check users table
SELECT user_id, email, password FROM users LIMIT 5;
-- Expected: All passwords should start with $2b$12$ (bcrypt hash)
```

#### Test 2: Password Verification Function
```javascript
// In Node.js console or test script
const usersModel = require('./models/users');
(async () => {
  const user = await usersModel.findByEmail('test@example.com');
  const isValid = await usersModel.verifyPassword('correctpassword', user.password);
  console.log('Password verification works:', isValid);
})();
```

### 4. Audit Logging Tests

#### Test 1: User Update Logging
```bash
# Perform admin action
curl -X PUT "http://localhost:3000/api/admin/users/3" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"inactive"}'

# Check audit log
curl -X GET "http://localhost:3000/api/admin/logs" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# Expected: Log entry with action="UPDATE", target_type="user"
```

#### Test 2: Room Creation Logging  
```bash
# Create a room
curl -X POST "http://localhost:3000/api/admin/rooms" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Room","type_id":1,"capacity":4,"status":"available"}'

# Verify log entry exists
# Check database: SELECT * FROM admin_logs WHERE action='CREATE' AND target_type='room';
```

### 5. Input Validation Tests

#### Test 1: Invalid Room Data
```bash
curl -X POST "http://localhost:3000/api/admin/rooms" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"","type_id":"invalid","capacity":-1,"status":"bad_status"}'
# Expected: 400 Bad Request with detailed validation errors
```

#### Test 2: Invalid User ID Parameters
```bash
curl -X GET "http://localhost:3000/api/admin/users/abc" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# Expected: 400 Bad Request with validation error for ID parameter
```

#### Test 3: Pagination Boundary Tests
```bash
curl -X GET "http://localhost:3000/api/admin/rooms?page=-1&limit=1000" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# Expected: 400 Bad Request with validation errors
```

### 6. Performance & Caching Tests

#### Test 1: Dashboard Statistics Caching
```bash
# First call (should be slower, cache miss)
time curl -X GET "http://localhost:3000/api/admin/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Second call (should be faster, cache hit)
time curl -X GET "http://localhost:3000/api/admin/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# Expected: Second call should be significantly faster
```

#### Test 2: Cache Invalidation
```bash
# Get stats (populate cache)
curl -X GET "http://localhost:3000/api/admin/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Modify data (should invalidate cache)
curl -X PUT "http://localhost:3000/api/admin/users/3" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"active"}'

# Get stats again (should be fresh data)
curl -X GET "http://localhost:3000/api/admin/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# Expected: Stats should reflect the change
```

### 7. Error Handling Tests

#### Test 1: Non-existent Resource
```bash
curl -X GET "http://localhost:3000/api/admin/users/99999" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# Expected: 404 Not Found with "user not found" message
```

#### Test 2: Delete Non-existent Resource
```bash
curl -X DELETE "http://localhost:3000/api/admin/rooms/99999" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# Expected: 404 Not Found with "room not found" message
```

#### Test 3: Database Connection Error Simulation
```bash
# Stop MySQL temporarily, then:
curl -X GET "http://localhost:3000/api/admin/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# Expected: 500 Internal Server Error with generic error message (no stack trace)
```

### 8. Frontend Security Tests

#### Test 1: CSRF Token Validation (Manual Browser Test)
1. Open browser dev tools
2. Navigate to `/admin/rooms` 
3. Try to delete a room
4. Check network tab - DELETE request should include CSRF token
5. Verify delete confirmation modal appears

#### Test 2: XSS Prevention in Frontend
1. Create room with name: `<img src=x onerror=alert(1)>`
2. Navigate to rooms list
3. Expected: Script should not execute, content should be escaped

### 9. Database Performance Tests

#### Test 1: Query Performance with Indexes
```sql
-- Run these queries and check execution time
EXPLAIN SELECT * FROM users WHERE email = 'test@example.com';
EXPLAIN SELECT * FROM bookings WHERE user_id = 1 AND status = 'active';
EXPLAIN SELECT * FROM admin_logs WHERE admin_id = 1 ORDER BY timestamp DESC;
-- Expected: All should use indexes (type=ref or type=range)
```

#### Test 2: Pagination Performance
```bash
# Test large pagination
curl -X GET "http://localhost:3000/api/admin/rooms?page=100&limit=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# Expected: Should respond quickly even with large page numbers
```

### 10. Integration Test Suite

#### Run Automated Tests
```bash
cd app/tests
npm test

# Run specific admin tests
npm run test:admin

# Run with coverage
npm run test -- --coverage
```

### Expected Test Results Summary

| Test Category | Pass Criteria | Status |
|---------------|---------------|---------|
| Authentication | All 4 tests pass with correct HTTP codes | ✅ |
| SQL Injection | No crashes, proper validation errors | ✅ |  
| Password Security | Bcrypt hashes, verification works | ✅ |
| Audit Logging | All actions logged with details | ✅ |
| Input Validation | Proper 400 errors with details | ✅ |
| Performance | Cache hits faster, invalidation works | ✅ |
| Error Handling | Proper HTTP codes and messages | ✅ |
| Frontend Security | CSRF protection, XSS prevention | ✅ |
| Database Performance | Indexes used, fast responses | ✅ |
| Integration Tests | 85%+ coverage, all tests pass | ✅ |

### Troubleshooting Common Issues

#### Issue: Tests fail with database connection error
```bash
# Check MySQL is running
systemctl status mysql

# Check database exists
mysql -u root -p -e "SHOW DATABASES LIKE 'junraikaraokedatabase%';"
```

#### Issue: JWT token expired
```javascript
// Generate new test token
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { user_id: 1, email: 'admin@test.com', role_id: 1 },
  'your_jwt_secret',
  { expiresIn: '24h' }
);
console.log('New admin token:', token);
```

#### Issue: Cache not working
```bash
# Check if node-cache is installed
npm list node-cache

# Check cache statistics endpoint
curl -X GET "http://localhost:3000/api/admin/cache-stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

This completes the manual verification process. All tests should pass for a secure, production-ready admin system.