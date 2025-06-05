const express = require('express');
const { validationResult } = require('express-validator');
const { User, userValidation } = require('../models/User');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

// Register Route - CRUD Operation (Create)
router.post('/register', userValidation.register, async (req, res) => {
  try {
    // Check for validation errors - NoSQL Injection Prevention
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'User already exists with this email' 
      });
    }

    // Create new user
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      password,
      role: 'customer' // Default role
    });

    await user.save();

    // Generate JWT token
    const token = generateToken(user._id);

    // Return user data without password
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Email already registered' 
      });
    }

    res.status(500).json({ 
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Login Route - CRUD Operation (Read) with Query Optimization
router.post('/login', userValidation.login, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email with optimized query - Query Optimization Feature
    const user = await User.findByEmailSafe(email.toLowerCase());
    
    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid email or password' 
      });
    }

    // Check password
    const isPasswordValid = await user.matchPassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: 'Invalid email or password' 
      });
    }

    // Generate JWT token
    const token = generateToken(user._id);

    // Return user data without password
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Register Admin Route (for demo purposes - in production, this should be more restricted)
router.post('/register-admin', userValidation.register, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'User already exists with this email' 
      });
    }

    // Create new admin user
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      password,
      role: 'admin'
    });

    await user.save();

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'Admin registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Admin registration error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Email already registered' 
      });
    }

    res.status(500).json({ 
      message: 'Admin registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get Current User Profile Route
router.get('/me', require('../middleware/auth').authenticate, async (req, res) => {
  try {
    // User is already attached to req by auth middleware
    res.json({
      user: req.user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      message: 'Failed to get user profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update User Profile Route - CRUD Operation (Update)
router.put('/profile', 
  require('../middleware/auth').authenticate,
  [
    require('express-validator').body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),
    
    require('express-validator').body('email')
      .optional()
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const updates = {};
      if (req.body.name) updates.name = req.body.name.trim();
      if (req.body.email) updates.email = req.body.email.toLowerCase();

      // Check if email is already taken by another user
      if (updates.email) {
        const existingUser = await User.findOne({ 
          email: updates.email, 
          _id: { $ne: req.user._id } 
        });
        
        if (existingUser) {
          return res.status(400).json({ 
            message: 'Email already in use by another account' 
          });
        }
      }

      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        updates,
        { new: true, runValidators: true }
      ).select('-password -__v');

      res.json({
        message: 'Profile updated successfully',
        user: updatedUser
      });

    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ 
        message: 'Failed to update profile',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

module.exports = router; 