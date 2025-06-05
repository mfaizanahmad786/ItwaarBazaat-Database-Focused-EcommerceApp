import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { cartItemCount } = useCart();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="bg-white shadow-lg border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link to="/" className="text-2xl font-bold text-primary-600">
            Itwar Bazaar
          </Link>

          {/* Navigation Links - Desktop */}
          <div className="hidden md:flex space-x-6">
            <Link 
              to="/" 
              className="text-gray-700 hover:text-primary-600 transition-colors"
            >
              Home
            </Link>
            <Link 
              to="/products" 
              className="text-gray-700 hover:text-primary-600 transition-colors"
            >
              Products
            </Link>
            
            {/* Admin Navigation */}
            {user && user.role === 'admin' && (
              <div className="relative group">
                <button className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors">
                  <span>Admin</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link 
                    to="/admin" 
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    📊 Dashboard
                  </Link>
                  <Link 
                    to="/admin/products" 
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    📦 Manage Products
                  </Link>
                  <Link 
                    to="/admin/orders" 
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    🛒 Manage Orders
                  </Link>
                  <Link 
                    to="/admin/users" 
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    👥 Manage Users
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Right side - Desktop */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                {/* Cart - Only show for non-admin or customers */}
                {(!user.role || user.role === 'customer') && (
                  <Link 
                    to="/cart" 
                    className="relative text-gray-700 hover:text-primary-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6H19" />
                    </svg>
                    {cartItemCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {cartItemCount}
                      </span>
                    )}
                  </Link>
                )}

                {/* User Menu */}
                <div className="relative group">
                  <button className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 transition-colors">
                    <span>Hello, {user.name}</span>
                    {user.role === 'admin' && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded">ADMIN</span>
                    )}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    {(!user.role || user.role === 'customer') && (
                      <Link 
                        to="/orders" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        My Orders
                      </Link>
                    )}
                    <button 
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="text-gray-700 hover:text-primary-600 transition-colors"
                >
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button 
              onClick={toggleMobileMenu}
              className="text-gray-700 hover:text-primary-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-4">
              <Link 
                to="/" 
                className="text-gray-700 hover:text-primary-600 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                to="/products" 
                className="text-gray-700 hover:text-primary-600 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Products
              </Link>
              
              {user ? (
                <>
                  {(!user.role || user.role === 'customer') && (
                    <Link 
                      to="/cart" 
                      className="text-gray-700 hover:text-primary-600 transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Cart ({cartItemCount})
                    </Link>
                  )}
                  
                  {(!user.role || user.role === 'customer') && (
                    <Link 
                      to="/orders" 
                      className="text-gray-700 hover:text-primary-600 transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      My Orders
                    </Link>
                  )}
                  
                  {user.role === 'admin' && (
                    <>
                      <Link 
                        to="/admin" 
                        className="text-gray-700 hover:text-primary-600 transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Admin Dashboard
                      </Link>
                      <Link 
                        to="/admin/products" 
                        className="text-gray-700 hover:text-primary-600 transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Manage Products
                      </Link>
                      <Link 
                        to="/admin/orders" 
                        className="text-gray-700 hover:text-primary-600 transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Manage Orders
                      </Link>
                      <Link 
                        to="/admin/users" 
                        className="text-gray-700 hover:text-primary-600 transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Manage Users
                      </Link>
                    </>
                  )}
                  
                  <button 
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="text-left text-gray-700 hover:text-primary-600 transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    to="/login" 
                    className="text-gray-700 hover:text-primary-600 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link 
                    to="/register" 
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors inline-block"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar; 