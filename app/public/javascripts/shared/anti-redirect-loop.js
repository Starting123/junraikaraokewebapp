// Anti-Redirect Loop Protection
// ป้องกันการ redirect ซ้ำใน Admin Page

(function() {
    'use strict';
    
    console.log('🛡️ Anti-redirect loop protection loaded');
    
    // Track redirects to detect loops
    if (!window.redirectCount) {
        window.redirectCount = 0;
        window.lastRedirectTime = 0;
    }
    
    // Override window.location methods to add protection (safe version)
    let originalHref, originalReplace, originalAssign;
    
    try {
        const hrefDescriptor = Object.getOwnPropertyDescriptor(Location.prototype, 'href');
        originalHref = hrefDescriptor ? hrefDescriptor.set : null;
        originalReplace = Location.prototype.replace;
        originalAssign = Location.prototype.assign;
    } catch (e) {
        console.warn('⚠️ Could not access Location prototype, using fallback protection');
        return; // Exit early if we can't override
    }
    
    function checkRedirectLoop(url) {
        const now = Date.now();
        
        // Reset counter if enough time has passed
        if (now - window.lastRedirectTime > 5000) {
            window.redirectCount = 0;
        }
        
        window.redirectCount++;
        window.lastRedirectTime = now;
        
        console.log(`🔄 Redirect attempt #${window.redirectCount} to: ${url}`);
        
        // Block if too many redirects in short time
        if (window.redirectCount > 3) {
            console.error('🚨 REDIRECT LOOP DETECTED! Blocking further redirects.');
            console.error('Current page:', window.location.pathname);
            console.error('Attempted redirect to:', url);
            
            // Clear localStorage to reset auth state
            localStorage.clear();
            
            // Show error to user
            alert('เกิดข้อผิดพลาดในการโหลดหน้า กรุณารีเฟรชหน้าเว็บ');
            
            // Stop the redirect
            return false;
        }
        
        return true;
    }
    
    // Override location.href setter (safe version)
    if (originalHref) {
        try {
            Object.defineProperty(Location.prototype, 'href', {
                set: function(url) {
                    if (!checkRedirectLoop(url)) return;
                    originalHref.call(this, url);
                },
                get: function() {
                    return this.toString();
                }
            });
        } catch (e) {
            console.warn('⚠️ Could not override href setter');
        }
    }
    
    // Override location.replace
    Location.prototype.replace = function(url) {
        if (!checkRedirectLoop(url)) return;
        return originalReplace.call(this, url);
    };
    
    // Override location.assign
    Location.prototype.assign = function(url) {
        if (!checkRedirectLoop(url)) return;
        return originalAssign.call(this, url);
    };
    
    // Monitor page visibility to reset counter when user navigates away
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            // Page became visible, reset redirect counter
            setTimeout(() => {
                window.redirectCount = 0;
            }, 1000);
        }
    });
    
    console.log('✅ Redirect loop protection active');
})();