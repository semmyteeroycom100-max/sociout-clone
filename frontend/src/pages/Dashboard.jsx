import { createCampaign, getCampaigns, startCampaign } from '../services/api';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Video, 
  ThumbsUp, 
  Users, 
  MessageCircle, 
  PlayCircle, 
  PlusCircle,
  LogOut,
  TrendingUp,
  Clock
} from 'lucide-react';

const API_BASE = 'https://sociout-backend.onrender.com/api';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Campaign form state
  const [formData, setFormData] = useState({
    name: '',
    video_url: '',
    action_type: 'LIKE',
    target_count: 10
  });

  // Additional states for new features
  const [scheduledDate, setScheduledDate] = useState('');
  const [commentListText, setCommentListText] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    loadUser();
    loadCampaigns();
    checkYoutubeStatus();
  }, []);

  const loadUser = async () => {
    try {
      const response = await fetch(`${API_BASE}/users/me`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setUser(data);
    } catch (err) {
      localStorage.removeItem('token');
      navigate('/login');
    }
  };

  const loadCampaigns = async () => {
    try {
      const response = await fetch(`${API_BASE}/campaigns`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setCampaigns(data);
    } catch (err) {
      console.error('Failed to load campaigns', err);
    }
  };

  const checkYoutubeStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/youtube/status`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setYoutubeConnected(data.connected);
    } catch (err) {
      console.error('Failed to check YouTube status');
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData };
      if (scheduledDate) {
        payload.scheduled_at = new Date(scheduledDate).toISOString();
      }
      if (formData.action_type === 'COMMENT' && commentListText.trim()) {
        const comments = commentListText.split('\n').filter(c => c.trim().length > 0);
        if (comments.length > 0) {
          payload.comment_list = comments;
        }
      }
      await createCampaign(payload);
      setShowModal(false);
      setFormData({ name: '', video_url: '', action_type: 'LIKE', target_count: 10 });
      setScheduledDate('');
      setCommentListText('');
      loadCampaigns();
    } catch (err) {
      alert('Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleStartCampaign = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/campaigns/${id}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        loadCampaigns();
      } else {
        alert('Failed to start campaign');
      }
    }catch (err) {
  console.error('Full error:', err);
  const errorMessage = err.response?.data?.detail || err.message || 'Unknown error';
  alert('Failed to create campaign: ' + JSON.stringify(errorMessage));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const getActionIcon = (type) => {
    switch(type) {
      case 'LIKE': return <ThumbsUp className="w-4 h-4 text-blue-500" />;
      case 'SUBSCRIBE': return <Users className="w-4 h-4 text-green-500" />;
      case 'COMMENT': return <MessageCircle className="w-4 h-4 text-purple-500" />;
      default: return <Video className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const stats = {
    total: campaigns.length,
    running: campaigns.filter(c => c.status === 'running').length,
    completed: campaigns.filter(c => c.status === 'completed').length,
    totalActions: campaigns.reduce((sum, c) => sum + (c.completed_count || 0), 0)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Sidebar (unchanged) */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-gray-900 to-gray-800 text-white shadow-xl">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-xl font-bold">S</span>
            </div>
            <h1 className="text-xl font-bold">Sociout</h1>
          </div>
          <nav className="space-y-2">
            <a href="#" className="flex items-center gap-3 px-4 py-3 bg-white/10 rounded-lg">
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white/5 rounded-lg transition">
              <Video className="w-5 h-5" />
              <span>Campaigns</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white/5 rounded-lg transition">
              <TrendingUp className="w-5 h-5" />
              <span>Analytics</span>
            </a>
          </nav>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold">{user?.username?.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{user?.username}</p>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
          </div>
          {!youtubeConnected && (
            <a href="https://sociout-backend.onrender.com/api/auth/google" className="flex items-center justify-center gap-2 w-full mb-3 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Connect YouTube
            </a>
          )}
          {youtubeConnected && (
            <div className="mb-3 px-3 py-2 bg-green-500/20 rounded-lg text-center">
              <p className="text-green-400 text-xs">✓ YouTube Connected</p>
            </div>
          )}
          <button onClick={handleLogout} className="flex items-center gap-2 text-gray-300 hover:text-white transition w-full px-3 py-2 rounded-lg hover:bg-white/5">
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500">Manage your YouTube automation campaigns</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-500 text-sm">Total Campaigns</p>
              <Video className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-500 text-sm">Active Campaigns</p>
              <PlayCircle className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-800">{stats.running}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-500 text-sm">Completed</p>
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-gray-800">{stats.completed}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-500 text-sm">Total Actions</p>
              <ThumbsUp className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-3xl font-bold text-gray-800">{stats.totalActions}</p>
          </div>
        </div>

        {!youtubeConnected && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8">
            <p className="text-yellow-800 text-sm">
              ⚠️ YouTube not connected. Connect your YouTube account to run real campaigns.
            </p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Your Campaigns</h2>
              <p className="text-gray-500 text-sm mt-1">Create and manage your automation campaigns</p>
            </div>
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition">
              <PlusCircle className="w-5 h-5" /> New Campaign
            </button>
          </div>
          <div className="p-6">
            {campaigns.length === 0 ? (
              <div className="text-center py-12">
                <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No campaigns yet</h3>
                <p className="text-gray-400 mb-4">Create your first campaign to start automating</p>
                <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">Create Campaign</button>
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map(campaign => (
                  <div key={campaign.id} className="border border-gray-100 rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getActionIcon(campaign.action_type)}
                        <h3 className="font-semibold text-gray-800">{campaign.name}</h3>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>{campaign.status}</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">{campaign.video_url}</p>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1 mr-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Progress</span>
                          <span>{campaign.completed_count} / {campaign.target_count}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all" style={{ width: `${(campaign.completed_count / campaign.target_count) * 100}%` }}></div>
                        </div>
                      </div>
                    </div>
                    {campaign.scheduled_at && (
                      <p className="text-xs text-gray-400 mt-1">
                        Scheduled: {new Date(campaign.scheduled_at).toLocaleString()}
                      </p>
                    )}
                    {campaign.status === 'pending' && (
                      <button onClick={() => handleStartCampaign(campaign.id)} className="w-full mt-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm font-medium" disabled={!youtubeConnected}>
                        {youtubeConnected ? 'Start Campaign' : 'Connect YouTube First'}
                      </button>
                    )}
                    {campaign.status === 'running' && (
                      <div className="flex items-center gap-2 mt-2 text-blue-600">
                        <Clock className="w-4 h-4 animate-pulse" />
                        <span className="text-sm">Campaign in progress...</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Campaign Creation Modal – SCROLLABLE FIX APPLIED */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Create New Campaign</h2>
            <form onSubmit={handleCreateCampaign}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">Campaign Name</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="My Campaign" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">YouTube URL</label>
                <input type="url" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://youtube.com/watch?v=..." value={formData.video_url} onChange={(e) => setFormData({...formData, video_url: e.target.value})} required />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">Action Type</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.action_type} onChange={(e) => setFormData({...formData, action_type: e.target.value})}>
                  <option value="LIKE">👍 Like Video</option>
                  <option value="SUBSCRIBE">🔔 Subscribe to Channel</option>
                  <option value="COMMENT">💬 Post Comment</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">Target Count (max 100)</label>
                <input type="number" min="1" max="100" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.target_count} onChange={(e) => setFormData({...formData, target_count: parseInt(e.target.value) || 10})} required />
              </div>

              {/* Scheduled start datetime picker */}
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">Schedule Start (optional)</label>
                <input type="datetime-local" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
                <p className="text-gray-500 text-xs mt-1">Leave empty to start manually, or pick a future date/time.</p>
              </div>

              {/* Batch comments (only for COMMENT action) */}
              {formData.action_type === 'COMMENT' && (
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-medium mb-2">Comments (one per line, randomly selected)</label>
                  <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows="4" placeholder="Great video!%0AThanks for sharing!%0AVery helpful" value={commentListText} onChange={(e) => setCommentListText(e.target.value)} />
                  <p className="text-gray-500 text-xs mt-1">{commentListText.split('\n').filter(l => l.trim()).length} comment(s) ready</p>
                </div>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition disabled:opacity-50">{loading ? 'Creating...' : 'Create Campaign'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;