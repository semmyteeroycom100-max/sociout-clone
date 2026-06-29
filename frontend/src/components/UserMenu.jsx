import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Trash2, Settings, Sun, Moon, Shield } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

const API_BASE = 'https://sociout-backend.onrender.com/api';

function UserMenu({ user }) {
  const [isOpen, setIsOpen] = useState(false);
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
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:opacity-80 transition"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
          {user?.username?.charAt(0).toUpperCase() || 'U'}
        </div>
        <span className="text-sm text-gray-700 dark:text-gray-300 hidden md:inline">
          {user?.username}
        </span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 py-1">
            <button
              onClick={() => { setIsOpen(false); navigate('/profile'); }}
              className="flex items-center gap-3 px-4 py-2 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              <User className="w-4 h-4" />
              <span>My Profile</span>
            </button>
            <button
              onClick={() => { setIsOpen(false); navigate('/settings'); }}
              className="flex items-center gap-3 px-4 py-2 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
            {/* Admin Panel link – only visible if user is admin */}
            {user?.is_admin && (
              <button
                onClick={() => { setIsOpen(false); navigate('/admin'); }}
                className="flex items-center gap-3 px-4 py-2 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition text-blue-600 dark:text-blue-400"
              >
                <Shield className="w-4 h-4" />
                <span>Admin Panel</span>
              </button>
            )}
            <button
              onClick={() => { setIsOpen(false); toggleDarkMode(); }}
              className="flex items-center gap-3 px-4 py-2 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
            <hr className="my-1 border-gray-200 dark:border-gray-700" />
            <button
              onClick={() => { setIsOpen(false); handleLogout(); }}
              className="flex items-center gap-3 px-4 py-2 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition text-red-500"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
            <button
              onClick={() => { setIsOpen(false); handleDeleteAccount(); }}
              className="flex items-center gap-3 px-4 py-2 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition text-red-600"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Account</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default UserMenu;