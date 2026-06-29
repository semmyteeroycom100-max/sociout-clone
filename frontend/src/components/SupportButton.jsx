import React, { useState } from 'react';
import { Heart, X, Coffee, Crown, Star, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const API_BASE = 'https://sociout-backend.onrender.com/api';

const SupportButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [tier, setTier] = useState('supporter');
  const [amount, setAmount] = useState(500);
  const [isRecurring, setIsRecurring] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { addToast } = useToast();

  const tiers = [
    { id: 'supporter', label: 'Supporter', icon: Coffee, amount: 500, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { id: 'patron', label: 'Patron', icon: Star, amount: 1500, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { id: 'benefactor', label: 'Benefactor', icon: Crown, amount: 5000, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
  ];

  const handleSupport = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        addToast('Please log in to support Sociout.', 'warning');
        setIsLoading(false);
        return;
      }

      const finalAmount = customAmount ? parseInt(customAmount) * 100 : amount;
      if (isNaN(finalAmount) || finalAmount < 100) {
        addToast('Please enter a valid amount (minimum $1).', 'warning');
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE}/support/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: finalAmount,
          tier: tier,
          recurring: isRecurring,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to Stripe Checkout
        window.location.href = data.checkout_url;
      } else {
        const error = await response.json();
        addToast(error.detail || 'Failed to create support session.', 'error');
      }
    } catch (err) {
      addToast('Network error. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTierSelect = (tierId, tierAmount) => {
    setTier(tierId);
    setAmount(tierAmount);
    setCustomAmount('');
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 z-50 p-4 bg-pink-600 hover:bg-pink-700 text-white rounded-full shadow-lg transition-all hover:scale-110 flex items-center justify-center"
        aria-label="Support Sociout"
      >
        <Heart className="w-6 h-6" />
      </button>

      {/* Support Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                Support Sociout
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your support keeps the platform running and helps us build new features. ❤️
              </p>

              {/* Tier Selection */}
              <div className="grid grid-cols-3 gap-2">
                {tiers.map((t) => {
                  const Icon = t.icon;
                  const isSelected = tier === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleTierSelect(t.id, t.amount)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition ${
                        isSelected
                          ? `border-pink-500 ${t.bg}`
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${t.color}`} />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{t.label}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">${t.amount / 100}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Amount */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">Custom:</span>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Amount"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      setAmount(parseInt(e.target.value) * 100 || 0);
                    }}
                    className="w-full pl-7 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>

              {/* Recurring Toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={isRecurring}
                  onChange={() => setIsRecurring(!isRecurring)}
                  className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
                />
                <label htmlFor="recurring" className="text-sm text-gray-700 dark:text-gray-300">
                  Make this monthly (recurring support)
                </label>
              </div>

              {/* Total */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  ${(customAmount ? parseFloat(customAmount) : amount / 100).toFixed(2)}
                  {isRecurring && <span className="text-sm font-normal text-gray-500"> / month</span>}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSupport}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Heart className="w-4 h-4" />
                      Contribute
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SupportButton;