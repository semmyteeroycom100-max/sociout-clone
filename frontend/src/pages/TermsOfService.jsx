import React from 'react';

function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
        <p className="text-gray-600 mb-4">Last updated: {new Date().toLocaleDateString()}</p>
        
        <h2 className="text-xl font-semibold mt-6 mb-3">1. Acceptance of Terms</h2>
        <p>By using Sociout, you agree to these Terms of Service. If you do not agree, you may not use the service.</p>
        
        <h2 className="text-xl font-semibold mt-6 mb-3">2. Description of Service</h2>
        <p>Sociout allows you to automate YouTube actions (likes, subscribes, comments) via the YouTube API using your own Google account.</p>
        
        <h2 className="text-xl font-semibold mt-6 mb-3">3. User Responsibilities</h2>
        <p>You are responsible for your YouTube account and must comply with YouTube's Terms of Service. You may not use Sociout for illegal or abusive activities.</p>
        
        <h2 className="text-xl font-semibold mt-6 mb-3">4. Limitation of Liability</h2>
        <p>Sociout is provided "as is". We are not liable for any damages resulting from your use of the service, including YouTube account restrictions.</p>
        
        <h2 className="text-xl font-semibold mt-6 mb-3">5. Termination</h2>
        <p>We may terminate or suspend your account if you violate these terms.</p>
        
        <h2 className="text-xl font-semibold mt-6 mb-3">6. Changes to Terms</h2>
        <p>We may update these terms from time to time. Continued use constitutes acceptance.</p>
        
        <h2 className="text-xl font-semibold mt-6 mb-3">7. Contact</h2>
        <p>Questions? Contact <a href="mailto:support@sociout.com" className="text-blue-600">support@sociout.com</a>.</p>
      </div>
    </div>
  );
}

export default TermsOfService;