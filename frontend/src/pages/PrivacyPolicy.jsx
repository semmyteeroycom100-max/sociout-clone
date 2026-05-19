import React from 'react';

function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        <p className="text-gray-600 mb-4">Last updated: {new Date().toLocaleDateString()}</p>
        
        <h2 className="text-xl font-semibold mt-6 mb-3">1. Information We Collect</h2>
        <p>We collect your email address, username, and YouTube OAuth tokens when you connect your YouTube account. We also store campaign data (likes, subscribes, comments) you perform through our platform.</p>
        
        <h2 className="text-xl font-semibold mt-6 mb-3">2. How We Use Your Information</h2>
        <p>We use your information to provide the Sociout service: to run campaigns, track progress, and communicate with you about your account. We do not sell your personal data.</p>
        
        <h2 className="text-xl font-semibold mt-6 mb-3">3. Sharing Your Information</h2>
        <p>We share your data only with YouTube/Google APIs as necessary to perform actions you request (likes, subscribes, comments). We do not share with other third parties.</p>
        
        <h2 className="text-xl font-semibold mt-6 mb-3">4. Data Retention</h2>
        <p>We retain your data as long as you have an active account. You may request deletion by contacting support.</p>
        
        <h2 className="text-xl font-semibold mt-6 mb-3">5. Security</h2>
        <p>We use industry-standard encryption and OAuth tokens to protect your data.</p>
        
        <h2 className="text-xl font-semibold mt-6 mb-3">6. Contact</h2>
        <p>If you have questions, contact us at <a href="mailto:support@sociout.com" className="text-blue-600">support@sociout.com</a>.</p>
      </div>
    </div>
  );
}

export default PrivacyPolicy;