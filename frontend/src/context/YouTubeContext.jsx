import React, { createContext, useContext, useState, useEffect } from 'react';

const YouTubeContext = createContext();

export const useYouTube = () => {
  const context = useContext(YouTubeContext);
  if (!context) {
    throw new Error('useYouTube must be used within a YouTubeProvider');
  }
  return context;
};

const API_BASE = 'https://sociout-backend.onrender.com/api';

export const YouTubeProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStatus = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      setIsConnected(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/auth/youtube/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.connected || false);
        setError(null);
      } else if (response.status === 401) {
        // Token expired – user will need to re-login
        setIsConnected(false);
        setError('Session expired. Please login again.');
      } else {
        setIsConnected(false);
        setError('Failed to check YouTube connection status.');
      }
    } catch (err) {
      setIsConnected(false);
      setError('Network error checking YouTube status.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch status once on mount
  useEffect(() => {
    fetchStatus();
  }, []);

  // Refresh function – can be called after reconnecting
  const refreshStatus = () => {
    fetchStatus();
  };

  return (
    <YouTubeContext.Provider value={{ isConnected, loading, error, refreshStatus }}>
      {children}
    </YouTubeContext.Provider>
  );
};