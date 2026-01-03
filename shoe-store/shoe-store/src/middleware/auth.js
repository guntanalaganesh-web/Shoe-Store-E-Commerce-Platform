/**
 * Authentication Middleware
 */

// Check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }

    // For API routes
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({
            success: false,
            message: 'Please login to continue'
        });
    }

    // For page routes
    req.session.returnTo = req.originalUrl;
    req.session.error = 'Please login to continue';
    res.redirect('/auth/login');
};

// Check if user is admin
const isAdmin = (req, res, next) => {
    if (!req.session.user) {
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({
                success: false,
                message: 'Please login to continue'
            });
        }
        req.session.returnTo = req.originalUrl;
        return res.redirect('/auth/login');
    }

    if (req.session.user.role !== 'admin') {
        if (req.path.startsWith('/api/')) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin only.'
            });
        }
        req.session.error = 'Access denied. Admin privileges required.';
        return res.redirect('/');
    }

    next();
};

// Optional authentication (doesn't require login but loads user if available)
const optionalAuth = (req, res, next) => {
    // User is already loaded via session middleware in app.js
    next();
};

module.exports = {
    isAuthenticated,
    isAdmin,
    optionalAuth
};
