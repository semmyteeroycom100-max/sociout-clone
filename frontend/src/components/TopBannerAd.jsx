import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';

const API_BASE = 'https://sociout-backend.onrender.com/api';

function TopBannerAd() {
  const [ad, setAd] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAd = () => {
    fetch(`${API_BASE}/ads/active?slot=top_banner`)
      .then(res => {
        if (!res.ok) throw new Error('Ad fetch failed');
        return res.json();
      })
      .then(data => {
        setAd(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Ad error:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAd();
    const interval = setInterval(fetchAd, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="w-full h-24 bg-gray-100 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-center mb-6 animate-pulse">
        <span className="text-gray-400">Loading ad...</span>
      </div>
    );
  }

  if (!ad) {
    return (
      <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center mb-6 h-24 hover:border-blue-500 transition-colors cursor-pointer">
        <div className="text-center">
          <Plus className="w-8 h-8 text-gray-400 mx-auto mb-1" />
          <span className="text-sm text-gray-400">Advertise here</span>
        </div>
      </div>
    );
  }

  const isVideo = ad.media_type === 'video';

  return (
    <div className="relative w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
      <a
        href={`${API_BASE}/ads/click/${ad.id}?redirect_url=${encodeURIComponent(ad.target_url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full"
      >
        {isVideo ? (
          <video
            src={ad.media_url}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-auto max-h-[120px] object-cover"
          />
        ) : (
          <img
            src={ad.media_url}
            alt="Advertisement"
            className="w-full h-auto max-h-[120px] object-cover"
          />
        )}
      </a>
    </div>
  );
}

export default TopBannerAd;