import React from 'react';
import { Lightbulb } from 'lucide-react';

function Tip({ children, type = 'info' }) {
  const colors = {
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300',
    danger: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
  };

  return (
    <div className={`flex items-start gap-2 p-3 rounded-lg border ${colors[type] || colors.info}`}>
      <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <p className="text-sm">{children}</p>
    </div>
  );
}

export default Tip;