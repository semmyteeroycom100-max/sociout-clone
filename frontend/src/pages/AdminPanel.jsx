import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, MessageSquare, Shield, Database,
  Plus, Edit, Trash2, Search, ChevronDown, ChevronUp,
  Eye, CheckCircle, XCircle, AlertCircle, X, Key, Wallet, Server
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import ArticleEditor from '../components/ArticleEditor';

const API_BASE = 'https://sociout-backend.onrender.com/api';

function AdminPanel() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [articles, setArticles] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [articleForm, setArticleForm] = useState({ title: '', slug: '', content: '', module: 'platform', order: 0, status: 'draft' });

  // ----- Bulk actions state -----
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectAllUsers, setSelectAllUsers] = useState(false);

  // ----- 2FA state -----
  const [twofaSecret, setTwofaSecret] = useState('');
  const [twofaQR, setTwofaQR] = useState('');
  const [twofaCode, setTwofaCode] = useState('');
  const [twofaEnabled, setTwofaEnabled] = useState(false);
  const [twofaSetupStep, setTwofaSetupStep] = useState('idle');

  // ----- Wallet state -----
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [walletAmount, setWalletAmount] = useState('');
  const [walletReason, setWalletReason] = useState('');

  const { addToast } = useToast();
  const navigate = useNavigate();

  // ----- Bulk action functions -----
  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleSelectAllUsers = () => {
    if (selectAllUsers) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u.id));
    }
    setSelectAllUsers(!selectAllUsers);
  };

  const handleBulkDeleteUsers = async () => {
    if (!selectedUsers.length) return;
    if (!confirm(`Delete ${selectedUsers.length} user(s)? This action is permanent.`)) return;
    const token = localStorage.getItem('token');
    const promises = selectedUsers.map(id =>
      fetch(`${API_BASE}/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    try {
      await Promise.all(promises);
      addToast(`${selectedUsers.length} user(s) deleted.`, 'success');
      setSelectedUsers([]);
      setSelectAllUsers(false);
      loadData();
    } catch (err) {
      addToast('Error deleting users', 'error');
    }
  };

  const handleBulkPromoteUsers = async () => {
    if (!selectedUsers.length) return;
    if (!confirm(`Promote ${selectedUsers.length} user(s) to admin?`)) return;
    const token = localStorage.getItem('token');
    const promises = selectedUsers.map(id =>
      fetch(`${API_BASE}/admin/users/${id}/role`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    try {
      await Promise.all(promises);
      addToast(`${selectedUsers.length} user(s) promoted.`, 'success');
      setSelectedUsers([]);
      setSelectAllUsers(false);
      loadData();
    } catch (err) {
      addToast('Error promoting users', 'error');
    }
  };

  const handleBulkDemoteUsers = async () => {
    if (!selectedUsers.length) return;
    if (!confirm(`Demote ${selectedUsers.length} user(s) from admin?`)) return;
    const token = localStorage.getItem('token');
    const promises = selectedUsers.map(id =>
      fetch(`${API_BASE}/admin/users/${id}/role`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    try {
      await Promise.all(promises);
      addToast(`${selectedUsers.length} user(s) demoted.`, 'success');
      setSelectedUsers([]);
      setSelectAllUsers(false);
      loadData();
    } catch (err) {
      addToast('Error demoting users', 'error');
    }
  };

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    loadData();
    checkTwoFAStatus();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const statsRes = await fetch(`${API_BASE}/admin/stats`, { headers });
      if (statsRes.status === 403) {
        addToast('Admin access required', 'error');
        navigate('/dashboard');
        return;
      }
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      const campaignsRes = await fetch(`${API_BASE}/admin/all-campaigns`, { headers });
      if (campaignsRes.ok) {
        const campaignsData = await campaignsRes.json();
        setCampaigns(campaignsData);
      }

      // Load users for Users, Overview, and Wallet tabs
      if (activeTab === 'users' || activeTab === 'overview' || activeTab === 'wallet') {
        const usersRes = await fetch(`${API_BASE}/admin/users`, { headers });
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData);
          // Reset selection if users list changes
          setSelectedUsers([]);
          setSelectAllUsers(false);
        }
      }

      if (activeTab === 'articles') {
        const articlesRes = await fetch(`${API_BASE}/articles/`, { headers });
        if (articlesRes.ok) {
          const articlesData = await articlesRes.json();
          setArticles(articlesData);
        }
      }

      if (activeTab === 'feedback') {
        const feedbackRes = await fetch(`${API_BASE}/feedback/`, { headers });
        if (feedbackRes.ok) {
          const feedbackData = await feedbackRes.json();
          setFeedbackList(feedbackData);
        }
      }

      if (activeTab === 'audit') {
        const auditRes = await fetch(`${API_BASE}/admin/audit/`, { headers });
        if (auditRes.ok) {
          const auditData = await auditRes.json();
          setAuditLog(auditData);
        }
      }

    } catch (err) {
      console.error('Error loading admin data:', err);
      addToast('Error loading admin data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ----- 2FA functions -----
  const checkTwoFAStatus = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTwofaEnabled(data.twofa_enabled || false);
        if (data.twofa_enabled) {
          setTwofaSetupStep('idle');
        }
      }
    } catch (e) {
      console.warn('Could not fetch 2FA status');
    }
  };

  const handleSetupTwoFA = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/admin/security/2fa/setup`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTwofaSecret(data.secret);
        setTwofaQR(data.qr_code);
        setTwofaSetupStep('verify');
        addToast('Scan the QR code with Google Authenticator', 'success');
      } else {
        addToast('Failed to setup 2FA', 'error');
      }
    } catch (e) {
      addToast('Error setting up 2FA', 'error');
    }
  };

  const handleVerifyTwoFA = async () => {
    if (!twofaCode || twofaCode.length !== 6) {
      addToast('Please enter a valid 6-digit code', 'warning');
      return;
    }
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/admin/security/2fa/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ token: twofaCode })
      });
      if (res.ok) {
        addToast('2FA enabled successfully!', 'success');
        setTwofaEnabled(true);
        setTwofaSetupStep('idle');
        setTwofaCode('');
        setTwofaQR('');
        setTwofaSecret('');
      } else {
        addToast('Invalid code, please try again', 'error');
      }
    } catch (e) {
      addToast('Error verifying 2FA', 'error');
    }
  };

  const handleDisableTwoFA = async () => {
    if (!confirm('Are you sure you want to disable 2FA? This reduces your account security.')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/admin/security/2fa/disable`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        addToast('2FA disabled', 'success');
        setTwofaEnabled(false);
        setTwofaSetupStep('idle');
      } else {
        addToast('Failed to disable 2FA', 'error');
      }
    } catch (e) {
      addToast('Error disabling 2FA', 'error');
    }
  };

  // ----- Wallet functions -----
  const handleAdjustWallet = async () => {
    const amount = parseInt(walletAmount);
    if (isNaN(amount) || amount === 0) {
      addToast('Please enter a valid non‑zero amount', 'warning');
      return;
    }
    if (!walletReason.trim()) {
      addToast('Please enter a reason for the adjustment', 'warning');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/admin/wallet/${selectedUser.id}/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount, reason: walletReason.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        addToast(`Balance updated to ${data.new_balance} credits`, 'success');
        setShowWalletModal(false);
        setSelectedUser(null);
        setWalletAmount('');
        setWalletReason('');
        loadData(); // refresh user list
      } else {
        const err = await res.json();
        addToast(err.detail || 'Failed to adjust wallet', 'error');
      }
    } catch (err) {
      addToast('Network error', 'error');
    }
  };

  // ---- Article CRUD ----
  const handleSaveArticle = async () => {
    const token = localStorage.getItem('token');
    const method = editingArticle ? 'PUT' : 'POST';
    const url = editingArticle
      ? `${API_BASE}/articles/${editingArticle.id}`
      : `${API_BASE}/articles/`;

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(articleForm),
      });
      if (res.ok) {
        addToast(`Article ${editingArticle ? 'updated' : 'created'} successfully`, 'success');
        setShowArticleModal(false);
        setEditingArticle(null);
        setArticleForm({ title: '', slug: '', content: '', module: 'platform', order: 0, status: 'draft' });
        loadData();
      } else {
        const err = await res.json();
        addToast(err.detail || 'Failed to save article', 'error');
      }
    } catch (err) {
      addToast('Network error', 'error');
    }
  };

  const handleDeleteArticle = async (id) => {
    if (!confirm('Are you sure you want to delete this article?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/articles/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        addToast('Article deleted', 'success');
        loadData();
      } else {
        addToast('Failed to delete article', 'error');
      }
    } catch (err) {
      addToast('Network error', 'error');
    }
  };

  const handleEditArticle = (article) => {
    setEditingArticle(article);
    setArticleForm({
      title: article.title,
      slug: article.slug,
      content: article.content,
      module: article.module,
      order: article.order,
      status: article.status,
    });
    setShowArticleModal(true);
  };

  const handleToggleAdmin = async (userId) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        addToast(`User admin status toggled`, 'success');
        loadData();
      } else {
        const err = await res.json();
        addToast(err.detail || 'Failed to toggle role', 'error');
      }
    } catch (err) {
      addToast('Network error', 'error');
    }
  };

  const handleUpdateFeedbackStatus = async (feedbackId, status) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/feedback/${feedbackId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        addToast('Feedback status updated', 'success');
        loadData();
      } else {
        addToast('Failed to update feedback', 'error');
      }
    } catch (err) {
      addToast('Network error', 'error');
    }
  };

  // ---- Navigation tabs ----
  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'articles', label: 'Articles', icon: FileText },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare },
    { id: 'audit', label: 'Audit', icon: Shield },
    { id: 'security', label: 'Security', icon: Key },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'system', label: 'System', icon: Server },
    { id: 'pool', label: 'Pool', icon: Database, external: true, path: '/admin/pool' },
  ];

  // ----- Render functions -----
  const renderOverview = () => {
    const completedCampaigns = campaigns.filter(c => c.status === 'completed').length;
    const failedCampaigns = campaigns.filter(c => c.status === 'failed').length;
    const runningCampaigns = campaigns.filter(c => c.status === 'running').length;
    const totalActions = campaigns.reduce((sum, c) => sum + (c.completed_count || 0), 0);

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm">Total Users</h3>
            <p className="text-2xl font-bold dark:text-white">{stats?.total_users || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm">Total Campaigns</h3>
            <p className="text-2xl font-bold dark:text-white">{stats?.total_campaigns || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm">Completed</h3>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{completedCampaigns}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm">Running</h3>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{runningCampaigns}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm">Failed</h3>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{failedCampaigns}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm">Total Actions</h3>
            <p className="text-2xl font-bold dark:text-white">{totalActions}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4 dark:text-white">Recent Campaigns</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="p-2 text-left dark:text-white">Name</th>
                  <th className="p-2 text-left dark:text-white">User</th>
                  <th className="p-2 text-left dark:text-white">Action</th>
                  <th className="p-2 text-left dark:text-white">Status</th>
                  <th className="p-2 text-left dark:text-white">Progress</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.slice(0, 10).map(camp => (
                  <tr key={camp.id} className="border-t dark:border-gray-700">
                    <td className="p-2 dark:text-gray-300">{camp.name}</td>
                    <td className="p-2 dark:text-gray-300">{camp.user_id}</td>
                    <td className="p-2 dark:text-gray-300">{camp.action_type}</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${camp.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                        camp.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                          camp.status === 'running' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                        {camp.status}
                      </span>
                    </td>
                    <td className="p-2 dark:text-gray-300">{camp.completed_count}/{camp.target_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  const renderUsers = () => {
    const filteredUsers = users.filter(u =>
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Update select all state when filtered list changes
    useEffect(() => {
      if (filteredUsers.length && selectedUsers.length === filteredUsers.length) {
        setSelectAllUsers(true);
      } else {
        setSelectAllUsers(false);
      }
    }, [filteredUsers, selectedUsers]);

    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold dark:text-white">Users</h2>
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        {selectedUsers.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {selectedUsers.length} selected
            </span>
            <button
              onClick={handleBulkDeleteUsers}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition"
            >
              Delete
            </button>
            <button
              onClick={handleBulkPromoteUsers}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
            >
              Promote to Admin
            </button>
            <button
              onClick={handleBulkDemoteUsers}
              className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition"
            >
              Demote
            </button>
            <button
              onClick={() => { setSelectedUsers([]); setSelectAllUsers(false); }}
              className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-white text-sm rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition"
            >
              Clear
            </button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="p-2 text-left">
                  <input
                    type="checkbox"
                    checked={selectAllUsers}
                    onChange={toggleSelectAllUsers}
                    disabled={filteredUsers.length === 0}
                  />
                </th>
                <th className="p-2 text-left dark:text-white">ID</th>
                <th className="p-2 text-left dark:text-white">Email</th>
                <th className="p-2 text-left dark:text-white">Username</th>
                <th className="p-2 text-left dark:text-white">Admin</th>
                <th className="p-2 text-left dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id} className="border-t dark:border-gray-700">
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => toggleUserSelection(user.id)}
                    />
                  </td>
                  <td className="p-2 dark:text-gray-300">{user.id}</td>
                  <td className="p-2 dark:text-gray-300">{user.email}</td>
                  <td className="p-2 dark:text-gray-300">{user.username}</td>
                  <td className="p-2">
                    {user.is_admin ? (
                      <span className="text-green-600 dark:text-green-400">✅</span>
                    ) : (
                      <span className="text-gray-400">⬜</span>
                    )}
                  </td>
                  <td className="p-2">
                    <button
                      onClick={() => handleToggleAdmin(user.id)}
                      className="text-sm px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                    >
                      {user.is_admin ? 'Demote' : 'Promote'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderArticles = () => {
    const filteredArticles = articles.filter(a =>
      a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.module?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold dark:text-white">Articles</h2>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-1 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => {
                setEditingArticle(null);
                setArticleForm({ title: '', slug: '', content: '', module: 'platform', order: 0, status: 'draft' });
                setShowArticleModal(true);
              }}
              className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" /> New
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="p-2 text-left dark:text-white">Title</th>
                <th className="p-2 text-left dark:text-white">Module</th>
                <th className="p-2 text-left dark:text-white">Status</th>
                <th className="p-2 text-left dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredArticles.map(article => (
                <tr key={article.id} className="border-t dark:border-gray-700">
                  <td className="p-2 dark:text-gray-300">{article.title}</td>
                  <td className="p-2 dark:text-gray-300">{article.module}</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${article.status === 'published'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                      }`}>
                      {article.status}
                    </span>
                  </td>
                  <td className="p-2 flex gap-2">
                    <button
                      onClick={() => handleEditArticle(article)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                    >
                      <Edit className="w-4 h-4 text-blue-500" />
                    </button>
                    <button
                      onClick={() => handleDeleteArticle(article.id)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderFeedback = () => {
    const statusColors = {
      new: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      resolved: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      closed: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    };

    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4 dark:text-white">Feedback</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="p-2 text-left dark:text-white">User</th>
                <th className="p-2 text-left dark:text-white">Type</th>
                <th className="p-2 text-left dark:text-white">Message</th>
                <th className="p-2 text-left dark:text-white">Status</th>
                <th className="p-2 text-left dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {feedbackList.map(fb => (
                <tr key={fb.id} className="border-t dark:border-gray-700">
                  <td className="p-2 dark:text-gray-300">{fb.user_id || 'Anonymous'}</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${fb.type === 'bug' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                      fb.type === 'feature' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                        fb.type === 'praise' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300' :
                          'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      }`}>
                      {fb.type}
                    </span>
                  </td>
                  <td className="p-2 dark:text-gray-300 max-w-xs truncate">{fb.message}</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${statusColors[fb.status] || 'bg-gray-100'}`}>
                      {fb.status}
                    </span>
                  </td>
                  <td className="p-2">
                    <select
                      value={fb.status}
                      onChange={(e) => handleUpdateFeedbackStatus(fb.id, e.target.value)}
                      className="text-xs px-2 py-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="new">New</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderAudit = () => {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4 dark:text-white">Audit Log</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="p-2 text-left dark:text-white">Admin</th>
                <th className="p-2 text-left dark:text-white">Action</th>
                <th className="p-2 text-left dark:text-white">Target</th>
                <th className="p-2 text-left dark:text-white">Details</th>
                <th className="p-2 text-left dark:text-white">Time</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.map(log => (
                <tr key={log.id} className="border-t dark:border-gray-700">
                  <td className="p-2 dark:text-gray-300">{log.admin_username}</td>
                  <td className="p-2 dark:text-gray-300">{log.action_type}</td>
                  <td className="p-2 dark:text-gray-300">{log.target_type} #{log.target_id}</td>
                  <td className="p-2 dark:text-gray-300 text-xs">
                    {log.details ? JSON.stringify(log.details) : '-'}
                  </td>
                  <td className="p-2 dark:text-gray-300 text-xs">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ----- Security tab -----
  const renderSecurity = () => {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow max-w-2xl">
        <h2 className="text-xl font-bold mb-4 dark:text-white">Security Settings</h2>

        {twofaEnabled ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">2FA is enabled</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Your account is protected with two‑factor authentication.</p>
              </div>
            </div>
            <button
              onClick={handleDisableTwoFA}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Disable 2FA
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {twofaSetupStep === 'idle' && (
              <div>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Two‑factor authentication adds an extra layer of security to your account.
                  Once enabled, you'll need to enter a code from your authenticator app when logging in.
                </p>
                <button
                  onClick={handleSetupTwoFA}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Enable 2FA
                </button>
              </div>
            )}

            {twofaSetupStep === 'verify' && (
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">
                  1. Scan the QR code with Google Authenticator (or any TOTP app).<br />
                  2. Enter the 6‑digit code from the app to verify.
                </p>
                <div className="flex justify-center">
                  {twofaQR && (
                    <img
                      src={`data:image/png;base64,${twofaQR}`}
                      alt="2FA QR Code"
                      className="border rounded-lg p-2 bg-white"
                      style={{ width: '200px', height: '200px' }}
                    />
                  )}
                </div>
                <div className="flex gap-3 items-center">
                  <input
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={twofaCode}
                    onChange={(e) => setTwofaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-32 text-center"
                  />
                  <button
                    onClick={handleVerifyTwoFA}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    Verify
                  </button>
                  <button
                    onClick={() => {
                      setTwofaSetupStep('idle');
                      setTwofaQR('');
                      setTwofaSecret('');
                      setTwofaCode('');
                    }}
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-white rounded-lg hover:bg-gray-400 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ----- Wallet tab -----
  const renderWallet = () => {
    const filteredUsers = users.filter(u =>
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold dark:text-white">Wallet Management</h2>
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="p-2 text-left dark:text-white">User</th>
                <th className="p-2 text-left dark:text-white">Email</th>
                <th className="p-2 text-left dark:text-white">Balance</th>
                <th className="p-2 text-left dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id} className="border-t dark:border-gray-700">
                  <td className="p-2 dark:text-gray-300">{user.username}</td>
                  <td className="p-2 dark:text-gray-300">{user.email}</td>
                  <td className="p-2 dark:text-gray-300 font-mono">{user.wallet_balance || 0}</td>
                  <td className="p-2">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setWalletAmount('');
                        setWalletReason('');
                        setShowWalletModal(true);
                      }}
                      className="text-sm px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                    >
                      Adjust
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showWalletModal && selectedUser && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold dark:text-white mb-2">
                Adjust Wallet – {selectedUser.username}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Current balance: <strong>{selectedUser.wallet_balance || 0}</strong>
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Amount</label>
                  <input
                    type="number"
                    value={walletAmount}
                    onChange={(e) => setWalletAmount(e.target.value)}
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., 100 or -50"
                  />
                  <p className="text-xs text-gray-500 mt-1">Positive = credit, negative = debit.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Reason</label>
                  <input
                    type="text"
                    value={walletReason}
                    onChange={(e) => setWalletReason(e.target.value)}
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., Refund, Bonus, Correction"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowWalletModal(false);
                    setSelectedUser(null);
                    setWalletAmount('');
                    setWalletReason('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdjustWallet}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Apply Adjustment
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ----- System tab (placeholder) -----
  const renderSystem = () => {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold dark:text-white">System Status</h2>
        <p className="text-gray-600 dark:text-gray-300">Uptime, database size, and other metrics will appear here.</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">(Coming soon)</p>
      </div>
    );
  };

  // ----- Main render -----
  if (loading) return <div className="p-8 text-center dark:text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Admin Panel
          </h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            if (tab.external) {
              return (
                <a
                  key={tab.id}
                  href={tab.path}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </a>
              );
            }
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  activeTab === tab.id
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'users' && renderUsers()}
          {activeTab === 'articles' && renderArticles()}
          {activeTab === 'feedback' && renderFeedback()}
          {activeTab === 'audit' && renderAudit()}
          {activeTab === 'security' && renderSecurity()}
          {activeTab === 'wallet' && renderWallet()}
          {activeTab === 'system' && renderSystem()}
        </div>
      </div>

      {/* Article Modal */}
      {showArticleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold dark:text-white">
                {editingArticle ? 'Edit Article' : 'New Article'}
              </h2>
              <button
                onClick={() => {
                  setShowArticleModal(false);
                  setEditingArticle(null);
                }}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Title</label>
                <input
                  type="text"
                  value={articleForm.title}
                  onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Article title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Slug</label>
                <input
                  type="text"
                  value={articleForm.slug}
                  onChange={(e) => setArticleForm({ ...articleForm, slug: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="article-url-slug"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Module</label>
                  <select
                    value={articleForm.module}
                    onChange={(e) => setArticleForm({ ...articleForm, module: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="platform">Platform 101</option>
                    <option value="youtube">YouTube Mastery</option>
                    <option value="tiktok">TikTok Strategies</option>
                    <option value="optimization">Campaign Optimization</option>
                    <option value="safety">Safety & Compliance</option>
                    <option value="growth">Growth Tactics</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Order</label>
                  <input
                    type="number"
                    value={articleForm.order}
                    onChange={(e) => setArticleForm({ ...articleForm, order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Status</label>
                <select
                  value={articleForm.status}
                  onChange={(e) => setArticleForm({ ...articleForm, status: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Content</label>
                <ArticleEditor
                  value={articleForm.content}
                  onChange={(html) => setArticleForm({ ...articleForm, content: html })}
                  placeholder="Write your article here..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowArticleModal(false);
                    setEditingArticle(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveArticle}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  {editingArticle ? 'Update' : 'Create'} Article
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;