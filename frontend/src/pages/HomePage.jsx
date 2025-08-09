import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FeedPage from './FeedPage';

function HomePage() {
  const { user, loading } = useAuth(); // Get the new loading state

  // 1. If we are still loading, show a simple loading message
  if (loading) {
    return <p>Loading...</p>;
  }

  // 2. Once loading is false, then we can make a decision
  return user ? <FeedPage /> : <Navigate to="/users" />;
}

export default HomePage;