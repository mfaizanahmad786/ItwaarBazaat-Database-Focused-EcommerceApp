import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from '../config/axios';

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [bestSelling, setBestSelling] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [productsResponse, bestSellingResponse] = await Promise.all([
          axios.get('/api/products?limit=6'),
          axios.get('/api/products/best-selling?limit=4')
        ]);

        setFeaturedProducts(productsResponse.data.products || []);
        setBestSelling(bestSellingResponse.data.products || []);
        setError(null);
      } catch (error) {
        console.error('Error fetching home data:', error);
        setError('Failed to load products. Please try again later.');
        setFeaturedProducts([]);
        setBestSelling([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-red-600 mb-4">{error}</div>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-20 px-6 rounded-xl">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6">
            Itwar Bazaar
          </h1>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/products"
              className="btn-primary text-lg px-8 py-3 inline-block"
            >
              Shop Now
            </Link>
            <Link 
              to="/register"
              className="bg-white text-primary-600 hover:bg-gray-100 font-medium py-3 px-8 rounded-lg transition-colors duration-200 inline-block"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* Best Selling Products */}
      {bestSelling && bestSelling.length > 0 && (
        <section>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800">Best Selling Products</h2>
            <Link 
              to="/products" 
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              View All →
            </Link>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {bestSelling.map((product) => (
              <div key={product._id} className="card hover:shadow-lg transition-shadow">
                <img 
                  src={product.imageUrl || 'https://via.placeholder.com/300x300?text=No+Image'} 
                  alt={product.name}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
                <div className="card-body">
                  <h3 className="font-semibold text-lg mb-2 truncate">{product.name}</h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.category}</p>
                  <div className="flex justify-between items-center mb-5">
                    <span className="text-xl font-bold text-primary-600">
                      ${product.price}
                    </span>
                    <span className="text-sm text-gray-500">
                      {product.totalSold} sold
                    </span>
                  </div>
                  <Link 
                    to={`/products/${product._id}`}
                    className="btn-primary w-full mt-4 text-center"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      {featuredProducts && featuredProducts.length > 0 && (
        <section>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800">Featured Products</h2>
            <Link 
              to="/products" 
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              View All →
            </Link>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProducts.map((product) => (
              <div key={product._id} className="card hover:shadow-lg transition-shadow">
                <img 
                  src={product.imageUrl || 'https://via.placeholder.com/300x300?text=No+Image'} 
                  alt={product.name}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
                <div className="card-body">
                  <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xl font-bold text-primary-600">
                      ${product.price}
                    </span>
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-sm">
                      {product.category}
                    </span>
                  </div>
                  <Link 
                    to={`/products/${product._id}`}
                    className="btn-primary w-full text-center"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Call to Action */}
      <section className="bg-gray-100 py-16 px-6 rounded-xl text-center">
        <div className="space-x-4">
          <Link to="/products" className="btn-primary">
            Browse Products
          </Link>
          <Link to="/admin" className="btn-secondary">
            Admin Dashboard
          </Link>
        </div>
        <div className="mt-8 text-sm text-gray-500">
          <p>Test Credentials:</p>
          <p>Admin: admin@ecommerce.com / admin123</p>
          <p>Customer: john.doe@example.com / password123</p>
        </div>
      </section>
    </div>
  );
};

export default Home; 