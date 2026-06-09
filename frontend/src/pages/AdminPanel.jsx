import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'https://sociout-backend.onrender.com/api';

function AdminPanel() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [userConnections, setUserConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [batchEmails, setBatchEmails] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    loadStats();
    loadUsers();
    loadCampaigns();
    loadUserConnections();
  }, []);

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.status === 403) {
        alert('Admin access required');
        navigate('/dashboard');
        return;
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadCampaigns = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/admin/all-campaigns`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setCampaigns(data);
    } catch (err) {
      console.error('Failed to load campaigns', err);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Fetch user connections (YouTube / TikTok status)
  const loadUserConnections = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/admin/user-connections`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUserConnections(data);
      } else {
        console.warn('User connections endpoint not available yet');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBatchCreate = async () => {
    const lines = batchEmails.split('\n');
    const usersData = [];
    for (const line of lines) {
      if (line.trim()) {
        const [email, username, password] = line.split(',');
        usersData.push({ 
          email: email.trim(), 
          username: username.trim(), 
          password: password.trim() 
        });
      }
    }
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/admin/users/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(usersData)
    });
    const result = await response.json();
    alert(`Created: ${result.created?.length || 0}, Failed: ${result.failed?.length || 0}`);
    loadUsers();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (loading) return <div className="p-8 text-center">Loading admin panel...</div>;

  // Calculate additional stats from campaigns
  const completedCampaigns = campaigns.filter(c => c.status === 'completed').length;
  const failedCampaigns = campaigns.filter(c => c.status === 'failed').length;
  const runningCampaigns = campaigns.filter(c => c.status === 'running').length;
  const totalActions = campaigns.reduce((sum, c) => sum + (c.completed_count || 0), 0);
  // For a more accurate count, we would need CampaignAction table, but approximate is fine

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded">
          Logout
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-gray-500 text-sm">Total Users</h3>
          <p className="text-2xl font-bold">{stats?.total_users || 0}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-gray-500 text-sm">YouTube Connected</h3>
          <p className="text-2xl font-bold">{stats?.youtube_connected || 0}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-gray-500 text-sm">TikTok Connected</h3>
          <p className="text-2xl font-bold">{stats?.tiktok_connected || 0}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-gray-500 text-sm">Total Campaigns</h3>
          <p className="text-2xl font-bold">{stats?.total_campaigns || 0}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-gray-500 text-sm">Completed Campaigns</h3>
          <p className="text-2xl font-bold text-green-600">{completedCampaigns}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-gray-500 text-sm">Failed Campaigns</h3>
          <p className="text-2xl font-bold text-red-600">{failedCampaigns}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-gray-500 text-sm">Running Campaigns</h3>
          <p className="text-2xl font-bold text-blue-600">{runningCampaigns}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-gray-500 text-sm">Total Actions</h3>
          <p className="text-2xl font-bold">{totalActions}</p>
        </div>
      </div>

      {/* Batch Create Users */}
      <div className="bg-white p-6 rounded shadow mb-8">
        <h2 className="text-xl font-bold mb-4">Batch Create Users</h2>
        <textarea
          className="w-full p-2 border rounded mb-4 font-mono text-sm"
          rows="8"
          placeholder="email,username,password&#10;john@gmail.com,john,Pass123!&#10;jane@gmail.com,jane,Pass123!"
          value={batchEmails}
          onChange={(e) => setBatchEmails(e.target.value)}
        />
        <button
          onClick={handleBatchCreate}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Create Users
        </button>
        <p className="text-gray-500 text-sm mt-2">
          Format: email,username,password (one per line)
        </p>
      </div>

      {/* User Connections Table (NEW) */}
      <div className="bg-white p-6 rounded shadow mb-8">
        <h2 className="text-xl font-bold mb-4">User Connections</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">User</th>
                <th className="p-2 text-left">YouTube</th>
                <th className="p-2 text-left">TikTok</th>
              </tr>
            </thead>
            <tbody>
              {userConnections.map(conn => (
                <tr key={conn.user_id} className="border-t">
                  <td className="p-2">{conn.email} ({conn.username})</td>
                  <td className="p-2">{conn.youtube ? '✅' : '❌'}</td>
                  <td className="p-2">{conn.tiktok ? '✅' : '❌'}</td>
                </tr>
              ))}
              {userConnections.length === 0 && (
                <tr><td colSpan="3" className="p-2 text-center text-gray-500">No user connection data available. Add endpoint /api/admin/user-connections.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white p-6 rounded shadow mb-8">
        <h2 className="text-xl font-bold mb-4">Users ({users.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">ID</th>
                <th className="p-2 text-left">Email</th>
                <th className="p-2 text-left">Username</th>
                <th className="p-2 text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-t">
                  <td className="p-2">{user.id}</td>
                  <td className="p-2">{user.email}</td>
                  <td className="p-2">{user.username}</td>
                  <td className="p-2">{new Date(user.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* All Campaigns Table */}
      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-bold mb-4">All Campaigns ({campaigns.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">ID</th>
                <th className="p-2 text-left">User ID</th>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Action</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Progress</th>
                <th className="p-2 text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(camp => (
                <tr key={camp.id} className="border-t">
                  <td className="p-2">{camp.id}</td>
                  <td className="p-2">{camp.user_id}</td>
                  <td className="p-2">{camp.name}</td>
                  <td className="p-2">{camp.action_type}</td>
                  <td className="p-2">{camp.status}</td>
                  <td className="p-2">{camp.completed_count}/{camp.target_count}</td>
                  <td className="p-2">{camp.created_at ? new Date(camp.created_at).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;