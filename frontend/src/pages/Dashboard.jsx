import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Clock,
  Copy,
  Trash2,
  Edit,
  CheckSquare,
  Square,
  CreditCard,
  Sun,
  Moon,
  Image
} from 'lucide-react';
import Logo from '../components/Logo';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';

const API_BASE = 'https://sociout-backend.onrender.com/api';

function Dashboard() {
  const { addToast } = useToast();
  const { darkMode, toggleDarkMode } = useTheme();
  const [user, setUser] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCampaigns, setSelectedCampaigns] = useState([]);
  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [platform, setPlatform] = useState('youtube');
  const [formData, setFormData] = useState({
    name: '',
    video_url: '',
    action_type: 'LIKE',
    target_count: 10
  });
  const [scheduledDate, setScheduledDate] = useState('');
  const [commentListText, setCommentListText] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    loadUser();
    loadCampaigns();
    checkYoutubeStatus();
    checkTikTokStatus();
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
      addToast('Failed to load campaigns', 'error');
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

  const checkTikTokStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/tiktok/status`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setTiktokConnected(data.connected);
    } catch (err) {
      console.error('Failed to check TikTok status');
    }
  };

  const resetYoutubeConnection = async () => {
    if (!confirm('Reset YouTube connection? You will need to reconnect.')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/auth/youtube/reset`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        addToast('YouTube connection reset. Please reconnect.', 'success');
        localStorage.removeItem('token');
        window.location.reload();
      } else {
        addToast('Failed to reset YouTube connection', 'error');
      }
    } catch (err) {
      addToast('Error resetting connection', 'error');
    }
  };

  const resetTikTokConnection = async () => {
    if (!confirm('Reset TikTok connection? You will need to reconnect.')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/tiktok/reset`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        addToast('TikTok connection reset', 'success');
        setTiktokConnected(false);
      } else {
        addToast('Failed to reset TikTok connection', 'error');
      }
    } catch (err) {
      addToast('Error resetting connection', 'error');
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData, platform };
      if (scheduledDate) {
        payload.scheduled_at = new Date(scheduledDate).toISOString();
      }
      if (formData.action_type === 'COMMENT' && commentListText.trim()) {
        const comments = commentListText.split('\n').filter(c => c.trim().length > 0);
        if (comments.length > 0) {
          payload.comment_list = comments;
        }
      }
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/campaigns/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        setShowModal(false);
        setFormData({ name: '', video_url: '', action_type: 'LIKE', target_count: 10 });
        setScheduledDate('');
        setCommentListText('');
        setPlatform('youtube');
        loadCampaigns();
        addToast('Campaign created successfully', 'success');
      } else {
        const error = await response.json();
        addToast('Failed to create campaign: ' + JSON.stringify(error), 'error');
      }
    } catch (err) {
      addToast('Failed to create campaign', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCampaign = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/campaigns/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        await fetch(`${API_BASE}/campaigns/${editingCampaign.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        setShowEditModal(false);
        setEditingCampaign(null);
        setFormData({ name: '', video_url: '', action_type: 'LIKE', target_count: 10 });
        loadCampaigns();
        addToast('Campaign updated successfully', 'success');
      } else {
        addToast('Failed to update campaign', 'error');
      }
    } catch (err) {
      addToast('Failed to update campaign', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateCampaign = async (campaign) => {
    try {
      const token = localStorage.getItem('token');
      const payload = {
        name: `${campaign.name} (Copy)`,
        video_url: campaign.video_url,
        action_type: campaign.action_type,
        target_count: campaign.target_count,
        comment_text: campaign.comment_text,
        scheduled_at: null,
        platform: campaign.platform || 'youtube'
      };
      const response = await fetch(`${API_BASE}/campaigns/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        loadCampaigns();
        addToast('Campaign duplicated successfully', 'success');
      } else {
        addToast('Failed to duplicate campaign', 'error');
      }
    } catch (err) {
      addToast('Failed to duplicate campaign', 'error');
    }
  };

  const handleDeleteCampaign = async (id) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/campaigns/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        loadCampaigns();
        addToast('Campaign deleted successfully', 'success');
      } else {
        addToast('Failed to delete campaign', 'error');
      }
    } catch (err) {
      addToast('Failed to delete campaign', 'error');
    }
  };

  const handleBulkStart = async () => {
    if (selectedCampaigns.length === 0) {
      addToast('Please select campaigns to start', 'warning');
      return;
    }
    if (!confirm(`Start ${selectedCampaigns.length} campaign(s)?`)) return;
    
    const token = localStorage.getItem('token');
    let successCount = 0;
    
    for (const id of selectedCampaigns) {
      try {
        const response = await fetch(`${API_BASE}/campaigns/${id}/start`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) successCount++;
      } catch (err) {
        console.error(`Failed to start campaign ${id}`, err);
      }
    }
    
    addToast(`Started ${successCount}/${selectedCampaigns.length} campaigns`, successCount > 0 ? 'success' : 'error');
    setSelectedCampaigns([]);
    loadCampaigns();
  };

  const toggleSelectCampaign = (id) => {
    setSelectedCampaigns(prev =>
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedCampaigns.length === campaigns.length) {
      setSelectedCampaigns([]);
    } else {
      setSelectedCampaigns(campaigns.map(c => c.id));
    }
  };

  const openEditModal = (campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      video_url: campaign.video_url,
      action_type: campaign.action_type,
      target_count: campaign.target_count
    });
    setScheduledDate(campaign.scheduled_at ? campaign.scheduled_at.slice(0, 16) : '');
    setCommentListText('');
    setShowEditModal(true);
  };

  const handleStartCampaign = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/campaigns/${id}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        loadCampaigns();
        addToast('Campaign started', 'success');
      } else {
        addToast('Failed to start campaign', 'error');
      }
    } catch (err) {
      addToast('Failed to start campaign', 'error');
    }
  };

  const downloadCSV = async (campaignId) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE}/campaigns/${campaignId}/export`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campaign_${campaignId}_export.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      addToast('CSV exported successfully', 'success');
    } catch (err) {
      addToast('Failed to download CSV', 'error');
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
      case 'completed': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'running': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'pending': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'failed': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  const stats = {
    total: campaigns.length,
    running: campaigns.filter(c => c.status === 'running').length,
    completed: campaigns.filter(c => c.status === 'completed').length,
    totalActions: campaigns.reduce((sum, c) => sum + (c.completed_count || 0), 0)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Mobile menu backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
     <aside className={`
  fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-gray-900 to-gray-800 text-white shadow-xl z-50
  transition-transform duration-300 ease-in-out
  ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
  md:translate-x-0
  flex flex-col
`}>
  {/* Top section (logo) – fixed height */}
  <div className="p-6 flex-shrink-0">
    <button 
      className="absolute top-4 right-4 md:hidden text-white hover:text-gray-300"
      onClick={() => setMobileMenuOpen(false)}
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
    <div className="flex items-center gap-3">
      <Logo className="w-10 h-10" />
      <h1 className="text-xl font-bold">Sociout</h1>
    </div>
  </div>

  {/* Scrollable navigation area */}
  <nav className="flex-1 overflow-y-auto px-6 space-y-2">
    <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 bg-white/10 rounded-lg">
      <LayoutDashboard className="w-5 h-5" />
      <span>Dashboard</span>
    </Link>
    <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white/5 rounded-lg transition">
      <Video className="w-5 h-5" />
      <span>Campaigns</span>
    </Link>
    <Link to="/analytics" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white/5 rounded-lg transition">
      <TrendingUp className="w-5 h-5" />
      <span>Analytics</span>
    </Link>
    <Link to="/thumbnail-test" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white/5 rounded-lg transition">
      <Image className="w-5 h-5" />
      <span>Thumbnail A/B</span>
    </Link>
    <Link to="/pricing" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white/5 rounded-lg transition">
      <CreditCard className="w-5 h-5" />
      <span>Pricing</span>
    </Link>
    <button
      onClick={toggleDarkMode}
      className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white/5 rounded-lg transition w-full"
    >
      {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
    </button>
  </nav>

  {/* Bottom section – fixed (no scroll) */}
  <div className="p-6 border-t border-gray-700 flex-shrink-0">
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
      <a href={`${API_BASE}/auth/google`} className="flex items-center justify-center gap-2 w-full mb-3 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm">
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
      <>
        <div className="mb-3 px-3 py-2 bg-green-500/20 rounded-lg text-center">
          <p className="text-green-400 text-xs">✓ YouTube Connected</p>
        </div>
        <button
          onClick={resetYoutubeConnection}
          className="flex items-center justify-center gap-2 w-full mb-3 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm"
        >
          🔄 Reset YouTube Connection
        </button>
      </>
    )}

    {!tiktokConnected && (
      <a href={`${API_BASE}/tiktok/login`} className="flex items-center justify-center gap-2 w-full mb-3 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition text-sm">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.87-4.6 2.9 2.9 0 0 1 .91.25V9.41a6.3 6.3 0 0 0-1.28-.13 6.28 6.28 0 0 0-5.45 3.1 6.28 6.28 0 0 0 3.55 8.83 6.28 6.28 0 0 0 6.73-2.34 6.28 6.28 0 0 0 1.15-3.68V9.41c1.22.88 2.7 1.4 4.29 1.4V7.26c-.78 0-1.5-.18-2.16-.57z"/>
        </svg>
        Connect TikTok
      </a>
    )}
    {tiktokConnected && (
      <>
        <div className="mb-3 px-3 py-2 bg-green-500/20 rounded-lg text-center">
          <p className="text-green-400 text-xs">✓ TikTok Connected</p>
        </div>
        <button
          onClick={resetTikTokConnection}
          className="flex items-center justify-center gap-2 w-full mb-3 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm"
        >
          🔄 Reset TikTok Connection
        </button>
      </>
    )}

    <button onClick={handleLogout} className="flex items-center gap-2 text-gray-300 hover:text-white transition w-full px-3 py-2 rounded-lg hover:bg-white/5">
      <LogOut className="w-4 h-4" />
      <span className="text-sm">Logout</span>
    </button>
  </div>
</aside>

      {/* Main Content */}
      <main className="md:ml-64 p-4 md:p-8">
        <div className="md:hidden flex items-center mb-4">
          <button onClick={() => setMobileMenuOpen(true)} className="text-gray-600 dark:text-gray-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="ml-auto">
            <Logo className="w-8 h-8" />
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage your YouTube automation campaigns</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-500 dark:text-gray-400 text-sm">Total Campaigns</p>
              <Video className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-500 dark:text-gray-400 text-sm">Active Campaigns</p>
              <PlayCircle className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">{stats.running}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-500 dark:text-gray-400 text-sm">Completed</p>
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">{stats.completed}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-500 dark:text-gray-400 text-sm">Total Actions</p>
              <ThumbsUp className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">{stats.totalActions}</p>
          </div>
        </div>

        {!youtubeConnected && (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-8">
            <p className="text-yellow-800 dark:text-yellow-300 text-sm">
              ⚠️ YouTube not connected. Connect your YouTube account to run real campaigns.
            </p>
          </div>
        )}

        {/* Campaigns Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Your Campaigns</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Create and manage your automation campaigns</p>
              </div>
              <div className="flex gap-2">
                {selectedCampaigns.length > 0 && (
                  <button
                    onClick={handleBulkStart}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                  >
                    <PlayCircle className="w-5 h-5" />
                    Start {selectedCampaigns.length}
                  </button>
                )}
                <button 
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition"
                >
                  <PlusCircle className="w-5 h-5" />
                  New Campaign
                </button>
              </div>
            </div>
            
            {/* Bulk select controls */}
            {campaigns.length > 0 && (
              <div className="mt-4 flex items-center gap-4 text-sm">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  {selectedCampaigns.length === campaigns.length ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  {selectedCampaigns.length === campaigns.length ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-gray-500 dark:text-gray-400">
                  {selectedCampaigns.length} selected
                </span>
              </div>
            )}
          </div>
          
          <div className="p-6">
            {campaigns.length === 0 ? (
              <div className="text-center py-12">
                <Video className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">No campaigns yet</h3>
                <p className="text-gray-400 dark:text-gray-500 mb-4">Create your first campaign to start automating</p>
                <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
                  Create Campaign
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map(campaign => (
                  <div key={campaign.id} className="border border-gray-100 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition bg-white dark:bg-gray-800">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleSelectCampaign(campaign.id)}
                          className="mt-1"
                        >
                          {selectedCampaigns.includes(campaign.id) ? (
                            <CheckSquare className="w-4 h-4 text-blue-500" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            {getActionIcon(campaign.action_type)}
                            <h3 className="font-semibold text-gray-800 dark:text-white">{campaign.name}</h3>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{campaign.video_url}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                          {campaign.status}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDuplicateCampaign(campaign)}
                            className="p-1 text-gray-500 hover:text-blue-500 transition dark:text-gray-400 dark:hover:text-blue-400"
                            title="Duplicate"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(campaign)}
                            className="p-1 text-gray-500 hover:text-green-500 transition dark:text-gray-400 dark:hover:text-green-400"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCampaign(campaign.id)}
                            className="p-1 text-gray-500 hover:text-red-500 transition dark:text-gray-400 dark:hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex-1 mr-4">
                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                          <span>Progress</span>
                          <span>{campaign.completed_count} / {campaign.target_count}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all"
                            style={{ width: `${(campaign.completed_count / campaign.target_count) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {campaign.scheduled_at && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        Scheduled: {new Date(campaign.scheduled_at).toLocaleString()}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-2 mt-3">
                      {campaign.status === 'pending' && (
                        <button
                          onClick={() => handleStartCampaign(campaign.id)}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm font-medium"
                          disabled={!youtubeConnected && campaign.platform !== 'tiktok'}
                        >
                          {youtubeConnected || campaign.platform === 'tiktok' ? '▶ Start Campaign' : 'Connect YouTube First'}
                        </button>
                      )}
                      
                      {campaign.status === 'running' && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm">
                          <Clock className="w-4 h-4 animate-pulse" />
                          <span>Campaign in progress...</span>
                        </div>
                      )}
                      
                      {campaign.status === 'completed' && (
                        <button
                          onClick={() => downloadCSV(campaign.id)}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-medium"
                        >
                          📥 Download CSV
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Campaign Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Create New Campaign</h2>
            <form onSubmit={handleCreateCampaign}>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Campaign Name</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" placeholder="My Campaign" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Platform</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  value={platform}
                  onChange={(e) => {
                    setPlatform(e.target.value);
                    setFormData({ ...formData, action_type: e.target.value === 'youtube' ? 'LIKE' : 'LIKE' });
                  }}
                >
                  <option value="youtube">YouTube</option>
                  <option value="tiktok">TikTok</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Video / Profile URL</label>
                <input type="url" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" placeholder={platform === 'youtube' ? "https://youtube.com/watch?v=..." : "https://tiktok.com/@user/video/..."} value={formData.video_url} onChange={(e) => setFormData({...formData, video_url: e.target.value})} required />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Action Type</label>
                <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" value={formData.action_type} onChange={(e) => setFormData({...formData, action_type: e.target.value})}>
                  {platform === 'youtube' && (
                    <>
                      <option value="LIKE">👍 Like Video</option>
                      <option value="SUBSCRIBE">🔔 Subscribe to Channel</option>
                      <option value="COMMENT">💬 Post Comment</option>
                    </>
                  )}
                  {platform === 'tiktok' && (
                    <>
                      <option value="LIKE">❤️ Like Video</option>
                      <option value="FOLLOW">➕ Follow User</option>
                      <option value="COMMENT">💬 Post Comment</option>
                    </>
                  )}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Target Count (max 100)</label>
                <input type="number" min="1" max="100" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" value={formData.target_count} onChange={(e) => setFormData({...formData, target_count: parseInt(e.target.value) || 10})} required />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Schedule Start (optional)</label>
                <input type="datetime-local" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
              </div>

              {formData.action_type === 'COMMENT' && (
                <div className="mb-4">
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Comments (one per line, randomly selected)</label>
                  <textarea className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" rows="4" placeholder="Great video!%0AThanks for sharing!%0AVery helpful" value={commentListText} onChange={(e) => setCommentListText(e.target.value)} />
                </div>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition disabled:opacity-50">
                  {loading ? 'Creating...' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Campaign Modal */}
      {showEditModal && editingCampaign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Edit Campaign</h2>
            <form onSubmit={handleEditCampaign}>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Campaign Name</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" placeholder="Campaign Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Platform</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  disabled
                >
                  <option value="youtube">YouTube</option>
                  <option value="tiktok">TikTok</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Video / Profile URL</label>
                <input type="url" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" placeholder={platform === 'youtube' ? "https://youtube.com/watch?v=..." : "https://tiktok.com/@user/video/..."} value={formData.video_url} onChange={(e) => setFormData({...formData, video_url: e.target.value})} required />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Action Type</label>
                <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" value={formData.action_type} onChange={(e) => setFormData({...formData, action_type: e.target.value})}>
                  {platform === 'youtube' && (
                    <>
                      <option value="LIKE">👍 Like Video</option>
                      <option value="SUBSCRIBE">🔔 Subscribe to Channel</option>
                      <option value="COMMENT">💬 Post Comment</option>
                    </>
                  )}
                  {platform === 'tiktok' && (
                    <>
                      <option value="LIKE">❤️ Like Video</option>
                      <option value="FOLLOW">➕ Follow User</option>
                      <option value="COMMENT">💬 Post Comment</option>
                    </>
                  )}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Target Count (max 100)</label>
                <input type="number" min="1" max="100" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" value={formData.target_count} onChange={(e) => setFormData({...formData, target_count: parseInt(e.target.value) || 10})} required />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition disabled:opacity-50">
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;