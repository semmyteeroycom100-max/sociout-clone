import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, FileText, MessageSquare, Shield, Database, 
  Plus, Edit, Trash2, Search, ChevronDown, ChevronUp, 
  Eye, CheckCircle, XCircle, AlertCircle, X
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
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Load stats
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

      // Load campaigns
      const campaignsRes = await fetch(`${API_BASE}/admin/all-campaigns`, { headers });
      if (campaignsRes.ok) {
        const campaignsData = await campaignsRes.json();
        setCampaigns(campaignsData);
      }

      // Load users
      if (activeTab === 'users' || activeTab === 'overview') {
        const usersRes = await fetch(`${API_BASE}/admin/users`, { headers });
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData);
        }
      }

      // Load articles
      if (activeTab === 'articles') {
        const articlesRes = await fetch(`${API_BASE}/articles/`, { headers });
        if (articlesRes.ok) {
          const articlesData = await articlesRes.json();
          setArticles(articlesData);
        }
      }

      // Load feedback
      if (activeTab === 'feedback') {
        const feedbackRes = await fetch(`${API_BASE}/feedback/`, { headers });
        if (feedbackRes.ok) {
          const feedbackData = await feedbackRes.json();
          setFeedbackList(feedbackData);
        }
      }

      // Load audit
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

  const handleToggleAdmin = async (userId, currentAdmin) => {
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
    { id: 'pool', label: 'Pool', icon: Database, external: true, path: '/admin/pool' },
  ];

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

        {/* Campaigns Table */}
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
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        camp.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
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
                      onClick={() => handleToggleAdmin(user.id, user.is_admin)}
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
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      article.status === 'published' 
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
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      fb.type === 'bug' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
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

  // ---- Main render ----
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
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Slug (URL-friendly)</label>
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