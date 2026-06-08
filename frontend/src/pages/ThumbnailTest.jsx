import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Upload, Eye, TrendingUp, Trophy, RefreshCw } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const API_BASE = 'https://sociout-backend.onrender.com/api';

function ThumbnailTest() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailA, setThumbnailA] = useState(null);
  const [thumbnailB, setThumbnailB] = useState(null);
  const [uploading, setUploading] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchTests();
  }, []);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/thumbnail-test/list`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTests(data);
      }
    } catch (err) {
      addToast('Failed to load tests', 'error');
    } finally {
      setLoading(false);
    }
  };

  const uploadThumbnail = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE}/thumbnail-test/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: formData
    });
    if (!response.ok) throw new Error('Upload failed');
    const data = await response.json();
    return data.url;
  };

  const handleCreateTest = async (e) => {
    e.preventDefault();
    if (!videoUrl.trim()) {
      addToast('Please enter a video URL', 'warning');
      return;
    }
    if (!thumbnailA || !thumbnailB) {
      addToast('Please upload both thumbnails', 'warning');
      return;
    }
    setCreating(true);
    try {
      const [urlA, urlB] = await Promise.all([
        uploadThumbnail(thumbnailA),
        uploadThumbnail(thumbnailB)
      ]);
      const response = await fetch(`${API_BASE}/thumbnail-test/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          video_url: videoUrl,
          thumbnail_a_url: urlA,
          thumbnail_b_url: urlB
        })
      });
      if (response.ok) {
        addToast('Thumbnail test created successfully', 'success');
        setVideoUrl('');
        setThumbnailA(null);
        setThumbnailB(null);
        fetchTests();
      } else {
        addToast('Failed to create test', 'error');
      }
    } catch (err) {
      addToast('Error creating test', 'error');
    } finally {
      setCreating(false);
    }
  };

  const ThumbnailDropzone = ({ label, onDrop, file }) => {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop: (acceptedFiles) => onDrop(acceptedFiles[0]),
      accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
      maxFiles: 1
    });
    return (
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
        <div {...getRootProps()} className="cursor-pointer">
          <input {...getInputProps()} />
          {file ? (
            <div>
              <img src={URL.createObjectURL(file)} alt="Thumbnail preview" className="h-24 mx-auto rounded" />
              <p className="text-sm mt-2">{file.name}</p>
            </div>
          ) : (
            <div>
              <Upload className="w-8 h-8 mx-auto text-gray-400" />
              <p className="text-sm text-gray-500">{isDragActive ? 'Drop image' : label}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Thumbnail A/B Testing</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">Test which thumbnail gets more clicks</p>

        {/* Create new test form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Create New Test</h2>
          <form onSubmit={handleCreateTest}>
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">YouTube Video URL</label>
              <input
                type="url"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="https://youtube.com/watch?v=..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Thumbnail A</label>
                <ThumbnailDropzone label="Upload thumbnail A" onDrop={setThumbnailA} file={thumbnailA} />
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Thumbnail B</label>
                <ThumbnailDropzone label="Upload thumbnail B" onDrop={setThumbnailB} file={thumbnailB} />
              </div>
            </div>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Start A/B Test'}
            </button>
          </form>
        </div>

        {/* Existing tests list */}
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Your Tests</h2>
        {loading ? (
          <div className="text-center py-12">Loading tests...</div>
        ) : tests.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-500">No tests yet. Create your first thumbnail test above.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tests.map((test) => {
              const totalImpressions = test.impressions_a + test.impressions_b;
              const ctrA = totalImpressions ? (test.clicks_a / test.impressions_a * 100).toFixed(1) : 0;
              const ctrB = totalImpressions ? (test.clicks_b / test.impressions_b * 100).toFixed(1) : 0;
              const winner = test.winner ? (test.winner === 'a' ? 'Thumbnail A wins!' : 'Thumbnail B wins!') : 'Test still running';
              return (
                <div key={test.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-100 dark:border-gray-700">
                  <div className="flex flex-wrap justify-between items-start mb-3">
                    <div>
                      <p className="text-sm text-gray-500">Video ID: {test.video_id}</p>
                      <p className="text-sm text-gray-500">Created: {new Date(test.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${test.winner ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'}`}>
                      {winner}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                      <p className="font-semibold">Thumbnail A</p>
                      <p>Impressions: {test.impressions_a}</p>
                      <p>Clicks: {test.clicks_a}</p>
                      <p>CTR: {ctrA}%</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                      <p className="font-semibold">Thumbnail B</p>
                      <p>Impressions: {test.impressions_b}</p>
                      <p>Clicks: {test.clicks_b}</p>
                      <p>CTR: {ctrB}%</p>
                    </div>
                  </div>
                  <button
                    onClick={() => window.open(`/api/thumbnail-test/serve/${test.video_id}`, '_blank')}
                    className="text-sm text-blue-500 hover:underline"
                  >
                    Preview serving link
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ThumbnailTest;