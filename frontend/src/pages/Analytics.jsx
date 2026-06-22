import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Eye, ThumbsUp, Users, Clock, AlertCircle } from 'lucide-react';

const API_BASE = 'https://sociout-backend.onrender.com/api';

function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchAnalytics();
  }, []);
const fetchAnalytics = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('No authentication token found. Please log in again.');
      setLoading(false);
      return;
    }

    const response = await fetch(`${API_BASE}/analytics/channel`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      if (response.status === 403) throw new Error('YouTube Analytics API not enabled or missing scope. Please reconnect YouTube.');
      if (response.status === 404) throw new Error('No YouTube channel found');
      const errText = await response.text();
      throw new Error(errText || 'Failed to fetch analytics');
    }
    const result = await response.json();
    setData(result);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

  // Helper to safely extract rows and column headers
  const rows = data?.rows || [];
  const columnHeaders = data?.columnHeaders || [];
  const metrics = columnHeaders.map(h => h.name);

  // Build chart data safely
  const chartData = rows.map(row => {
    const entry = { day: row[0] };
    for (let i = 1; i < row.length && i < metrics.length; i++) {
      entry[metrics[i]] = row[i];
    }
    return entry;
  });

  // Calculate totals
  const totals = rows.reduce((acc, row) => {
    // Map positions: typically row[1]=views, row[2]=likes, row[3]=subscribersGained, row[4]=estimatedMinutesWatched
    acc.views = (acc.views || 0) + (row[1] || 0);
    acc.likes = (acc.likes || 0) + (row[2] || 0);
    acc.subscribersGained = (acc.subscribersGained || 0) + (row[3] || 0);
    acc.watchTime = (acc.watchTime || 0) + (row[4] || 0);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-500 dark:text-gray-400">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-700 dark:text-red-300 mb-2">Unable to load analytics</h2>
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 max-w-md text-center">
          <h2 className="text-xl font-semibold text-yellow-700 dark:text-yellow-300 mb-2">No data available</h2>
          <p className="text-yellow-600 dark:text-yellow-400">
            Your channel has no analytics data for the last 28 days.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">YouTube Analytics</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center">
              <Eye className="w-8 h-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Views (28d)</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totals.views?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center">
              <ThumbsUp className="w-8 h-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Likes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totals.likes?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-purple-500 mr-3" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Subscribers gained</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totals.subscribersGained?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-orange-500 mr-3" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Watch time (min)</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.round(totals.watchTime || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Views over time chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8 border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Views over time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
              <XAxis dataKey="day" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip contentStyle={{ backgroundColor: '#fff', color: '#000' }} />
              <Legend />
              <Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Likes & Subscribers gained chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Likes & Subscribers gained</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
              <XAxis dataKey="day" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip contentStyle={{ backgroundColor: '#fff', color: '#000' }} />
              <Legend />
              <Bar dataKey="likes" fill="#10b981" />
              <Bar dataKey="subscribersGained" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default Analytics;