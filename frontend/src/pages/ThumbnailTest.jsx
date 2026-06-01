import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'https://sociout-backend.onrender.com/api';

function ThumbnailTest() {
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailA, setThumbnailA] = useState(null);
  const [thumbnailB, setThumbnailB] = useState(null);
  const [loading, setLoading] = useState(false);
  const [test, setTest] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) navigate('/login');
  }, []);

  const createTest = async (e) => {
    e.preventDefault();
    if (!thumbnailA || !thumbnailB) {
      setError('Please select two thumbnail images');
      return;
    }
    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('video_url', videoUrl);
    formData.append('thumbnail_a', thumbnailA);
    formData.append('thumbnail_b', thumbnailB);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/thumbnail-test/create`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (response.ok) {
        setTest(data);
        setError('');
      } else {
        setError(data.detail || 'Failed to create test');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const fetchResults = async (testId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/thumbnail-test/results/${testId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setResults(data);
    } catch (err) {
      console.error(err);
    }
  };

  const getServeUrl = (videoId) => `${API_BASE}/thumbnail-test/serve/${videoId}`;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Thumbnail A/B Test</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {!test ? (
          <form onSubmit={createTest} className="bg-white rounded-lg shadow p-6">
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">YouTube Video URL</label>
              <input
                type="url"
                className="w-full p-2 border rounded"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                required
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">Thumbnail A (image)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setThumbnailA(e.target.files[0])}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">Thumbnail B (image)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setThumbnailB(e.target.files[0])}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Start A/B Test'}
            </button>
          </form>
        ) : (
          <div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-2">Test Created</h2>
              <p>Test ID: {test.id}</p>
              <p>Thumbnail A: <a href={test.thumbnail_a} target="_blank" rel="noreferrer" className="text-blue-500">View</a></p>
              <p>Thumbnail B: <a href={test.thumbnail_b} target="_blank" rel="noreferrer" className="text-blue-500">View</a></p>
              <button
                onClick={() => fetchResults(test.id)}
                className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Show Results
              </button>
            </div>

            {results && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Results</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-bold">Variant A</p>
                    <p>Impressions: {results.impressions_a}</p>
                    <p>Clicks: {results.clicks_a}</p>
                    <p>CTR: {(results.ctr_a * 100).toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="font-bold">Variant B</p>
                    <p>Impressions: {results.impressions_b}</p>
                    <p>Clicks: {results.clicks_b}</p>
                    <p>CTR: {(results.ctr_b * 100).toFixed(2)}%</p>
                  </div>
                </div>
                {results.winner && (
                  <p className="mt-4 text-green-600 font-bold">
                    Winner: Variant {results.winner.toUpperCase()}
                  </p>
                )}
              </div>
            )}

            <div className="mt-6">
              <p className="text-gray-600">
                To embed the dynamic thumbnail, use this endpoint:<br />
                <code className="bg-gray-200 p-1 rounded">{getServeUrl('VIDEO_ID')}</code>
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Replace VIDEO_ID with the actual YouTube video ID from the URL.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ThumbnailTest;