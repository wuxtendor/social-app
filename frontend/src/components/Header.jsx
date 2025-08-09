import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import our new useAuth hook
import './Header.css';

function Header() {
  const { user, logout } = useAuth(); // Get user and logout function from context
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); // Call the logout function from context
    navigate('/login'); // Redirect to login page
  };

  return (
    <header className="app-header">
      <Link to="/" className="logo">SocialApp</Link>
      <nav className="navigation">
        {user ? (
          // If user is logged in, show their name and a logout button
          <>
            <span>Welcome, {user.name}!</span>
            <Link to={`/users/${user.userId}`}>My Profile</Link>
            <Link to="/friends">Friends</Link>
            <button onClick={handleLogout}>Logout</button>
          </>
        ) : (
          // If no user, show login and register links
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </nav>
    </header>
  );
}

export default Header;