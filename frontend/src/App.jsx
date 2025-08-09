import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import UserListPage from './pages/UserListPage';
import UserProfilePage from './pages/UserProfilePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import EditProfilePage from './pages/EditProfilePage'; // <-- Likely missing import
import FriendsPage from './pages/FriendsPage';
import ChatPage from './pages/ChatPage';           // <-- Likely missing import
import './App.css';

function App() {
  return (
    <div className="App">
      <Header />
      <main>
        <Routes>
          {/* Main and User Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/users" element={<UserListPage />} />
          <Route path="/users/:id" element={<UserProfilePage />} />
          
          {/* This route was likely missing */}
          <Route path="/users/:id/edit" element={<EditProfilePage />} />

          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Social Routes */}
          <Route path="/friends" element={<FriendsPage />} />
          
          {/* This route was also likely missing */}
          <Route path="/chat/:id" element={<ChatPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;