import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { toggleSound } from '../utils/sound';
import { Sun, Moon, Volume2, VolumeX, LogOut, Trash2 } from 'lucide-react';

const API_BASE = 'https://sociout-backend.onrender.com/api';

function Settings() {
  const { darkMode, toggleDarkMode } = useTheme();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure? This action is permanent and cannot be undone.')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/users/me`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        localStorage.removeItem('token');
        navigate('/login');
        addToast('Account deleted successfully', 'success');
      } else {
        addToast('Failed to delete account', 'error');
      }
    } catch (err) {
      addToast('Error deleting account', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow divide-y divide-gray-200 dark:divide-gray-700">
          {/* Dark Mode */}
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {darkMode ? <Moon className="w-6 h-6 text-blue-500" /> : <Sun className="w-6 h-6 text-yellow-500" />}
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Dark Mode</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Switch between light and dark theme</p>
              </div>
            </div>
            <button
              onClick={toggleDarkMode}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>

          {/* Sound */}
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Volume2 className="w-6 h-6 text-purple-500" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Sound Effects</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Click sounds for buttons</p>
              </div>
            </div>
            <button
              onClick={() => {
                const enabled = toggleSound();
                addToast(`Sound ${enabled ? 'on' : 'off'}`, 'info');
              }}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
            >
              Toggle Sound
            </button>
          </div>

          {/* Logout */}
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LogOut className="w-6 h-6 text-red-500" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Logout</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Sign out of your account</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div>

          {/* Delete Account */}
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trash2 className="w-6 h-6 text-red-600" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Delete Account</p>
                <p className="text-sm text-red-500 dark:text-red-400">Permanently remove your account and all data</p>
              </div>
            </div>
            <button
              onClick={handleDeleteAccount}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;