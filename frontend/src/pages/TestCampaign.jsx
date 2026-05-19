import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'https://sociout-backend.onrender.com/api';

function TestCampaign() {
  const [name, setName] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [actionType, setActionType] = useState('LIKE');
  const [targetCount, setTargetCount] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    
    const token = localStorage.getItem('token');
    const data = {
      name: name,
      video_url: videoUrl,
      action_type: actionType,
      target_count: targetCount
    };
    
    console.log('Sending:', data);
    
    try {
      const response = await fetch(`${API_BASE}/campaigns/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      
      const responseData = await response.json();
      console.log('Response:', responseData);
      
      setResult({
        status: response.status,
        data: responseData
      });
      
    } catch (err) {
      console.error('Error:', err);
      setResult({ status: 'error', data: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Test Campaign Creation</h1>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Campaign Name</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">YouTube URL</label>
            <input
              type="url"
              className="w-full p-2 border rounded"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Action Type</label>
            <select
              className="w-full p-2 border rounded"
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
            >
              <option value="LIKE">LIKE</option>
              <option value="SUBSCRIBE">SUBSCRIBE</option>
              <option value="COMMENT">COMMENT</option>
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Target Count (1-100)</label>
            <input
              type="number"
              className="w-full p-2 border rounded"
              value={targetCount}
              onChange={(e) => setTargetCount(parseInt(e.target.value))}
              min="1"
              max="100"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white p-2 rounded disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Campaign'}
          </button>
        </form>
        
        {result && (
          <div className={`mt-4 p-3 rounded ${result.status === 200 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <p><strong>Status:</strong> {result.status}</p>
            <p><strong>Response:</strong></p>
            <pre className="text-xs mt-2 overflow-auto">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
        )}
        
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 text-blue-500"
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}

export default TestCampaign;