const express = require('express');
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const { Order, orderValidation } = require('../models/Order');
const { Product } = require('../models/Product');
const { authenticate, adminOnly } = require('../middleware/auth');
const { getCartForUser, clearCartForUser } = require('./cart');

const router = express.Router();

// Create Order with MongoDB Transaction - Transactions Feature
router.post('/', authenticate, orderValidation.create, async (req, res) => {
  // Start MongoDB session for transaction
  const session = await mongoose.startSession();
  let order;
  
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user._id;
    const { shippingAddress, paymentMethod, items } = req.body;

    // Validate items array
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'No items provided in the order' });
    }

    // Start transaction
    await session.withTransaction(async () => {
      console.log('Starting order transaction...');
      console.log('Order data:', { userId, shippingAddress, paymentMethod, items });

      // Step 1: Validate all products and check stock availability
      const orderItems = [];
      let totalAmount = 0;

      for (const item of items) {
        console.log('Processing item:', item);
        const product = await Product.findById(item.productId).session(session);
        
        if (!product || !product.isActive) {
          throw new Error(`Product ${item.productId} is no longer available`);
        }

        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
        }

        // Prepare order item
        const orderItem = {
          productId: product._id,
          productName: product.name,
          quantity: item.quantity,
          price: product.price,
          total: item.quantity * product.price
        };

        orderItems.push(orderItem);
        totalAmount += orderItem.total;
      }

      // Step 2: Create the order
      const orderData = {
        userId,
        items: orderItems,
        totalAmount: Math.round(totalAmount * 100) / 100,
        shippingAddress,
        paymentMethod,
        status: 'pending',
        paymentStatus: paymentMethod === 'cash_on_delivery' ? 'pending' : 'completed',
        transactionId: `TXN-${Date.now()}-${userId.toString().slice(-6)}`
      };

      order = await Order.createOrderWithTransaction(orderData, session);
      console.log('Order created:', order.orderNumber);

      // Step 3: Update product stock and sales count
      for (const item of orderItems) {
        // Use concurrency-safe stock update
        await Product.updateStockSafe(item.productId, -item.quantity, session);
        
        // Update total sold count
        await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { totalSold: item.quantity } },
          { session }
        );
        console.log(`Updated stock for product ${item.productId}: -${item.quantity}`);
      }

      // Step 4: Log order activity (audit trail)
      console.log(`Order ${order.orderNumber} processed successfully. Total: $${totalAmount}`);
    });

    // Step 5: Clear user's cart (outside transaction)
    clearCartForUser(userId.toString());

    res.status(201).json({
      message: 'Order placed successfully',
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        status: order.status,
        items: order.items,
        createdAt: order.createdAt,
        transactionId: order.transactionId
      }
    });

  } catch (error) {
    console.error('Order creation error:', error);
    console.error('Stack trace:', error.stack);
    
    // Transaction will auto-rollback on error
    if (error.message.includes('Insufficient stock') || 
        error.message.includes('no longer available') ||
        error.message.includes('concurrent modification')) {
      return res.status(409).json({ message: error.message });
    }

    res.status(500).json({ 
      message: 'Failed to create order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    await session.endSession();
  }
});

// Get User's Orders - CRUD Operation (Read)
router.get('/my-orders', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user._id;

    // Use optimized query method
    const orders = await Order.findUserOrders(userId, { limit: parseInt(limit) })
      .skip((parseInt(page) - 1) * parseInt(limit));

    const totalOrders = await Order.countDocuments({ userId });

    res.json({
      message: 'Orders retrieved successfully',
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalOrders / parseInt(limit)),
        totalOrders,
        hasNext: parseInt(page) * parseInt(limit) < totalOrders,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get Single Order - CRUD Operation (Read)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Validate MongoDB ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid order ID format' });
    }

    // Build query based on user role
    const query = { _id: id };
    if (req.user.role !== 'admin') {
      query.userId = userId; // Non-admin users can only see their own orders
    }

    const order = await Order.findOne(query)
      .populate('userId', 'name email')
      .populate('items.productId', 'name imageUrl category');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({
      message: 'Order retrieved successfully',
      order
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update Order Status - CRUD Operation (Update) - Admin Only
router.patch('/:id/status', authenticate, adminOnly, orderValidation.updateStatus, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid order ID format' });
    }

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(
      id,
      { status, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('userId', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // If order is cancelled, restore product stock
    if (status === 'cancelled' && order.status !== 'cancelled') {
      try {
        for (const item of order.items) {
          await Product.updateStockSafe(item.productId, item.quantity);
          console.log(`Restored stock for product ${item.productId}: +${item.quantity}`);
        }
      } catch (stockError) {
        console.error('Error restoring stock after cancellation:', stockError);
        // Don't fail the status update if stock restoration fails
      }
    }

    res.json({
      message: 'Order status updated successfully',
      order
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ 
      message: 'Failed to update order status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get Monthly Revenue - Aggregation Pipeline Feature
router.get('/analytics/monthly-revenue', authenticate, adminOnly, async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const monthlyRevenue = await Order.getMonthlyRevenue(parseInt(year));

    res.json({
      message: 'Monthly revenue data retrieved successfully',
      year: parseInt(year),
      data: monthlyRevenue
    });

  } catch (error) {
    console.error('Get monthly revenue error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve monthly revenue data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get Order Status Statistics - Aggregation Pipeline Feature
router.get('/analytics/status-stats', authenticate, adminOnly, async (req, res) => {
  try {
    const statusStats = await Order.getOrderStatusStats();

    res.json({
      message: 'Order status statistics retrieved successfully',
      data: statusStats
    });

  } catch (error) {
    console.error('Get order status stats error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve order status statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get Orders for Admin Dashboard - CRUD Operation (Read) - Admin Only
router.get('/', authenticate, adminOnly, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      search,
      startDate,
      endDate 
    } = req.query;

    // Build query with filters
    const query = {};
    
    if (status && ['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      query.orderNumber = { $regex: search, $options: 'i' };
    }

    const orders = await Order.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const totalOrders = await Order.countDocuments(query);

    res.json({
      message: 'Orders retrieved successfully',
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalOrders / parseInt(limit)),
        totalOrders,
        hasNext: parseInt(page) * parseInt(limit) < totalOrders,
        hasPrev: parseInt(page) > 1
      },
      filters: { status, search, startDate, endDate }
    });

  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Cancel Order - Customer can cancel pending orders
router.patch('/:id/cancel', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Validate MongoDB ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid order ID format' });
    }

    // Find order and check ownership
    const order = await Order.findOne({ _id: id, userId });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ 
        message: `Cannot cancel order. Current status: ${order.status}` 
      });
    }

    // Update order status
    order.status = 'cancelled';
    await order.save();

    // Restore product stock
    try {
      for (const item of order.items) {
        await Product.updateStockSafe(item.productId, item.quantity);
        console.log(`Restored stock for product ${item.productId}: +${item.quantity}`);
      }
    } catch (stockError) {
      console.error('Error restoring stock after cancellation:', stockError);
    }

    res.json({
      message: 'Order cancelled successfully',
      order
    });

  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ 
      message: 'Failed to cancel order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router; 