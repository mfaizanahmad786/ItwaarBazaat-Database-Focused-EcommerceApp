const express = require('express');
const { User } = require('../models/User');
const { Product } = require('../models/Product');
const { Order } = require('../models/Order');
const MonthlyStats = require('../models/MonthlyStats');
const { authenticate, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Admin Dashboard Overview - Aggregation Pipelines and Materialized Views
router.get('/dashboard', authenticate, adminOnly, async (req, res) => {
  try {
    // Get current month and year
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Use Promise.all for concurrent execution
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      monthlyRevenue,
      bestSellingProducts,
      orderStatusStats,
      recentOrders,
      lowStockProducts
    ] = await Promise.all([
      // Total Users Count
      User.countDocuments({ role: 'customer' }),
      
      // Total Active Products
      Product.countDocuments({ isActive: true }),
      
      // Total Orders
      Order.countDocuments(),
      
      // Current Month Revenue using Aggregation
      Order.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(currentYear, currentMonth - 1, 1),
              $lt: new Date(currentYear, currentMonth, 0).setHours(23, 59, 59, 999)
            },
            status: { $ne: 'cancelled' },
            paymentStatus: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            orderCount: { $sum: 1 },
            averageOrderValue: { $avg: '$totalAmount' }
          }
        }
      ]),
      
      // Best Selling Products
      Product.getBestSelling(5),
      
      // Order Status Distribution
      Order.getOrderStatusStats(),
      
      // Recent Orders
      Order.find()
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .limit(10)
        .select('orderNumber totalAmount status createdAt userId'),
      
      // Low Stock Products
      Product.find({ 
        isActive: true, 
        stock: { $lte: 10, $gt: 0 } 
      })
        .sort({ stock: 1 })
        .limit(10)
        .select('name stock category price')
    ]);

    // Process monthly revenue data
    const currentMonthData = monthlyRevenue[0] || {
      totalRevenue: 0,
      orderCount: 0,
      averageOrderValue: 0
    };

    res.json({
      message: 'Dashboard data retrieved successfully',
      overview: {
        totalUsers,
        totalProducts,
        totalOrders,
        currentMonthRevenue: Math.round(currentMonthData.totalRevenue * 100) / 100,
        currentMonthOrders: currentMonthData.orderCount,
        averageOrderValue: Math.round(currentMonthData.averageOrderValue * 100) / 100
      },
      charts: {
        bestSellingProducts,
        orderStatusStats
      },
      tables: {
        recentOrders,
        lowStockProducts
      },
      generatedAt: new Date()
    });

  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get Sales Analytics - Materialized Views Feature
