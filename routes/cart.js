const express = require('express');
const { validationResult, body } = require('express-validator');
const { Product } = require('../models/Product');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// In-memory cart storage (in production, you might use Redis or store in database)
// For simplicity, we'll store cart in memory with user session
const userCarts = new Map();

// Add Item to Cart
router.post('/add', 
  authenticate,
  [
    body('productId')
      .isMongoId()
      .withMessage('Invalid product ID'),
    body('quantity')
      .isInt({ min: 1, max: 50 })
      .withMessage('Quantity must be between 1 and 50')
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { productId, quantity } = req.body;
      const userId = req.user._id.toString();

      // Verify product exists and is available
      const product = await Product.findOne({ 
        _id: productId, 
        isActive: true 
      }).select('name price stock imageUrl');

      if (!product) {
        return res.status(404).json({ 
          message: 'Product not found or unavailable' 
        });
      }

      // Check stock availability
      if (product.stock < quantity) {
        return res.status(400).json({ 
          message: `Insufficient stock. Available: ${product.stock}` 
        });
      }

      // Get or create user cart
      let cart = userCarts.get(userId) || { items: [], updatedAt: new Date() };

      // Check if item already exists in cart
      const existingItemIndex = cart.items.findIndex(
        item => item.productId === productId
      );

      if (existingItemIndex > -1) {
        // Update quantity if item exists
        const newQuantity = cart.items[existingItemIndex].quantity + quantity;
        
        if (product.stock < newQuantity) {
          return res.status(400).json({ 
            message: `Insufficient stock. Available: ${product.stock}, In cart: ${cart.items[existingItemIndex].quantity}` 
          });
        }

        cart.items[existingItemIndex].quantity = newQuantity;
        cart.items[existingItemIndex].total = newQuantity * product.price;
      } else {
        // Add new item to cart
        cart.items.push({
          productId,
          productName: product.name,
          price: product.price,
          quantity,
          total: quantity * product.price,
          imageUrl: product.imageUrl
        });
      }

      cart.updatedAt = new Date();
      userCarts.set(userId, cart);

      // Calculate cart totals
      const cartTotal = cart.items.reduce((sum, item) => sum + item.total, 0);
      const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

      res.json({
        message: 'Item added to cart successfully',
        cartItem: cart.items.find(item => item.productId === productId),
        cartSummary: {
          itemCount,
          cartTotal: Math.round(cartTotal * 100) / 100
        }
      });

    } catch (error) {
      console.error('Add to cart error:', error);
      res.status(500).json({ 
        message: 'Failed to add item to cart',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Get User's Cart
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const cart = userCarts.get(userId) || { items: [], updatedAt: new Date() };

    // Validate cart items against current product data
    const validatedItems = [];
    for (const item of cart.items) {
      const product = await Product.findOne({ 
        _id: item.productId, 
        isActive: true 
      }).select('name price stock imageUrl');

      if (product) {
        // Update price if it has changed
        const updatedItem = {
          ...item,
          productName: product.name,
          price: product.price,
          total: item.quantity * product.price,
          imageUrl: product.imageUrl,
          availableStock: product.stock,
          inStock: product.stock >= item.quantity
        };
        validatedItems.push(updatedItem);
      }
    }

    // Update cart with validated items
    cart.items = validatedItems;
    userCarts.set(userId, cart);

    const cartTotal = cart.items.reduce((sum, item) => sum + item.total, 0);
    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    res.json({
      message: 'Cart retrieved successfully',
      cart: {
        items: cart.items,
        itemCount,
        cartTotal: Math.round(cartTotal * 100) / 100,
        updatedAt: cart.updatedAt
      }
    });

  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve cart',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update Cart Item Quantity
router.put('/item/:productId',
  authenticate,
  [
    body('quantity')
      .isInt({ min: 0, max: 50 })
      .withMessage('Quantity must be between 0 and 50')
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { productId } = req.params;
      const { quantity } = req.body;
      const userId = req.user._id.toString();

      // Validate product ID
      if (!productId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ message: 'Invalid product ID format' });
      }

      const cart = userCarts.get(userId) || { items: [], updatedAt: new Date() };
      const itemIndex = cart.items.findIndex(item => item.productId === productId);

      if (itemIndex === -1) {
        return res.status(404).json({ message: 'Item not found in cart' });
      }

      if (quantity === 0) {
        // Remove item from cart
        cart.items.splice(itemIndex, 1);
      } else {
        // Check stock availability
        const product = await Product.findOne({ 
          _id: productId, 
          isActive: true 
        }).select('stock price');

        if (!product) {
          return res.status(404).json({ message: 'Product not found or unavailable' });
        }

        if (product.stock < quantity) {
          return res.status(400).json({ 
            message: `Insufficient stock. Available: ${product.stock}` 
          });
        }

        // Update item quantity
        cart.items[itemIndex].quantity = quantity;
        cart.items[itemIndex].total = quantity * cart.items[itemIndex].price;
      }

      cart.updatedAt = new Date();
      userCarts.set(userId, cart);

      const cartTotal = cart.items.reduce((sum, item) => sum + item.total, 0);
      const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

      res.json({
        message: quantity === 0 ? 'Item removed from cart' : 'Cart updated successfully',
        cart: {
          items: cart.items,
          itemCount,
          cartTotal: Math.round(cartTotal * 100) / 100
        }
      });

    } catch (error) {
      console.error('Update cart error:', error);
      res.status(500).json({ 
        message: 'Failed to update cart',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Remove Item from Cart
router.delete('/item/:productId', authenticate, async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id.toString();

    // Validate product ID
    if (!productId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid product ID format' });
    }

    const cart = userCarts.get(userId) || { items: [], updatedAt: new Date() };
    const itemIndex = cart.items.findIndex(item => item.productId === productId);

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    // Remove item
    const removedItem = cart.items.splice(itemIndex, 1)[0];
    cart.updatedAt = new Date();
    userCarts.set(userId, cart);

    const cartTotal = cart.items.reduce((sum, item) => sum + item.total, 0);
    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    res.json({
      message: 'Item removed from cart successfully',
      removedItem,
      cart: {
        items: cart.items,
        itemCount,
        cartTotal: Math.round(cartTotal * 100) / 100
      }
    });

  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ 
      message: 'Failed to remove item from cart',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Clear Cart
router.delete('/', authenticate, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    
    userCarts.set(userId, { items: [], updatedAt: new Date() });

    res.json({
      message: 'Cart cleared successfully',
      cart: {
        items: [],
        itemCount: 0,
        cartTotal: 0
      }
    });

  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ 
      message: 'Failed to clear cart',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get Cart Summary (for header display)
router.get('/summary', authenticate, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const cart = userCarts.get(userId) || { items: [], updatedAt: new Date() };

    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const cartTotal = cart.items.reduce((sum, item) => sum + item.total, 0);

    res.json({
      itemCount,
      cartTotal: Math.round(cartTotal * 100) / 100
    });

  } catch (error) {
    console.error('Get cart summary error:', error);
    res.status(500).json({ 
      message: 'Failed to get cart summary',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Export cart utility functions for order processing
const getCartForUser = (userId) => {
  return userCarts.get(userId) || { items: [], updatedAt: new Date() };
};

const clearCartForUser = (userId) => {
  userCarts.set(userId, { items: [], updatedAt: new Date() });
};

module.exports = { 
  router, 
  getCartForUser, 
  clearCartForUser 
}; 