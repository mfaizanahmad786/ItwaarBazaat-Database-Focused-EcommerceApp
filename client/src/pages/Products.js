import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from '../config/axios';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    sort: '-createdAt'
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalProducts: 0
  });

  const { addToCart } = useCart();
  const { user } = useAuth();

  const categories = ['Electronics', 'Clothing', 'Books', 'Home', 'Sports', 'Other'];

  // Debounced search function
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId;
      return (value) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setFilters(prev => ({ ...prev, search: value }));
          setPagination(prev => ({ ...prev, currentPage: 1 }));
        }, 500); // 500ms delay
      };
    })(),
    []
  );

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  useEffect(() => {
    fetchProducts();
  }, [
    filters.search,
    filters.category,
    filters.minPrice,
    filters.maxPrice,
    filters.sort,
    pagination.currentPage
  ]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: pagination.currentPage,
        limit: 12,
        ...filters
      }).toString();

      const response = await axios.get(`/api/products?${queryParams}`);
      setProducts(response.data.products);
      setPagination({
        currentPage: response.data.pagination.currentPage,
        totalPages: response.data.pagination.totalPages,
        totalProducts: response.data.pagination.totalProducts
      });
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    if (key === 'search') return; // Ignore direct search filter changes
    setFilters({ ...filters, [key]: value });
    setPagination({ ...pagination, currentPage: 1 });
  };

  const handleAddToCart = async (product) => {
    if (!user) {
      alert('Please login to add items to cart');
      return;
    }
    
    try {
      await addToCart(product._id, 1);
      alert('Product added to cart!');
    } catch (error) {
      alert('Failed to add product to cart');
    }
  };

  const handlePageChange = (page) => {
    setPagination({ ...pagination, currentPage: page });
    window.scrollTo(0, 0);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Our Products</h1>
        <p className="text-gray-600">Discover our wide range of quality products</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="grid md:grid-cols-5 gap-4">
          {/* Search */}
          <div>
            <label className="form-label">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search products..."
              className="form-input"
            />
          </div>

          {/* Category */}
          <div>
            <label className="form-label">Category</label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="form-input"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Min Price */}
          <div>
            <label className="form-label">Min Price</label>
            <input
              type="number"
              value={filters.minPrice}
              onChange={(e) => handleFilterChange('minPrice', e.target.value)}
              placeholder="$0"
              className="form-input"
            />
          </div>

          {/* Max Price */}
          <div>
            <label className="form-label">Max Price</label>
            <input
              type="number"
              value={filters.maxPrice}
              onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
              placeholder="$1000"
              className="form-input"
            />
          </div>

          {/* Sort */}
          <div>
            <label className="form-label">Sort By</label>
            <select
              value={filters.sort}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
              className="form-input"
            >
              <option value="-createdAt">Newest First</option>
              <option value="createdAt">Oldest First</option>
              <option value="price">Price: Low to High</option>
              <option value="-price">Price: High to Low</option>
              <option value="name">Name: A to Z</option>
              <option value="-name">Name: Z to A</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Info */}
      <div className="flex justify-between items-center">
        <p className="text-gray-600">
          Showing {products.length} of {pagination.totalProducts} products
        </p>
        <p className="text-gray-600">
          Page {pagination.currentPage} of {pagination.totalPages}
        </p>
      </div>

      {/* Products Grid */}
      {products.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <div key={product._id} className="card hover:shadow-lg transition-shadow">
              <img 
                src={product.imageUrl || 'https://via.placeholder.com/300x300?text=No+Image'} 
                alt={product.name}
                className="w-full h-48 object-cover rounded-t-lg"
              />
              <div className="card-body">
                <h3 className="font-semibold text-lg mb-2 line-clamp-2">{product.name}</h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xl font-bold text-primary-600">
                    ${product.price}
                  </span>
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-sm">
                    {product.category}
                  </span>
                </div>

                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-gray-500">
                    Stock: {product.stock}
                  </span>
                  {product.totalSold > 0 && (
                    <span className="text-sm text-green-600">
                      {product.totalSold} sold
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <Link 
                    to={`/products/${product._id}`}
                    className="btn-secondary w-full text-center block"
                  >
                    View Details
                  </Link>
                  
                  {user && product.stock > 0 && (
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="btn-primary w-full"
                    >
                      Add to Cart
                    </button>
                  )}

                  {product.stock === 0 && (
                    <button disabled className="w-full bg-gray-300 text-gray-500 py-2 px-4 rounded-lg cursor-not-allowed">
                      Out of Stock
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No products found</h3>
          <p className="text-gray-500">Try adjusting your filters or search terms</p>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
          >
            Previous
          </button>

          {[...Array(pagination.totalPages)].map((_, index) => {
            const page = index + 1;
            if (
              page === 1 || 
              page === pagination.totalPages || 
              (page >= pagination.currentPage - 2 && page <= pagination.currentPage + 2)
            ) {
              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-2 rounded-lg ${
                    page === pagination.currentPage
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {page}
                </button>
              );
            } else if (
              page === pagination.currentPage - 3 || 
              page === pagination.currentPage + 3
            ) {
              return <span key={page} className="px-2">...</span>;
            }
            return null;
          })}

          <button
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Products; 