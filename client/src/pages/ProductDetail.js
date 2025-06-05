import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../config/axios';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');

  const { addToCart } = useCart();
  const { user } = useAuth();

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/products/${id}`);
      setProduct(response.data.product);
    } catch (error) {
      setError('Product not found');
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      alert('Please login to add items to cart');
      navigate('/login');
      return;
    }
    
    try {
      await addToCart(product._id, quantity);
      alert(`${quantity} ${product.name}(s) added to cart!`);
    } catch (error) {
      alert('Failed to add product to cart');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="text-center py-20">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Product Not Found</h1>
        <p className="text-gray-600 mb-6">{error}</p>
        <button 
          onClick={() => navigate('/products')}
          className="btn-primary"
        >
          Back to Products
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Product Image */}
        <div>
          <img 
            src={product.imageUrl || 'https://via.placeholder.com/500x500?text=No+Image'} 
            alt={product.name}
            className="w-full h-96 object-cover rounded-lg shadow-md"
          />
        </div>

        {/* Product Details */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{product.name}</h1>
            <div className="flex items-center space-x-4 mb-4">
              <span className="text-3xl font-bold text-primary-600">
                ${product.price}
              </span>
              <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                {product.category}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Description</h3>
            <p className="text-gray-600">{product.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-500">Stock Available</span>
              <p className="font-semibold">{product.stock} units</p>
            </div>
            {product.totalSold > 0 && (
              <div>
                <span className="text-sm text-gray-500">Total Sold</span>
                <p className="font-semibold text-green-600">{product.totalSold} units</p>
              </div>
            )}
          </div>

          {product.stock > 0 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <select
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  className="form-input w-24"
                >
                  {[...Array(Math.min(10, product.stock))].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={handleAddToCart}
                  className="btn-primary flex-1"
                >
                  Add to Cart
                </button>
                <button
                  onClick={() => navigate('/products')}
                  className="btn-secondary"
                >
                  Back to Products
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                This product is currently out of stock
              </div>
              <button
                onClick={() => navigate('/products')}
                className="btn-secondary w-full"
              >
                Back to Products
              </button>
            </div>
          )}

          {!user && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
              <p>Please <button onClick={() => navigate('/login')} className="text-primary-600 underline">login</button> to add items to cart</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail; 