router.get('/analytics/sales', authenticate, adminOnly, async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    // Get data from materialized view
    const yearlyTrends = await MonthlyStats.getYearlyTrends(parseInt(year));

    // Get real-time data for comparison
    const realTimeData = await Order.getMonthlyRevenue(parseInt(year));

    // Calculate year-over-year growth if previous year data exists
    const previousYearTrends = await MonthlyStats.getYearlyTrends(parseInt(year) - 1);
    
    let yearOverYearGrowth = null;
    if (previousYearTrends.length > 0 && yearlyTrends.length > 0) {
      const currentYearTotal = yearlyTrends.reduce((sum, month) => sum + month.totalRevenue, 0);
      const previousYearTotal = previousYearTrends.reduce((sum, month) => sum + month.totalRevenue, 0);
      
      if (previousYearTotal > 0) {
        yearOverYearGrowth = ((currentYearTotal - previousYearTotal) / previousYearTotal * 100).toFixed(2);
      }
    }

    res.json({
      message: 'Sales analytics retrieved successfully',
      year: parseInt(year),
      materializedViewData: yearlyTrends,
      realTimeData,
      insights: {
        totalAnnualRevenue: yearlyTrends.reduce((sum, month) => sum + month.totalRevenue, 0),
        totalAnnualOrders: yearlyTrends.reduce((sum, month) => sum + month.totalOrders, 0),
        yearOverYearGrowth: yearOverYearGrowth ? `${yearOverYearGrowth}%` : 'N/A'
      }
    });

  } catch (error) {
    console.error('Sales analytics error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve sales analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Refresh Materialized Views - Materialized Views Feature
router.post('/analytics/refresh-stats', authenticate, adminOnly, async (req, res) => {
  try {
    const { year, month } = req.body;

    if (year && month) {
      // Refresh specific month
      const result = await MonthlyStats.refreshMonthlyStats(parseInt(year), parseInt(month));
      res.json({
        message: `Monthly stats refreshed for ${month}/${year}`,
        data: result
      });
    } else if (year) {
      // Refresh entire year
      const results = await MonthlyStats.refreshYearlyStats(parseInt(year));
      res.json({
        message: `Yearly stats refreshed for ${year}`,
        monthsProcessed: results.length,
        data: results
      });
    } else {
      // Refresh current year
      const currentYear = new Date().getFullYear();
      const results = await MonthlyStats.refreshYearlyStats(currentYear);
      res.json({
        message: `Current year stats refreshed for ${currentYear}`,
        monthsProcessed: results.length,
        data: results
      });
    }

  } catch (error) {
    console.error('Refresh stats error:', error);
    res.status(500).json({ 
      message: 'Failed to refresh statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get User Analytics
router.get('/analytics/users', authenticate, adminOnly, async (req, res) => {
  try {
    // User registration trends
    const userTrends = await User.aggregate([
      {
        $match: {
          role: 'customer',
          createdAt: {
            $gte: new Date(new Date().getFullYear(), 0, 1) // Current year
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          newUsers: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          monthName: {
            $arrayElemAt: [
              ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
              { $subtract: ['$_id.month', 1] }
            ]
          },
          newUsers: 1
        }
      }
    ]);

    // Top customers by order value
    const topCustomers = await Order.aggregate([
      {
        $match: {
          status: { $ne: 'cancelled' },
          paymentStatus: 'completed'
        }
      },
      {
        $group: {
          _id: '$userId',
          totalSpent: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          name: '$user.name',
          email: '$user.email',
          totalSpent: { $round: ['$totalSpent', 2] },
          orderCount: 1,
          averageOrderValue: { $round: ['$averageOrderValue', 2] }
        }
      },
      {
        $sort: { totalSpent: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.json({
      message: 'User analytics retrieved successfully',
      userRegistrationTrends: userTrends,
      topCustomers
    });

  } catch (error) {
    console.error('User analytics error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve user analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get Product Analytics
router.get('/analytics/products', authenticate, adminOnly, async (req, res) => {
  try {
    // Category performance
    const categoryPerformance = await Order.aggregate([
      {
        $match: {
          status: { $ne: 'cancelled' },
          createdAt: {
            $gte: new Date(new Date().getFullYear(), 0, 1) // Current year
          }
        }
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$product.category',
          revenue: { $sum: '$items.total' },
          quantitySold: { $sum: '$items.quantity' },
          orderCount: { $sum: 1 },
          uniqueProducts: { $addToSet: '$items.productId' }
        }
      },
      {
        $project: {
          category: '$_id',
          revenue: { $round: ['$revenue', 2] },
          quantitySold: 1,
          orderCount: 1,
          uniqueProductCount: { $size: '$uniqueProducts' },
          _id: 0
        }
      },
      {
        $sort: { revenue: -1 }
      }
    ]);

    // Low stock alerts
    const lowStockAlerts = await Product.find({
      isActive: true,
      stock: { $lte: 5 }
    })
    .sort({ stock: 1 })
    .select('name category stock price')
    .limit(20);

    // Product performance
    const productPerformance = await Product.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $project: {
          name: 1,
          category: 1,
          price: 1,
          stock: 1,
          totalSold: 1,
          revenue: { $multiply: ['$totalSold', '$price'] },
          stockValue: { $multiply: ['$stock', '$price'] }
        }
      },
      {
        $sort: { revenue: -1 }
      },
      {
        $limit: 20
      }
    ]);

    res.json({
      message: 'Product analytics retrieved successfully',
      categoryPerformance,
      lowStockAlerts,
      topProductsByRevenue: productPerformance
    });

  } catch (error) {
    console.error('Product analytics error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve product analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get All Users for Admin Management
router.get('/users', authenticate, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;

    // Build query
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role && ['customer', 'admin'].includes(role)) {
      query.role = role;
    }

    const users = await User.find(query)
      .select('-password -__v')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const totalUsers = await User.countDocuments(query);

    res.json({
      message: 'Users retrieved successfully',
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalUsers / parseInt(limit)),
        totalUsers,
        hasNext: parseInt(page) * parseInt(limit) < totalUsers,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Database Health Check - MongoDB Features Overview
router.get('/system/health', authenticate, adminOnly, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    
    // Get database stats
    const dbStats = await db.stats();
    
    // Get collection stats
    const collections = await db.listCollections().toArray();
    const collectionStats = [];
    
    for (const collection of collections) {
      const stats = await db.collection(collection.name).stats();
      collectionStats.push({
        name: collection.name,
        documents: stats.count,
        avgDocSize: Math.round(stats.avgObjSize || 0),
        totalSize: Math.round(stats.size / 1024), // KB
        indexes: stats.nindexes
      });
    }

    // Check indexes
    const indexInfo = {
      products: await db.collection('products').getIndexes(),
      users: await db.collection('users').getIndexes(),
      orders: await db.collection('orders').getIndexes()
    };

    res.json({
      message: 'System health check completed',
      database: {
        name: dbStats.db,
        collections: dbStats.collections,
        documents: dbStats.objects,
        dataSize: Math.round(dbStats.dataSize / 1024 / 1024), // MB
        storageSize: Math.round(dbStats.storageSize / 1024 / 1024), // MB
        indexes: dbStats.indexes
      },
      collections: collectionStats,
      indexesConfigured: Object.keys(indexInfo).reduce((total, collection) => {
        return total + Object.keys(indexInfo[collection]).length;
      }, 0),
      mongodbFeatures: {
        transactionsSupported: true,
        aggregationPipelines: true,
        textIndexes: true,
        compoundIndexes: true,
        viewsSupported: true
      }
    });

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      message: 'Health check failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router; 