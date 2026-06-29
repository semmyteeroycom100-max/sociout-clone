import React from 'react';
import { X, BookOpen, Sparkles, ArrowRight } from 'lucide-react';

const WelcomeModal = ({ onClose, onExplore }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full relative overflow-hidden">
        {/* Decorative gradient bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          aria-label="Close welcome modal"
        >
          <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>

        <div className="p-6 pt-8 text-center">
          {/* Icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Sparkles className="w-10 h-10 text-white" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome to Sociout! 🎉
          </h2>

          {/* Description */}
          <p className="text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
            We've created a complete <strong>Resource Hub</strong> with expert tips, 
            platform guides, and growth strategies to help you succeed.
          </p>

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Start learning now and get the most out of your campaigns.
          </p>

          {/* Feature highlights */}
          <div className="mt-4 grid grid-cols-2 gap-2 text-left">
            <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
              <BookOpen className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <span>Step‑by‑step guides</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
              <span>Daily growth tips</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400 col-span-2">
              <ArrowRight className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span>Track your progress and earn badges</span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={onExplore}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium transition shadow-lg flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              Explore the Hub
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition"
            >
              Later
            </button>
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
            You can always access the Resource Hub from the sidebar.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;