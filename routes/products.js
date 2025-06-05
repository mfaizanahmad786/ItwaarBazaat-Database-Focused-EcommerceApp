const express = require('express');
const { validationResult } = require('express-validator');
const { Product, productValidation } = require('../models/Product');
const { authenticate, adminOnly, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get All Products with Pagination and Search - CRUD Operation (Read)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      search,
      minPrice,
      maxPrice,
      sort = '-createdAt'
    } = req.query;

    // Build query with input sanitization - NoSQL Injection Prevention
    const query = { isActive: true };
    
    if (category && ['Electronics', 'Clothing', 'Books', 'Home', 'Sports', 'Other'].includes(category)) {
      query.category = category;
    }
    
    if (search) {
      // Use regex for partial and case-insensitive match
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice && !isNaN(parseFloat(minPrice))) {
        query.price.$gte = parseFloat(minPrice);
      }
      if (maxPrice && !isNaN(parseFloat(maxPrice))) {
        query.price.$lte = parseFloat(maxPrice);
      }
    }

    // Pagination options
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: sort,
      populate: [],
      lean: true
    };

    // Use pagination plugin
    const products = await Product.paginate(query, options);

    res.json({
      message: 'Products retrieved successfully',
      products: products.docs,
      pagination: {
        currentPage: products.page,
        totalPages: products.totalPages,
        totalProducts: products.totalDocs,
        hasNext: products.hasNextPage,
        hasPrev: products.hasPrevPage
      },
      filters: {
        category,
        search,
        minPrice,
        maxPrice,
        sort
      }
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get Products by Category with Query Optimization - Query Optimization Feature
router.get('/category/:category', optionalAuth, async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 10 } = req.query;

    // Validate category
    const validCategories = ['Electronics', 'Clothing', 'Books', 'Home', 'Sports', 'Other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    // Use optimized query method
    const products = await Product.findByCategory(category, { limit: parseInt(limit) });

    res.json({
      message: `${category} products retrieved successfully`,
      products,
      category
    });

  } catch (error) {
    console.error('Get category products error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve category products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get Best Selling Products - Aggregation Pipeline Feature
router.get('/best-selling', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const bestSelling = await Product.getBestSelling(parseInt(limit));

    res.json({
      message: 'Best selling products retrieved successfully',
      products: bestSelling
    });

  } catch (error) {
    console.error('Get best selling error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve best selling products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get Single Product - CRUD Operation (Read)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid product ID format' });
    }

    const product = await Product.findOne({ _id: id, isActive: true });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({
      message: 'Product retrieved successfully',
      product
    });

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Create New Product - CRUD Operation (Create) - Admin Only
router.post('/', authenticate, adminOnly, productValidation.create, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const productData = {
      name: req.body.name.trim(),
      description: req.body.description.trim(),
      price: parseFloat(req.body.price),
      category: req.body.category,
      stock: parseInt(req.body.stock),
      imageUrl: req.body.imageUrl || undefined
    };

    const product = new Product(productData);
    await product.save();

    res.status(201).json({
      message: 'Product created successfully',
      product
    });

  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ 
      message: 'Failed to create product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update Product - CRUD Operation (Update) - Admin Only
router.put('/:id', authenticate, adminOnly, productValidation.update, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid product ID format' });
    }

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Build update object
    const updates = {};
    if (req.body.name) updates.name = req.body.name.trim();
    if (req.body.description) updates.description = req.body.description.trim();
    if (req.body.price !== undefined) updates.price = parseFloat(req.body.price);
    if (req.body.category) updates.category = req.body.category;
    if (req.body.stock !== undefined) updates.stock = parseInt(req.body.stock);
    if (req.body.imageUrl) updates.imageUrl = req.body.imageUrl;
    if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;

    const product = await Product.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({
      message: 'Product updated successfully',
      product
    });

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ 
      message: 'Failed to update product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete Product (Soft Delete) - CRUD Operation (Delete) - Admin Only
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid product ID format' });
    }

    // Soft delete by setting isActive to false
    const product = await Product.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({
      message: 'Product deleted successfully',
      product
    });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ 
      message: 'Failed to delete product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update Product Stock with Concurrency Control - Concurrency Control Feature
router.patch('/:id/stock', authenticate, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantityChange } = req.body;

    // Validate inputs
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid product ID format' });
    }

    if (!quantityChange || isNaN(parseInt(quantityChange))) {
      return res.status(400).json({ message: 'Valid quantity change is required' });
    }

    // Use OCC (Optimistic Concurrency Control) method
    const updatedProduct = await Product.updateStockSafe(id, parseInt(quantityChange));

    res.json({
      message: 'Product stock updated successfully',
      product: updatedProduct
    });

  } catch (error) {
    console.error('Update stock error:', error);
    
    if (error.message.includes('concurrent modification') || 
        error.message.includes('Insufficient stock') ||
        error.message.includes('locked')) {
      return res.status(409).json({ message: error.message });
    }

    res.status(500).json({ 
      message: 'Failed to update product stock',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Search Products with Text Index - MongoDB Indexing Feature
router.get('/search/:term', async (req, res) => {
  try {
    const { term } = req.params;
    const { limit = 20 } = req.query;

    // Sanitize search term
    const sanitizedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const products = await Product.find({
      $text: { $search: sanitizedTerm },
      isActive: true
    })
    .select('name description price category stock imageUrl')
    .limit(parseInt(limit))
    .sort({ score: { $meta: 'textScore' } });

    res.json({
      message: 'Search completed successfully',
      products,
      searchTerm: term,
      resultsCount: products.length
    });

  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({ 
      message: 'Search failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router; 