import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { YouTubeProvider } from './context/YouTubeContext';
import { preloadSound, playClickSound } from './utils/sound';
import './index.css';

// Preload click sound
preloadSound();

// Global click listener for all buttons
document.addEventListener('click', (e) => {
  if (e.target.closest('button, a, [role="button"], .clickable')) {
    playClickSound();
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <YouTubeProvider>
            <App />
          </YouTubeProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);