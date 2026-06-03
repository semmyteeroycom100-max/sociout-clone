import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'https://sociout-backend.onrender.com/api';

function Pricing() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch(`${API_BASE}/subscriptions/plans`);
      const data = await response.json();
      setPlans(data);
    } catch (err) {
      console.error('Failed to load plans', err);
    }
  };

  const handleSubscribe = async (planName) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/subscriptions/create-checkout?plan_name=${planName}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (err) {
      alert('Failed to start checkout');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (cents) => {
    if (cents === 0) return 'Free';
    return `$${cents / 100}/month`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-600">Choose the plan that works for you</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map(plan => (
            <div key={plan.name} className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
              <h2 className="text-2xl font-bold capitalize mb-2">{plan.name}</h2>
              <p className="text-4xl font-bold mb-4">{formatPrice(plan.price_monthly)}</p>
              <p className="text-gray-600 mb-6">Up to {plan.actions_limit.toLocaleString()} actions/month</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">✅ YouTube engagement campaigns</li>
                <li className="flex items-center gap-2">✅ Analytics dashboard</li>
                <li className="flex items-center gap-2">✅ CSV export</li>
                {plan.name !== 'free' && <li className="flex items-center gap-2">✅ Priority support</li>}
                {plan.name === 'business' && <li className="flex items-center gap-2">✅ Team workspaces</li>}
                {plan.name === 'business' && <li className="flex items-center gap-2">✅ API access</li>}
              </ul>
              {plan.price_monthly === 0 ? (
                <button className="w-full py-3 border border-gray-300 rounded-lg text-gray-700">Current Plan</button>
              ) : (
                <button
                  onClick={() => handleSubscribe(plan.name)}
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Upgrade'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Pricing;