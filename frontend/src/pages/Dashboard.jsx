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
  Image,
  Megaphone,
  User,
  Settings,
  BookOpen,
  ChevronRight,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import Logo from '../components/Logo';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { useYouTube } from '../context/YouTubeContext';
import { playClick, toggleSound } from '../utils/sound';
import TopBannerAd from '../components/TopBannerAd';
import UserMenu from '../components/UserMenu';
import OnboardingChecklist from '../components/OnboardingChecklist';
import Tooltip from '../components/Tooltip';
import Tip from '../components/Tip';
import WelcomeModal from '../components/WelcomeModal';
import Footer from '../components/Footer';
// ===== NEW IMPORTS =====
import GamificationCard from '../components/GamificationCard';
import FeedbackButton from '../components/FeedbackButton';
import SupportButton from '../components/SupportButton';
import BackButton from '../components/BackButton';

const API_BASE = 'https://sociout-backend.onrender.com/api';

function Dashboard() {
  const { addToast } = useToast();
  const { darkMode, toggleDarkMode } = useTheme();
  const { isConnected: youtubeConnected, loading: youtubeLoading, refreshStatus } = useYouTube();
  const [user, setUser] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCampaigns, setSelectedCampaigns] = useState([]);
  const [filter, setFilter] = useState('all');
  const [activities, setActivities] = useState([]);
  const [platform, setPlatform] = useState('youtube');
  const [generatingComments, setGeneratingComments] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    video_url: '',
    action_type: 'LIKE',
    target_count: 10
  });
  const [scheduledDate, setScheduledDate] = useState('');
  const [commentListText, setCommentListText] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    loadUser();
    loadCampaigns();
    loadActivities();
    // Show Welcome Modal if first visit
    const hasVisited = localStorage.getItem('hasVisitedResourceHub');
    if (!hasVisited) {
      setShowWelcome(true);
      localStorage.setItem('hasVisitedResourceHub', 'true');
    }
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
  const generateComments = async () => {
  if (!formData.video_url) {
    addToast('Please enter a video URL first', 'warning');
    return;
  }
  setGeneratingComments(true);
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/ai/generate-comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ video_url: formData.video_url }),
    });
    if (response.ok) {
      const data = await response.json();
      if (data.comments && data.comments.length > 0) {
        setCommentListText(data.comments.join('\n'));
        addToast('Comments generated!', 'success');
      } else {
        addToast('No comments generated, try again.', 'warning');
      }
    } else {
      const err = await response.json();
      addToast(err.detail || 'Failed to generate comments', 'error');
    }
  } catch (err) {
    addToast('Network error', 'error');
  } finally {
    setGeneratingComments(false);
  }
};
  const loadCampaigns = async () => {
    try {
      const response = await fetch(`${API_BASE}/campaigns`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setCampaigns(data);
      applyFilter(data, filter);
    } catch (err) {
      addToast('Failed to load campaigns', 'error');
    }
  };

  const loadActivities = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/users/me/activity?limit=5`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setActivities(data);
    } catch (err) {
      console.error('Failed to load activities', err);
    }
  };

  const resetYoutubeConnection = async () => {
    playClick();
    if (!confirm('Reset YouTube connection? You will need to reconnect.')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/auth/youtube/reset`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        addToast('YouTube connection reset. Please reconnect.', 'success');
        refreshStatus();
        window.location.href = `${API_BASE}/auth/google`;
      } else {
        addToast('Failed to reset YouTube connection', 'error');
      }
    } catch (err) {
      addToast('Error resetting connection', 'error');
    }
  };

  const applyFilter = (data, status) => {
    if (status === 'all') {
      setFilteredCampaigns(data);
    } else {
      setFilteredCampaigns(data.filter(c => c.status === status));
    }
  };

  const handleFilterChange = (status) => {
    playClick();
    setFilter(status);
    applyFilter(campaigns, status);
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    playClick();
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
        loadActivities();
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
    playClick();
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
        loadActivities();
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
    playClick();
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
    playClick();
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/campaigns/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        loadCampaigns();
        loadActivities();
        addToast('Campaign deleted successfully', 'success');
      } else {
        addToast('Failed to delete campaign', 'error');
      }
    } catch (err) {
      addToast('Failed to delete campaign', 'error');
    }
  };

  const handleBulkStart = async () => {
    playClick();
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
    loadActivities();
  };

  const toggleSelectCampaign = (id) => {
    setSelectedCampaigns(prev =>
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedCampaigns.length === filteredCampaigns.length) {
      setSelectedCampaigns([]);
    } else {
      setSelectedCampaigns(filteredCampaigns.map(c => c.id));
    }
  };

  const openEditModal = (campaign) => {
    playClick();
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
    playClick();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/campaigns/${id}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        loadCampaigns();
        loadActivities();
        addToast('Campaign started', 'success');
      } else {
        addToast('Failed to start campaign', 'error');
      }
    } catch (err) {
      addToast('Failed to start campaign', 'error');
    }
  };

  const downloadCSV = async (campaignId) => {
    playClick();
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
    playClick();
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex flex-col">
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
        {/* Top – Logo */}
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

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-6 space-y-1">
          <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 bg-white/10 rounded-lg">
            <LayoutDashboard className="w-5 h-5" />
            <span>Overview</span>
          </Link>
          <Link to="/analytics" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white/5 rounded-lg transition">
            <TrendingUp className="w-5 h-5" />
            <span>Analytics</span>
          </Link>
          <Link to="/advertise" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white/5 rounded-lg transition">
            <Megaphone className="w-5 h-5" />
            <span>Advertise</span>
          </Link>
          <Link to="/pricing" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white/5 rounded-lg transition">
            <CreditCard className="w-5 h-5" />
            <span>Pricing</span>
          </Link>
          <div className="my-2 border-t border-gray-700"></div>
          <Link to="/profile" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white/5 rounded-lg transition">
            <User className="w-5 h-5" />
            <span>Profile</span>
          </Link>
          <Link to="/settings" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white/5 rounded-lg transition">
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </Link>
          <Link to="/resources" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white/5 rounded-lg transition">
            <BookOpen className="w-5 h-5" />
            <span>Learn</span>
          </Link>
          <div className="my-2 border-t border-gray-700"></div>
          <div className="px-3 py-2">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Platforms</p>
            {youtubeLoading ? (
              <div className="flex items-center gap-2 px-3 py-2 mt-2 text-sm text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent" />
                Checking...
              </div>
            ) : !youtubeConnected ? (
              <a href={`${API_BASE}/auth/google`} className="flex items-center gap-3 px-3 py-2 mt-2 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 rounded-lg transition">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Connect YouTube
              </a>
            ) : (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2 px-3 py-2 text-green-400 text-sm">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  YouTube Connected
                </div>
                <button
                  onClick={resetYoutubeConnection}
                  className="w-full text-left text-xs text-yellow-400 hover:text-yellow-300 px-3 py-1 rounded hover:bg-white/5 transition"
                >
                  🔄 Reset YouTube
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-2 mt-2 text-sm text-gray-500 opacity-50">
              <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
              TikTok (Coming Soon)
            </div>
          </div>

          {/* ===== GAMIFICATION CARD ===== */}
          <div className="px-3 py-2 mt-2">
            <GamificationCard />
          </div>
        </nav>

        {/* Bottom – Logout */}
        <div className="p-6 border-t border-gray-700 flex-shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition w-full px-3 py-2 rounded-lg hover:bg-white/5"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
	{/* Referral Widget */}
        <div className="px-3 py-2 mt-2 border-t border-gray-700">
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition"
  >
            <Users className="w-4 h-4" />
            <span>Referral Program</span>
          </button>
       </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 p-4 md:p-8 flex-1">
        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between mb-4">
          <button onClick={() => setMobileMenuOpen(true)} className="text-gray-600 dark:text-gray-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Logo className="w-8 h-8" />
        </div>

        {/* Header with Back Button and UserMenu */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <BackButton />
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Overview</h1>
              <p className="text-gray-500 dark:text-gray-400">Manage your YouTube automation campaigns</p>
            </div>
          </div>
          <UserMenu user={user} />
        </div>

        {/* Onboarding Checklist */}
        <OnboardingChecklist
          youtubeConnected={youtubeConnected}
          tiktokConnected={false}
          campaigns={campaigns}
        />

        {/* Ad Banner */}
        <TopBannerAd />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-500 dark:text-gray-400 text-sm">Total Campaigns</p>
              <Video className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">{stats.total}</p>
            <p className="text-xs text-gray-400 mt-1">↑ 12% from last week</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-500 dark:text-gray-400 text-sm">Active Campaigns</p>
              <PlayCircle className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">{stats.running}</p>
            <p className="text-xs text-gray-400 mt-1">{stats.running} running now</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-500 dark:text-gray-400 text-sm">Completed</p>
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">{stats.completed}</p>
            <p className="text-xs text-gray-400 mt-1">85% success rate</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-500 dark:text-gray-400 text-sm">Total Actions</p>
              <ThumbsUp className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">{stats.totalActions}</p>
            <p className="text-xs text-gray-400 mt-1">24 this week</p>
          </div>
        </div>

        {/* YouTube not connected warning – now uses context */}
        {!youtubeLoading && !youtubeConnected && (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <p className="text-yellow-800 dark:text-yellow-300 text-sm">
              ⚠️ YouTube not connected. Connect your YouTube account to run real campaigns.
            </p>
          </div>
        )}

        {/* Filter buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => handleFilterChange('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              filter === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            All ({campaigns.length})
          </button>
          <button
            onClick={() => handleFilterChange('running')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              filter === 'running'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Running ({campaigns.filter(c => c.status === 'running').length})
          </button>
          <button
            onClick={() => handleFilterChange('completed')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              filter === 'completed'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Completed ({campaigns.filter(c => c.status === 'completed').length})
          </button>
          <button
            onClick={() => handleFilterChange('failed')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              filter === 'failed'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Failed ({campaigns.filter(c => c.status === 'failed').length})
          </button>
          <div className="flex-1"></div>
          <Tooltip content="Create a new automation campaign for YouTube">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full hover:opacity-90 transition text-sm"
            >
              <PlusCircle className="w-4 h-4" />
              New Campaign
            </button>
          </Tooltip>
        </div>

        {/* Campaign List – Compact Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-6">
          {filteredCampaigns.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Video className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-lg font-medium">No campaigns yet</p>
              <p className="text-sm">Create your first campaign to start automating.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="p-3 text-left">
                      <input
                        type="checkbox"
                        onChange={toggleSelectAll}
                        checked={selectedCampaigns.length === filteredCampaigns.length && filteredCampaigns.length > 0}
                      />
                    </th>
                    <th className="p-3 text-left font-medium text-gray-600 dark:text-gray-300">Name</th>
                    <th className="p-3 text-left font-medium text-gray-600 dark:text-gray-300">Platform</th>
                    <th className="p-3 text-left font-medium text-gray-600 dark:text-gray-300">Action</th>
                    <th className="p-3 text-left font-medium text-gray-600 dark:text-gray-300">Status</th>
                    <th className="p-3 text-left font-medium text-gray-600 dark:text-gray-300">Progress</th>
                    <th className="p-3 text-left font-medium text-gray-600 dark:text-gray-300">Created</th>
                    <th className="p-3 text-left font-medium text-gray-600 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCampaigns.slice(0, 5).map(campaign => (
                    <tr key={campaign.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedCampaigns.includes(campaign.id)}
                          onChange={() => toggleSelectCampaign(campaign.id)}
                        />
                      </td>
                      <td className="p-3 font-medium text-gray-800 dark:text-white">{campaign.name}</td>
                      <td className="p-3">{campaign.platform || 'YouTube'}</td>
                      <td className="p-3">{getActionIcon(campaign.action_type)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                          {campaign.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
                              style={{ width: `${(campaign.completed_count / campaign.target_count) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{campaign.completed_count}/{campaign.target_count}</span>
                        </div>
                      </td>
                      <td className="p-3 text-xs text-gray-500">{new Date(campaign.created_at).toLocaleDateString()}</td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          {campaign.status === 'pending' && (
                            <Tooltip content="Start this campaign">
                              <button onClick={() => handleStartCampaign(campaign.id)} className="p-1 text-green-500 hover:text-green-700 transition">▶</button>
                            </Tooltip>
                          )}
                          <Tooltip content="Duplicate">
                            <button onClick={() => handleDuplicateCampaign(campaign)} className="p-1 text-blue-500 hover:text-blue-700 transition">📋</button>
                          </Tooltip>
                          <Tooltip content="Edit">
                            <button onClick={() => openEditModal(campaign)} className="p-1 text-yellow-500 hover:text-yellow-700 transition">✏️</button>
                          </Tooltip>
                          <Tooltip content="Delete">
                            <button onClick={() => handleDeleteCampaign(campaign.id)} className="p-1 text-red-500 hover:text-red-700 transition">🗑</button>
                          </Tooltip>
                          {campaign.status === 'completed' && (
                            <Tooltip content="Download CSV">
                              <button onClick={() => downloadCSV(campaign.id)} className="p-1 text-purple-500 hover:text-purple-700 transition">📥</button>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {filteredCampaigns.length > 5 && (
            <div className="p-3 border-t border-gray-100 dark:border-gray-700 text-center">
              <Link to="/campaigns" className="text-blue-500 hover:text-blue-600 text-sm font-medium">
                View All {filteredCampaigns.length} Campaigns →
              </Link>
            </div>
          )}
          {selectedCampaigns.length > 0 && (
            <div className="p-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
              <button
                onClick={handleBulkStart}
                className="px-4 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm"
              >
                Start Selected ({selectedCampaigns.length})
              </button>
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Recent Activity
            </h2>
            <Link to="/profile" className="text-sm text-blue-500 hover:text-blue-600">View All →</Link>
          </div>
          {activities.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity.</p>
          ) : (
            <div className="space-y-2">
              {activities.slice(0, 5).map(act => (
                <div key={act.id} className="flex items-start gap-3 text-sm border-b border-gray-100 dark:border-gray-700 pb-2 last:border-0">
                  <div className="w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                    {act.action_type === 'campaign_started' && <PlayCircle className="w-3 h-3 text-blue-500" />}
                    {act.action_type === 'campaign_completed' && <CheckCircle className="w-3 h-3 text-green-500" />}
                    {act.action_type === 'campaign_failed' && <XCircle className="w-3 h-3 text-red-500" />}
                    {!['campaign_started','campaign_completed','campaign_failed'].includes(act.action_type) && <RefreshCw className="w-3 h-3 text-gray-500" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-700 dark:text-gray-300">{act.description || act.action_type}</p>
                    <p className="text-xs text-gray-400">{new Date(act.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tip */}
        <Tip>
          💡 Download CSV to analyze your campaign performance offline.
        </Tip>
      </main>

      {/* Footer */}
      <Footer />

      {/* Welcome Modal */}
      {showWelcome && (
        <WelcomeModal
          onClose={() => setShowWelcome(false)}
          onExplore={() => {
            setShowWelcome(false);
            navigate('/resources');
          }}
        />
      )}

      {/* Floating Buttons */}
      <FeedbackButton />
      <SupportButton />

      {/* Create Campaign Modal – WITHOUT the shared pool toggle */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Create New Campaign</h2>
            <form onSubmit={handleCreateCampaign}>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Campaign Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="My Campaign"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
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
                  <option value="tiktok" disabled>TikTok (Coming Soon)</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Video / Profile URL</label>
                <input
                  type="url"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder={platform === 'youtube' ? "https://youtube.com/watch?v=..." : "https://tiktok.com/@user/video/..."}
                  value={formData.video_url}
                  onChange={(e) => setFormData({...formData, video_url: e.target.value})}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Action Type</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  value={formData.action_type}
                  onChange={(e) => setFormData({...formData, action_type: e.target.value})}
                >
                  <option value="LIKE">👍 Like Video</option>
                  <option value="SUBSCRIBE">🔔 Subscribe to Channel</option>
                  <option value="COMMENT">💬 Post Comment</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Target Count (max 100)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  value={formData.target_count}
                  onChange={(e) => setFormData({...formData, target_count: parseInt(e.target.value) || 10})}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Schedule Start (optional)</label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>
              {{formData.action_type === 'COMMENT' && (
  <div className="mb-4">
    <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Comments (one per line, randomly selected)</label>
    <div className="flex gap-2 mb-2">
      <button
        type="button"
        onClick={generateComments}
        disabled={!formData.video_url || generatingComments}
        className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition disabled:opacity-50"
      >
        {generatingComments ? 'Generating...' : '✨ Generate Comments'}
      </button>
    </div>
    <textarea
      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
      rows="4"
      placeholder="Great video!%0AThanks for sharing!%0AVery helpful"
      value={commentListText}
      onChange={(e) => setCommentListText(e.target.value)}
    />
    <p className="text-xs text-gray-400 mt-1">💡 Tip: Use natural, engaging comments. Avoid spam.</p>
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
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Campaign Name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
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
                  <option value="tiktok" disabled>TikTok (Coming Soon)</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Video / Profile URL</label>
                <input
                  type="url"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder={platform === 'youtube' ? "https://youtube.com/watch?v=..." : "https://tiktok.com/@user/video/..."}
                  value={formData.video_url}
                  onChange={(e) => setFormData({...formData, video_url: e.target.value})}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Action Type</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  value={formData.action_type}
                  onChange={(e) => setFormData({...formData, action_type: e.target.value})}
                >
                  <option value="LIKE">👍 Like Video</option>
                  <option value="SUBSCRIBE">🔔 Subscribe to Channel</option>
                  <option value="COMMENT">💬 Post Comment</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Target Count (max 100)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  value={formData.target_count}
                  onChange={(e) => setFormData({...formData, target_count: parseInt(e.target.value) || 10})}
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
                >
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