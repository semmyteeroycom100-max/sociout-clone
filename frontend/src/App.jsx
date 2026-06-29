import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Settings from './pages/Settings';
import Campaigns from './pages/Campaigns';
import ResourceHub from './pages/ResourceHub';
import Profile from './pages/Profile';
import AdminPanel from './pages/AdminPanel';
import AdminPool from './pages/AdminPool';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ThumbnailTest from './pages/ThumbnailTest';
import TermsOfService from './pages/TermsOfService';
import Pricing from './pages/Pricing';
import Advertise from './pages/Advertise';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Legal Pages (Public) */}
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        
        {/* Protected Routes (User) */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/resources" element={<ResourceHub />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/thumbnail-test" element={<ThumbnailTest />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/advertise" element={<Advertise />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/admin/pool" element={<AdminPool />} />
        
        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;