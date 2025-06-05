import React, { useState, useEffect } from 'react';
import axios from '../../config/axios';

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    page: 1
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalProducts: 0
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Electronics',
    stock: '',
    imageUrl: ''
  });

  const categories = ['Electronics', 'Clothing', 'Books', 'Home', 'Sports', 'Other'];

  const defaultImage = 'https://placehold.co/300x300/EEE/31343C?text=No+Image';

  useEffect(() => {
    fetchProducts();
  }, [filters]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: filters.page,
        limit: 10,
        ...(filters.search && { search: filters.search }),
        ...(filters.category && { category: filters.category })
      });

      const response = await axios.get(`/api/products?${queryParams}`);
      setProducts(response.data.products);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching products:', error);
      alert('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value, page: 1 });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: 'Electronics',
      stock: '',
      imageUrl: defaultImage
    });
    setEditingProduct(null);
  };

  const openModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        category: product.category,
        stock: product.stock.toString(),
        imageUrl: product.imageUrl || ''
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('You must be logged in to perform this action');
        return;
      }

      // Validate required fields
      if (!formData.name || !formData.description || !formData.price || !formData.stock) {
        alert('Please fill in all required fields');
        return;
      }

      // Validate description length
      if (formData.description.length < 10) {
        alert('Description must be at least 10 characters long');
        return;
      }

      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        name: formData.name.trim(),
        description: formData.description.trim()
      };

      // Validate numeric values
      if (isNaN(productData.price) || productData.price <= 0) {
        alert('Please enter a valid price');
        return;
      }

      if (isNaN(productData.stock) || productData.stock < 0) {
        alert('Please enter a valid stock quantity');
        return;
      }

      console.log('Submitting product data:', productData);
      console.log('Auth token exists:', !!token);

      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      if (editingProduct) {
        const response = await axios.put(`/api/products/${editingProduct._id}`, productData, config);
        console.log('Update response:', response.data);
        alert('Product updated successfully!');
      } else {
        const response = await axios.post('/api/products', productData, config);
        console.log('Create response:', response.data);
        alert('Product created successfully!');
      }

      closeModal();
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      
      // Enhanced error handling
      const errorResponse = error.response?.data;
      let errorMessage = 'Failed to save product';
      
      if (errorResponse) {
        if (errorResponse.errors && Array.isArray(errorResponse.errors)) {
          errorMessage = errorResponse.errors.map(err => err.msg).join('\n');
        } else if (errorResponse.message) {
          errorMessage = errorResponse.message;
        }
      }
      
      alert(errorMessage);
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
      return;
    }

    try {
      await axios.delete(`/api/products/${product._id}`);
      alert('Product deleted successfully!');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  };

  const handleStockUpdate = async (productId, change) => {
    try {
      await axios.patch(`/api/products/${productId}/stock`, {
        quantityChange: change
      });
      fetchProducts();
    } catch (error) {
      console.error('Error updating stock:', error);
      alert(error.response?.data?.message || 'Failed to update stock');
    }
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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Product Management</h1>
        <button
          onClick={() => openModal()}
          className="btn-primary"
        >
          Add New Product
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Search Products</label>
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Search by name or description..."
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Category</label>
              <select
                name="category"
                value={filters.category}
                onChange={handleFilterChange}
                className="form-input"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ search: '', category: '', page: 1 })}
                className="btn-secondary"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="card">
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">Image</th>
                  <th className="text-left py-3 px-2">Name</th>
                  <th className="text-left py-3 px-2">Category</th>
                  <th className="text-left py-3 px-2">Price</th>
                  <th className="text-left py-3 px-2">Stock</th>
                  <th className="text-left py-3 px-2">Status</th>
                  <th className="text-left py-3 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product._id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2">
                      <img
                        src={product.imageUrl || defaultImage}
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = defaultImage;
                        }}
                      />
                    </td>
                    <td className="py-3 px-2">
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {product.description}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">
                        {product.category}
                      </span>
                    </td>
                    <td className="py-3 px-2 font-medium">${product.price}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleStockUpdate(product._id, -1)}
                          className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-sm hover:bg-red-200"
                          disabled={product.stock <= 0}
                        >
                          -
                        </button>
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                          product.stock > 10 ? 'bg-green-100 text-green-800' : 
                          product.stock > 0 ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'
                        }`}>
                          {product.stock}
                        </span>
                        <button
                          onClick={() => handleStockUpdate(product._id, 1)}
                          className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm hover:bg-green-200"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-1 rounded text-sm ${
                        product.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openModal(product)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center space-x-2 mt-6">
              <button
                onClick={() => setFilters({ ...filters, page: pagination.currentPage - 1 })}
                disabled={pagination.currentPage === 1}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
              >
                Previous
              </button>

              {[...Array(pagination.totalPages)].map((_, index) => {
                const page = index + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setFilters({ ...filters, page })}
                    className={`px-3 py-2 rounded-lg ${
                      page === pagination.currentPage
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}

              <button
                onClick={() => setFilters({ ...filters, page: pagination.currentPage + 1 })}
                disabled={pagination.currentPage === pagination.totalPages}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Product Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    required
                    minLength="2"
                    maxLength="100"
                    pattern="[a-zA-Z0-9\s\-_.,!]+"
                  />
                  <p className="mt-1 text-sm text-gray-500">2-100 characters, letters, numbers, and basic punctuation only</p>
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Description *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    rows="4"
                    required
                    minLength="10"
                    maxLength="1000"
                  ></textarea>
                  <p className="text-sm text-gray-500 mt-1">
                    {formData.description.length}/1000 characters (minimum 10)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Price</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    required
                    min="0"
                    max="999999"
                    step="0.01"
                  />
                  <p className="mt-1 text-sm text-gray-500">Must be between 0 and 999,999</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    required
                  >
                    <option value="">Select a category</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Clothing">Clothing</option>
                    <option value="Books">Books</option>
                    <option value="Home">Home</option>
                    <option value="Sports">Sports</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Stock</label>
                  <input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    required
                    min="0"
                    step="1"
                  />
                  <p className="mt-1 text-sm text-gray-500">Must be a non-negative whole number</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Image URL</label>
                  <input
                    type="url"
                    name="imageUrl"
                    value={formData.imageUrl}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    placeholder="https://example.com/image.jpg"
                  />
                  <p className="mt-1 text-sm text-gray-500">Optional. Must be a valid URL</p>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    {editingProduct ? 'Update Product' : 'Add Product'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProducts; 