import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Globe, MapPin, Calendar, TrendingUp, PlayCircle, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const API_BASE = 'https://sociout-backend.onrender.com/api';

function Profile() {
  const [profile, setProfile] = useState(null);
  const [activities, setActivities] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ bio: '', website: '', location: '' });
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchProfile();
    fetchActivities();
    fetchCampaigns();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/users/me/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setProfile(data);
      setFormData({
        bio: data.bio || '',
        website: data.website || '',
        location: data.location || ''
      });
    } catch (err) {
      console.error('Failed to load profile', err);
    }
  };

  const fetchActivities = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/users/me/activity?limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setActivities(data);
    } catch (err) {
      console.error('Failed to load activities', err);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/campaigns/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setCampaigns(data);
    } catch (err) {
      console.error('Failed to load campaigns', err);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/users/me/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        addToast('Profile updated successfully', 'success');
        setEditing(false);
        fetchProfile();
      } else {
        addToast('Failed to update profile', 'error');
      }
    } catch (err) {
      addToast('Error updating profile', 'error');
    }
  };

  const stats = {
    totalCampaigns: campaigns.length,
    running: campaigns.filter(c => c.status === 'running').length,
    completed: campaigns.filter(c => c.status === 'completed').length,
    failed: campaigns.filter(c => c.status === 'failed').length,
  };

  if (loading) return <div className="p-8 text-center">Loading profile...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-6">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
              {profile?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{profile?.username}</h1>
                  <p className="text-gray-500 dark:text-gray-400">{profile?.email}</p>
                  {profile?.bio && <p className="mt-2 text-gray-700 dark:text-gray-300">{profile.bio}</p>}
                  <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
                    {profile?.location && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {profile.location}</span>}
                    {profile?.website && <span className="flex items-center gap-1"><Globe className="w-4 h-4" /> <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{profile.website}</a></span>}
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Joined {new Date(profile?.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => setEditing(!editing)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm"
                >
                  {editing ? 'Cancel' : 'Edit Profile'}
                </button>
              </div>
            </div>
          </div>

          {editing && (
            <form onSubmit={updateProfile} className="mt-4 border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Bio</label>
                  <textarea
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                    rows="2"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Website</label>
                  <input
                    type="url"
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Location</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </div>
              <button type="submit" className="mt-3 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition">
                Save Changes
              </button>
            </form>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalCampaigns}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Campaigns</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.running}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Running</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.completed}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.failed}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Failed</p>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          {activities.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No recent activity.</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {activities.map(act => (
                <div key={act.id} className="flex items-start gap-3 border-b border-gray-100 dark:border-gray-700 pb-3">
                  <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 flex-shrink-0">
                    {act.action_type === 'campaign_started' && <PlayCircle className="w-4 h-4" />}
                    {act.action_type === 'campaign_completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {act.action_type === 'campaign_failed' && <XCircle className="w-4 h-4 text-red-500" />}
                    {!['campaign_started','campaign_completed','campaign_failed'].includes(act.action_type) && <User className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-800 dark:text-gray-200">{act.description || act.action_type}</p>
                    <p className="text-xs text-gray-400">{new Date(act.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <a href="/dashboard" className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center hover:shadow-md transition">
            <TrendingUp className="w-6 h-6 mx-auto text-blue-500" />
            <p className="mt-1 text-sm font-medium">Dashboard</p>
          </a>
          <a href="/campaigns" className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center hover:shadow-md transition">
            <PlayCircle className="w-6 h-6 mx-auto text-green-500" />
            <p className="mt-1 text-sm font-medium">My Campaigns</p>
          </a>
          <a href="/analytics" className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center hover:shadow-md transition">
            <TrendingUp className="w-6 h-6 mx-auto text-purple-500" />
            <p className="mt-1 text-sm font-medium">Analytics</p>
          </a>
        </div>
      </div>
    </div>
  );
}

export default Profile;