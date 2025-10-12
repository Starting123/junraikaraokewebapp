/**
 * Enhanced Request Manager for Admin Page
 * Prevents duplicate requests and manages loading states
 */

class AdminRequestManager {
    constructor() {
        this.activeRequests = new Map();
        this.cache = new Map();
        this.cacheTimeout = 30000; // 30 seconds
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
        this.statsLoadInProgress = false; // Prevent stats loading spam
        
        console.log('🔧 AdminRequestManager initialized');
    }
    
    /**
     * Make a deduplicated API request
     */
    async makeRequest(key, requestFn, options = {}) {
        const {
            useCache = true,
            timeout = 10000,
            retries = this.maxRetries
        } = options;
        
        console.log(`📡 Request: ${key}`);
        
        // Check cache first
        if (useCache && this.hasValidCache(key)) {
            console.log(`💾 Cache hit for: ${key}`);
            return this.cache.get(key).data;
        }
        
        // Special handling for stats loading to prevent spam
        if (key === 'loadStats' && this.statsLoadInProgress) {
            console.log(`🚫 Stats loading already in progress, preventing duplicate`);
            return Promise.resolve({ skipped: true });
        }
        
        // Check if request is already in progress
        if (this.activeRequests.has(key)) {
            console.log(`⏳ Request already in progress: ${key}`);
            return this.activeRequests.get(key);
        }
        
        // Set flag for stats loading
        if (key === 'loadStats') {
            this.statsLoadInProgress = true;
        }
        
        // Create new request with timeout and retry logic
        const requestPromise = this.executeWithRetry(requestFn, retries, timeout, key);
        
        // Store active request
        this.activeRequests.set(key, requestPromise);
        
        try {
            const result = await requestPromise;
            
            // Cache successful result
            if (useCache) {
                this.cache.set(key, {
                    data: result,
                    timestamp: Date.now()
                });
            }
            
            console.log(`✅ Request completed: ${key}`);
            return result;
            
        } catch (error) {
            console.error(`❌ Request failed: ${key}`, error);
            throw error;
        } finally {
            // Clean up active request and flags
            this.activeRequests.delete(key);
            if (key === 'loadStats') {
                this.statsLoadInProgress = false;
            }
        }
    }
    
    /**
     * Execute request with retry logic
     */
    async executeWithRetry(requestFn, retries, timeout, key) {
        let lastError;
        
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                console.log(`🔄 Attempt ${attempt}/${retries} for: ${key}`);
                
                // Create timeout promise
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error(`Request timeout: ${key}`)), timeout);
                });
                
                // Race between request and timeout
                const result = await Promise.race([
                    requestFn(),
                    timeoutPromise
                ]);
                
                return result;
                
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Attempt ${attempt} failed for ${key}:`, error.message);
                
                // Don't retry on certain errors
                if (error.name === 'AbortError' || 
                    (error.response && [401, 403, 404].includes(error.response.status))) {
                    break;
                }
                
                // Wait before retry (exponential backoff)
                if (attempt < retries) {
                    const delay = this.retryDelay * Math.pow(2, attempt - 1);
                    console.log(`⏱️ Waiting ${delay}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw lastError;
    }
    
    /**
     * Check if cached data is still valid
     */
    hasValidCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return false;
        
        const age = Date.now() - cached.timestamp;
        return age < this.cacheTimeout;
    }
    
    /**
     * Clear cache for specific key or all
     */
    clearCache(key = null) {
        if (key) {
            this.cache.delete(key);
            console.log(`🗑️ Cache cleared for: ${key}`);
        } else {
            this.cache.clear();
            console.log('🗑️ All cache cleared');
        }
    }
    
    /**
     * Cancel active request
     */
    cancelRequest(key) {
        if (this.activeRequests.has(key)) {
            this.activeRequests.delete(key);
            console.log(`🚫 Request cancelled: ${key}`);
        }
    }
    
    /**
     * Cancel all active requests
     */
    cancelAllRequests() {
        this.activeRequests.clear();
        console.log('🚫 All requests cancelled');
    }
    
    /**
     * Get status of requests
     */
    getStatus() {
        return {
            activeRequests: Array.from(this.activeRequests.keys()),
            cachedItems: Array.from(this.cache.keys()),
            cacheSize: this.cache.size
        };
    }
}

// Create global instance
window.adminRequestManager = new AdminRequestManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminRequestManager;
}