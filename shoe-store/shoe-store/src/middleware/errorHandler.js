/**
 * Error Handling Middleware
 */

// 404 Not Found
const notFound = (req, res, next) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({
            success: false,
            message: `Route not found: ${req.method} ${req.originalUrl}`
        });
    }

    res.status(404).render('pages/404', {
        title: 'Page Not Found',
        url: req.originalUrl
    });
};

// General Error Handler
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message);
        if (req.path.startsWith('/api/')) {
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: messages
            });
        }
        req.session.error = messages.join(', ');
        return res.redirect('back');
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        const message = `${field} already exists`;
        
        if (req.path.startsWith('/api/')) {
            return res.status(400).json({
                success: false,
                message
            });
        }
        req.session.error = message;
        return res.redirect('back');
    }

    // Mongoose CastError (invalid ObjectId)
    if (err.name === 'CastError') {
        if (req.path.startsWith('/api/')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid ID format'
            });
        }
        return res.status(404).render('pages/404', {
            title: 'Not Found'
        });
    }

    // JWT Error
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }

    // Default error
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    if (req.path.startsWith('/api/')) {
        return res.status(statusCode).json({
            success: false,
            message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
    }

    res.status(statusCode).render('pages/error', {
        title: 'Error',
        message,
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
};

// Async handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
    notFound,
    errorHandler,
    asyncHandler
};
