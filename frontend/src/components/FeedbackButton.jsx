import React, { useState } from 'react';
import { MessageSquare, X, Bug, Lightbulb, Heart, HelpCircle, Upload } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const API_BASE = 'https://sociout-backend.onrender.com/api';

const FeedbackButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState('general');
  const [message, setMessage] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { addToast } = useToast();

  const feedbackTypes = [
    { id: 'bug', label: 'Bug Report', icon: Bug, color: 'text-red-500' },
    { id: 'feature', label: 'Feature Request', icon: Lightbulb, color: 'text-yellow-500' },
    { id: 'praise', label: 'Praise', icon: Heart, color: 'text-pink-500' },
    { id: 'general', label: 'General', icon: HelpCircle, color: 'text-blue-500' },
  ];

  const handleSubmit = async () => {
    if (!message.trim()) {
      addToast('Please write your feedback message.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        type: type,
        message: message.trim(),
        screenshot_url: screenshot || null,
      };

      const response = await fetch(`${API_BASE}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setIsSubmitted(true);
        addToast('Thank you for your feedback! 🎉', 'success');
        setTimeout(() => {
          setIsOpen(false);
          setIsSubmitted(false);
          setMessage('');
          setScreenshot(null);
          setType('general');
        }, 2000);
      } else {
        const error = await response.json();
        addToast(error.detail || 'Failed to submit feedback.', 'error');
      }
    } catch (err) {
      addToast('Network error. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Convert to base64 for preview (or upload to Cloudinary)
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshot(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all hover:scale-110 flex items-center justify-center"
        aria-label="Send feedback"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Feedback Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Share Your Voice
              </h2>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsSubmitted(false);
                  setMessage('');
                  setScreenshot(null);
                  setType('general');
                }}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {isSubmitted ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Thank You! 🎉</h3>
                <p className="text-gray-600 dark:text-gray-300 mt-2">
                  Your feedback helps us build something great.
                </p>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  We're building this platform for YOU. What's on your mind?
                </p>

                {/* Type Selection */}
                <div className="grid grid-cols-2 gap-2">
                  {feedbackTypes.map((ft) => {
                    const Icon = ft.icon;
                    const isSelected = type === ft.id;
                    return (
                      <button
                        key={ft.id}
                        onClick={() => setType(ft.id)}
                        className={`flex items-center gap-2 p-3 rounded-lg border-2 transition ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${ft.color}`} />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{ft.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Message Input */}
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your feedback in detail..."
                  rows="4"
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {/* Screenshot Upload */}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition text-sm">
                    <Upload className="w-4 h-4" />
                    Attach Screenshot
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  {screenshot && (
                    <span className="text-xs text-green-600 dark:text-green-400">✓ Attached</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setMessage('');
                      setScreenshot(null);
                      setType('general');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !message.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Feedback →'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackButton;