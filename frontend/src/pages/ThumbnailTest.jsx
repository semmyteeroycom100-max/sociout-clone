import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'https://sociout-backend.onrender.com/api';

function ThumbnailTest() {
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailA, setThumbnailA] = useState(null);
  const [thumbnailB, setThumbnailB] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!thumbnailA || !thumbnailB) {
      alert('Please select two thumbnails');
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('video_url', videoUrl);
    formData.append('thumbnail_a', thumbnailA);
    formData.append('thumbnail_b', thumbnailB);
    
    try {
      const response = await fetch(`${API_BASE}/thumbnail-test/create`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      const data = await response.json();
      setResult(data);
    } catch (err) {
      alert('Failed to create test');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">Thumbnail A/B Test</h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">YouTube Video URL</label>
            <input
              type="url"
              className="w-full p-2 border rounded"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Thumbnail A (image file)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setThumbnailA(e.target.files[0])}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Thumbnail B (image file)</label>
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
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            {loading ? 'Creating...' : 'Start A/B Test'}
          </button>
        </form>
        {result && (
          <div className="mt-6 p-4 bg-green-100 rounded">
            <p>Test created with ID: {result.id}</p>
            <p>Thumbnail A URL: <a href={result.thumbnail_a} target="_blank" rel="noreferrer">{result.thumbnail_a}</a></p>
            <p>Thumbnail B URL: <a href={result.thumbnail_b} target="_blank" rel="noreferrer">{result.thumbnail_b}</a></p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ThumbnailTest;