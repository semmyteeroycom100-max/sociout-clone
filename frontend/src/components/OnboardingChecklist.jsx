import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, ArrowRight } from 'lucide-react';

function OnboardingChecklist({ youtubeConnected, tiktokConnected, campaigns }) {
  const [dismissed, setDismissed] = useState(false);

  const steps = [
    { id: 'connect_youtube', label: 'Connect YouTube account', done: youtubeConnected },
    { id: 'connect_tiktok', label: 'Connect TikTok (Coming Soon)', done: tiktokConnected || false, comingSoon: true },
    { id: 'create_campaign', label: 'Create your first campaign', done: campaigns.length > 0 },
    { id: 'run_campaign', label: 'Run your first campaign', done: campaigns.some(c => c.status === 'completed' || c.status === 'running') },
  ];

  const allDone = steps.every(s => s.done);

  useEffect(() => {
    if (allDone) {
      const timer = setTimeout(() => setDismissed(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [allDone]);

  if (dismissed || allDone) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-6 border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">🚀 Get Started</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Complete these steps to unlock all features</p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm"
        >
          Dismiss
        </button>
      </div>
      <div className="mt-4 space-y-2">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center gap-3">
            {step.done ? (
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
            )}
            <span className={`text-sm ${step.done ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-300'} ${step.comingSoon ? 'opacity-50' : ''}`}>
              {step.label} {step.comingSoon && <span className="text-xs text-blue-500">(Coming Soon)</span>}
            </span>
            {!step.done && !step.comingSoon && (
              <ArrowRight className="w-4 h-4 text-blue-500 ml-auto flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all"
          style={{ width: `${(steps.filter(s => s.done).length / steps.length) * 100}%` }}
        />
      </div>
    </div>
  );
}

export default OnboardingChecklist;