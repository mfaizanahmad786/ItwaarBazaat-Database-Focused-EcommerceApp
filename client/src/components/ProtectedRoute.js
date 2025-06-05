import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return (
      <div className="text-center py-20">
        <h1 className="text-4xl font-bold text-red-600 mb-4">Access Denied</h1>
        <p className="text-gray-600">You don't have permission to access this page.</p>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute; 