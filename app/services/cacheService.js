const NodeCache = require('node-cache');

class CacheService {
  constructor() {
    // Initialize cache with 10 minute default TTL
    this.cache = new NodeCache({ 
      stdTTL: 600, // 10 minutes
      checkperiod: 120, // Check for expired keys every 2 minutes
      useClones: false // For better performance with objects
    });
    
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
  }

  /**
   * Get value from cache
   * @param {string} key Cache key
   * @returns {any|null} Cached value or null if not found
   */
  get(key) {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.stats.hits++;
      return value;
    }
    this.stats.misses++;
    return null;
  }

  /**
   * Set value in cache
   * @param {string} key Cache key
   * @param {any} value Value to cache
   * @param {number} ttl TTL in seconds (optional)
   * @returns {boolean} Success status
   */
  set(key, value, ttl = null) {
    const success = ttl ? this.cache.set(key, value, ttl) : this.cache.set(key, value);
    if (success) {
      this.stats.sets++;
    }
    return success;
  }

  /**
   * Delete value from cache
   * @param {string} key Cache key
   * @returns {number} Number of deleted entries
   */
  del(key) {
    return this.cache.del(key);
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
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;