import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const API_BASE = 'https://sociout-backend.onrender.com/api';

function AdminPool() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newAccount, setNewAccount] = useState({ email: '', channel_id: '', proxy: '' });
  const [showAdd, setShowAdd] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // ✅ CORRECT ENDPOINT: /api/admin/pool/ (not /accounts)
      const response = await fetch(`${API_BASE}/admin/pool/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch accounts: ${response.status}`);
      }
      const data = await response.json();
      // ✅ Ensure data is an array
      if (Array.isArray(data)) {
        setAccounts(data);
      } else {
        console.warn('Response is not an array:', data);
        setAccounts([]);
      }
    } catch (err) {
      console.error('Error fetching pool accounts:', err);
      addToast('Failed to load accounts', 'error');
      setAccounts([]); // prevent .map crash
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE}/admin/pool/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newAccount)
      });
      if (response.ok) {
        addToast('Account added successfully', 'success');
        setShowAdd(false);
        setNewAccount({ email: '', channel_id: '', proxy: '' });
        fetchAccounts();
      } else {
        const error = await response.json();
        addToast(error.detail || 'Failed to add account', 'error');
      }
    } catch (err) {
      addToast('Error adding account', 'error');
    }
  };

  const handleDeleteAccount = async (accountId) => {
    if (!confirm('Are you sure you want to delete this account?')) return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE}/admin/pool/${accountId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        addToast('Account deleted', 'success');
        fetchAccounts();
      } else {
        addToast('Failed to delete account', 'error');
      }
    } catch (err) {
      addToast('Error deleting account', 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Admin Pool</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchAccounts}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" /> Add Account
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      )}

      {/* Empty state */}
      {!loading && accounts.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center shadow border border-gray-200 dark:border-gray-700">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">No pool accounts yet.</p>
          <p className="text-sm text-gray-400">Add your first account to start sharing.</p>
        </div>
      )}

      {/* Table */}
      {!loading && accounts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="p-3 text-left text-gray-700 dark:text-gray-300">Email</th>
                <th className="p-3 text-left text-gray-700 dark:text-gray-300">Channel ID</th>
                <th className="p-3 text-left text-gray-700 dark:text-gray-300">Proxy</th>
                <th className="p-3 text-left text-gray-700 dark:text-gray-300">Status</th>
                <th className="p-3 text-left text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc) => (
                <tr key={acc.id} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="p-3 dark:text-gray-300">{acc.email}</td>
                  <td className="p-3 dark:text-gray-300">{acc.channel_id || '-'}</td>
                  <td className="p-3 dark:text-gray-300">{acc.proxy || '-'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      acc.status === 'active'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                    }`}>
                      {acc.status || 'inactive'}
                    </span>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => handleDeleteAccount(acc.id)}
                      className="p-1 text-red-500 hover:text-red-700 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold dark:text-white mb-4">Add Pool Account</h2>
            <form onSubmit={handleAddAccount}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Email</label>
                <input
                  type="email"
                  required
                  className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={newAccount.email}
                  onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Channel ID (optional)</label>
                <input
                  type="text"
                  className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={newAccount.channel_id}
                  onChange={(e) => setNewAccount({ ...newAccount, channel_id: e.target.value })}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Proxy (optional)</label>
                <input
                  type="text"
                  className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={newAccount.proxy}
                  onChange={(e) => setNewAccount({ ...newAccount, proxy: e.target.value })}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  Add Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPool;