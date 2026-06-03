import React from 'react';
import Logo from '../components/Logo';

function Logo({ className = "w-8 h-8", variant = "icon" }) {
  if (variant === "full") {
    return (
      <div className="flex items-center gap-2">
        <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="14" fill="url(#gradient)" stroke="white" strokeWidth="2"/>
          <path d="M12 10L22 16L12 22V10Z" fill="white" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
          <defs>
            <linearGradient id="gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3B82F6"/>
              <stop offset="1" stopColor="#8B5CF6"/>
            </linearGradient>
          </defs>
        </svg>
        <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Sociout
        </span>
      </div>
    );
  }
  
  // Icon only (for favicon, small spaces)
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="url(#gradient)" stroke="white" strokeWidth="2"/>
      <path d="M12 10L22 16L12 22V10Z" fill="white" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
      <defs>
        <linearGradient id="gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3B82F6"/>
          <stop offset="1" stopColor="#8B5CF6"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

export default Logo;