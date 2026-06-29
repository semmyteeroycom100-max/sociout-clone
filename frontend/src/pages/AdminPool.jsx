import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

const API_BASE = 'https://sociout-backend.onrender.com/api';

function AdminPool() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    access_token: '',
    refresh_token: '',
    token_expiry: ''
  });
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
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/admin/pool/accounts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setAccounts(data);
    } catch (err) {
      addToast('Failed to load accounts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/admin/pool/accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        addToast('Account added successfully', 'success');
        setShowAddModal(false);
        setFormData({ email: '', access_token: '', refresh_token: '', token_expiry: '' });
        fetchAccounts();
      } else {
        addToast('Failed to add account', 'error');
      }
    } catch (err) {
      addToast('Error adding account', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this account?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/admin/pool/accounts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        addToast('Account deleted', 'success');
        fetchAccounts();
      } else {
        addToast('Failed to delete account', 'error');
      }
    } catch (err) {
      addToast('Error deleting account', 'error');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">YouTube Account Pool</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            + Add Account
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Subscribes (today)</th>
                <th className="p-3 text-left">Likes (today)</th>
                <th className="p-3 text-left">Comments (today)</th>
                <th className="p-3 text-left">Last Used</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map(account => (
                <tr key={account.id} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="p-3">{account.email}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      account.status === 'active' ? 'bg-green-100 text-green-800' :
                      account.status === 'suspended' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {account.status}
                    </span>
                  </td>
                  <td className="p-3">{account.daily_subscribe_count}/75</td>
                  <td className="p-3">{account.daily_like_count}/200</td>
                  <td className="p-3">{account.daily_comment_count}/100</td>
                  <td className="p-3">{account.last_used_at ? new Date(account.last_used_at).toLocaleString() : 'Never'}</td>
                  <td className="p-3">
                    <button onClick={() => handleDelete(account.id)} className="text-red-500 hover:text-red-700 transition">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Add YouTube Account</h2>
            <form onSubmit={handleAddAccount}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  className="w-full p-2 border rounded dark:bg-gray-700"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Access Token</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded dark:bg-gray-700"
                  value={formData.access_token}
                  onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Refresh Token</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded dark:bg-gray-700"
                  value={formData.refresh_token}
                  onChange={(e) => setFormData({ ...formData, refresh_token: e.target.value })}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Token Expiry</label>
                <input
                  type="datetime-local"
                  className="w-full p-2 border rounded dark:bg-gray-700"
                  value={formData.token_expiry}
                  onChange={(e) => setFormData({ ...formData, token_expiry: e.target.value })}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border rounded hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
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