import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import PrivacyPolicy from './pages/PrivacyPolicy';
import ThumbnailTest from './pages/ThumbnailTest';
import TermsOfService from './pages/TermsOfService';
import Pricing from './pages/Pricing';
import Advertise from './pages/Advertise';
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
         <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/resources" element={<ResourceHub />} />
        <Route path="/" element={<Login />} />
        <Route path="/thumbnail-test" element={<ThumbnailTest />} />
	<Route path="/analytics" element={<Analytics />} />
        <Route path="/admin" element={<AdminPanel />} />
	<Route path="/profile" element={<Profile />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/thumbnail-test" element={<ThumbnailTest />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/advertise" element={<Advertise />} />
      </Routes>
    </Router>
  );
}

export default App;