const express = require('express');
const router = express.Router();

// Debug middleware to track requests
function debugMiddleware(req, res, next) {
    const timestamp = new Date().toISOString();
    console.log(`🔍 [${timestamp}] ${req.method} ${req.path}`);
    console.log(`🔍 Session ID: ${req.sessionID}`);
    console.log(`🔍 Session User: ${req.session?.user ? req.session.user.email : 'None'}`);
    console.log(`🔍 Headers: Authorization=${!!req.headers.authorization}, User-Agent=${req.headers['user-agent']?.substring(0, 50)}...`);
    console.log(`🔍 Query: ${JSON.stringify(req.query)}`);
    console.log('🔍 ---');
    next();
}

// Debug routes
router.get('/debug/session', debugMiddleware, (req, res) => {
    res.json({
        sessionID: req.sessionID,
        session: req.session,
        user: req.session?.user || null,
        timestamp: new Date().toISOString()
    });
});

router.get('/debug/auth-flow', debugMiddleware, (req, res) => {
    const authStatus = {
        hasSession: !!req.session,
        hasUser: !!req.session?.user,
        userRole: req.session?.user?.role_id || null,
        sessionID: req.sessionID,
        path: req.path,
        query: req.query,
        timestamp: new Date().toISOString()
    };
    
    console.log('🔍 Auth Flow Debug:', authStatus);
    res.json(authStatus);
});

router.get('/debug/clear-session', debugMiddleware, (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destroy error:', err);
            res.status(500).json({ error: 'Failed to destroy session' });
        } else {
            res.json({ message: 'Session cleared successfully' });
        }
    });
});

module.exports = router;