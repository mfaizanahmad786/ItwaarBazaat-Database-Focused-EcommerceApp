const jwt = require('jsonwebtoken');
const { User } = require('../models/User');

// JWT Authentication Middleware - DB Security Feature
const authenticate = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ 
        message: 'Access denied. No token provided.' 
      });
    }

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from database (exclude password)
      const user = await User.getSanitizedUser(decoded.id);
      
      if (!user) {
        return res.status(401).json({ 
          message: 'Token is valid but user not found' 
        });
      }

      // Attach user to request object
      req.user = user;
      next();

    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Token has expired' 
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          message: 'Invalid token' 
        });
      } else {
        throw jwtError;
      }
    }

  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ 
      message: 'Authentication failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Role-based Authorization Middleware - DB Security Feature
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Access denied. Authentication required.' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}` 
      });
    }

    next();
  };
};

// Admin Only Middleware
const adminOnly = authorize('admin');

// Customer or Admin Middleware
const customerOrAdmin = authorize('customer', 'admin');

// Optional Authentication (for public endpoints that benefit from user context)
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.getSanitizedUser(decoded.id);
        if (user) {
          req.user = user;
        }
      } catch (error) {
        // Silently continue without user context
        console.log('Optional auth failed:', error.message);
      }
    }

    next();
  } catch (error) {
    // Don't block the request, just continue without user context
    next();
  }
};

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// Verify Token (utility function)
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

module.exports = {
  authenticate,
  authorize,
  adminOnly,
  customerOrAdmin,
  optionalAuth,
  generateToken,
  verifyToken
}; 