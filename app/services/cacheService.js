/**
 * ==========================================
 * Enhanced Cache Service
 * High-performance caching with logging and automatic invalidation
 * ==========================================
 */

const NodeCache = require('node-cache');

// Create cache instance with enhanced configuration
const cache = new NodeCache({ 
  stdTTL: 300, // 5-minute default TTL
  checkperiod: 60, // Check for expired keys every minute
  useClones: false, // Better performance - don't deep clone objects
  maxKeys: 1000 // Limit memory usage
});

class CacheService {
  // Generic cache methods with logging
  static get(key) {
    const value = cache.get(key);
    if (value !== undefined) {
      console.log(`Cache HIT: ${key}`);
    } else {
      console.log(`Cache MISS: ${key}`);
    }
    return value;
  }

  static set(key, value, ttl = 300) {
    const result = cache.set(key, value, ttl);
    console.log(`Cache SET: ${key} (TTL: ${ttl}s)`);
    return result;
  }
  
  static del(key) {
    const result = cache.del(key);
    console.log(`Cache DELETE: ${key}`);
    return result;
  }
  
  static flush() {
    cache.flushAll();
    console.log('Cache FLUSHED: All keys cleared');
    return true;
  }

  /**
   * Clear all cache entries with specific pattern
   * @param {string} pattern Pattern to match (e.g., 'admin:*')
   */
  delByPattern(pattern) {
    const keys = this.cache.keys();
    const regex = new RegExp(pattern.replace('*', '.*'));
    const keysToDelete = keys.filter(key => regex.test(key));
    return this.cache.del(keysToDelete);
  }

  /**
   * Get cache statistics
   * @returns {object} Cache statistics
   */
  getStats() {
    const keys = this.cache.keys();
    return {
      ...this.stats,
      keyCount: keys.length,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }

  /**
   * Clear all cache
   */
  flushAll() {
    this.cache.flushAll();
    this.stats = { hits: 0, misses: 0, sets: 0 };
  }

  /**
   * Cache wrapper for functions
   * @param {string} key Cache key
   * @param {Function} fn Function to execute if cache miss
   * @param {number} ttl TTL in seconds (optional)
   * @returns {Promise<any>} Cached or fresh data
   */
  async wrap(key, fn, ttl = null) {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    const result = await fn();
    this.set(key, result, ttl);
    return result;
  }

  // Predefined cache keys and methods for admin operations
  
  /**
   * Cache admin dashboard statistics
   * @param {Function} statsFunction Function that returns stats
   * @returns {Promise<object>} Dashboard statistics
   */
  async getAdminStats(statsFunction) {
    return this.wrap('admin:dashboard:stats', statsFunction, 300); // 5 minutes
  }

  /**
   * Cache room types
   * @param {Function} roomTypesFunction Function that returns room types
   * @returns {Promise<array>} Room types
   */
  async getRoomTypes(roomTypesFunction) {
    return this.wrap('admin:room_types', roomTypesFunction, 1800); // 30 minutes
  }

  /**
   * Cache user list for admin (with invalidation)
   * @param {Function} usersFunction Function that returns users
   * @param {object} filters Query filters
   * @returns {Promise<array>} Users list
   */
  async getAdminUsers(usersFunction, filters = {}) {
    const cacheKey = `admin:users:${JSON.stringify(filters)}`;
    return this.wrap(cacheKey, usersFunction, 180); // 3 minutes
  }

  /**
   * Cache rooms list for admin
   * @param {Function} roomsFunction Function that returns rooms
   * @param {object} filters Query filters
   * @returns {Promise<array>} Rooms list
   */
  async getAdminRooms(roomsFunction, filters = {}) {
    const cacheKey = `admin:rooms:${JSON.stringify(filters)}`;
    return this.wrap(cacheKey, roomsFunction, 300); // 5 minutes
  }

  /**
   * Invalidate admin caches when data changes
   * @param {string} type Type of data changed (users, rooms, bookings)
   */
  invalidateAdminCache(type) {
    switch (type) {
      case 'users':
        this.delByPattern('admin:users:*');
        this.delByPattern('admin:dashboard:*');
        break;
      case 'rooms':
        this.delByPattern('admin:rooms:*');
        this.delByPattern('admin:dashboard:*');
        this.del('admin:room_types');
        break;
      case 'bookings':
        this.delByPattern('admin:bookings:*');
        this.delByPattern('admin:dashboard:*');
        break;
      case 'room_types':
        this.del('admin:room_types');
        this.delByPattern('admin:rooms:*');
        break;
      default:
        this.delByPattern('admin:*');
    }
  }

  // Room-specific cache methods
  static invalidateRoomCache() {
    this.del('rooms:list');
    const keys = cache.keys();
    keys.forEach(key => {
      if (key.startsWith('room:')) {
        this.del(key);
      }
    });
    console.log('Room cache invalidated');
  }
  
  // Booking-specific cache methods  
  static invalidateAllBookings() {
    const keys = cache.keys();
    keys.forEach(key => {
      if (key.startsWith('bookings:')) {
        this.del(key);
      }
    });
    console.log('All booking caches invalidated');
  }
  
  // Admin statistics caching
  static getAdminStats() {
    return this.get('admin:stats');
  }
  
  static setAdminStats(stats, ttl = 180) {
    return this.set('admin:stats', stats, ttl);
  }
  
  static invalidateAdminStats() {
    this.del('admin:stats');
    console.log('Admin statistics cache invalidated');
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Clearing cache before shutdown...');
  cache.flushAll();
});

process.on('SIGTERM', () => {
  console.log('Clearing cache before shutdown...');
  cache.flushAll();
});

module.exports = CacheService;