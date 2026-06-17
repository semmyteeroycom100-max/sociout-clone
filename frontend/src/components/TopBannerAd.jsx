import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'https://sociout-backend.onrender.com/api';

function TopBannerAd() {
  const [ad, setAd] = useState(null);
  const navigate = useNavigate();

  const fetchAd = () => {
    fetch(`${API_BASE}/ads/active?slot=top_banner`)
      .then(res => {
        if (!res.ok) throw new Error('Ad fetch failed');
        return res.json();
      })
      .then(data => setAd(data))
      .catch(err => console.error('Ad error:', err));
  };

  useEffect(() => {
    fetchAd();
    // Refresh every 60 seconds (optional)
    const interval = setInterval(fetchAd, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!ad) return null; // No ad to show

  return (
    <div className="relative w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
      {/* Label */}
      <div className="absolute top-1 right-2 text-[10px] text-gray-400 dark:text-gray-500 bg-white/80 dark:bg-gray-800/80 px-2 py-0.5 rounded">
        Ad
      </div>
      {/* Clickable ad */}
      <a
        href={`${API_BASE}/ads/click/${ad.id}?redirect_url=${encodeURIComponent(ad.target_url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full"
      >
        <img
          src={ad.image_url}
          alt="Advertisement"
          className="w-full h-auto max-h-[120px] object-cover"
        />
      </a>
    </div>
  );
}

export default TopBannerAd;