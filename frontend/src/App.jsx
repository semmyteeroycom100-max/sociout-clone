import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import TestCampaign from './pages/TestCampaign';
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
        <Route path="/test-campaign" element={<TestCampaign />} />
        <Route path="/" element={<Login />} />
        <Route path="/thumbnail-test" element={<ThumbnailTest />} />
	<Route path="/analytics" element={<Analytics />} />
        <Route path="/admin" element={<AdminPanel />} />
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