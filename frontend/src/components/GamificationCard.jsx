import React, { useState, useEffect } from 'react';
import { Award, TrendingUp, Flame } from 'lucide-react';

const API_BASE = 'https://sociout-backend.onrender.com/api';

const GamificationCard = () => {
  const [data, setData] = useState({ xp: 0, level: 1, streak_days: 0, next_level_xp: 100 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGamification = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE}/users/me/gamification`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error('Failed to load gamification', err);
      } finally {
        setLoading(false);
      }
    };
    fetchGamification();
  }, []);

  if (loading) return <div className="text-sm text-gray-500">Loading...</div>;

  const progress = Math.min((data.xp / data.next_level_xp) * 100, 100);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
          <Award className="w-4 h-4 text-yellow-500" /> Level {data.level}
        </h3>
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Flame className="w-3 h-3 text-orange-500" /> {data.streak_days} day streak
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            <span>{data.xp} XP</span>
            <span>{data.next_level_xp} XP</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamificationCard;