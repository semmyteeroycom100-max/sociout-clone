import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, ChevronDown, ChevronRight, Search, Sparkles } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const API_BASE = 'https://sociout-backend.onrender.com/api';

const ResourceHub = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedModule, setExpandedModule] = useState(null);
  const [expandedLesson, setExpandedLesson] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [completedLessons, setCompletedLessons] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('completedLessons') || '[]');
    } catch {
      return [];
    }
  });
  const { addToast } = useToast();

  // Group articles by module
  const modules = {
    platform: { label: 'Platform 101', icon: '🏗️', description: 'Master the basics of Sociout' },
    youtube: { label: 'YouTube Mastery', icon: '🎬', description: 'Grow your YouTube channel' },
    tiktok: { label: 'TikTok Strategies', icon: '🎵', description: 'Viral growth on TikTok' },
    optimization: { label: 'Campaign Optimization', icon: '🎯', description: 'Maximize campaign performance' },
    safety: { label: 'Safety & Compliance', icon: '🛡️', description: 'Stay safe and compliant' },
    growth: { label: 'Growth Tactics', icon: '🚀', description: 'Advanced growth strategies' },
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const res = await fetch(`${API_BASE}/articles/public`);
      if (res.ok) {
        const data = await res.json();
        setArticles(data);
      } else {
        addToast('Failed to load articles', 'error');
      }
    } catch (err) {
      addToast('Network error loading articles', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (moduleKey) => {
    setExpandedModule(expandedModule === moduleKey ? null : moduleKey);
    setExpandedLesson(null);
  };

  const toggleLesson = (index) => {
    setExpandedLesson(expandedLesson === index ? null : index);
  };

  const markComplete = (articleId) => {
    if (!completedLessons.includes(articleId)) {
      const updated = [...completedLessons, articleId];
      setCompletedLessons(updated);
      localStorage.setItem('completedLessons', JSON.stringify(updated));
      addToast('Lesson marked complete! 🎉', 'success');
    }
  };

  const isComplete = (articleId) => completedLessons.includes(articleId);

  const filteredArticles = articles.filter(a =>
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.module.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group filtered articles by module
  const groupedArticles = {};
  filteredArticles.forEach(article => {
    if (!groupedArticles[article.module]) groupedArticles[article.module] = [];
    groupedArticles[article.module].push(article);
  });

  const totalLessons = articles.length;
  const completedCount = completedLessons.length;
  const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Loading Resource Hub...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              Resource Hub
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Your growth university – learn, grow, and succeed.
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {completedCount} / {totalLessons} lessons
            </div>
            <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search articles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Articles */}
        {Object.keys(groupedArticles).length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No articles found matching your search.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.keys(groupedArticles).map((moduleKey) => {
              const module = modules[moduleKey];
              const moduleArticles = groupedArticles[moduleKey];
              const moduleCompleted = moduleArticles.filter(a => isComplete(a.id)).length;

              return (
                <div
                  key={moduleKey}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden border border-gray-200 dark:border-gray-700"
                >
                  <button
                    onClick={() => toggleModule(moduleKey)}
                    className="flex items-center justify-between w-full px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{module?.icon || '📚'}</span>
                      <div>
                        <h2 className="font-semibold text-gray-900 dark:text-white">
                          {module?.label || moduleKey}
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {module?.description || ''} • {moduleCompleted}/{moduleArticles.length} lessons
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {moduleCompleted}/{moduleArticles.length}
                      </span>
                      {expandedModule === moduleKey ? (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                  </button>

                  {expandedModule === moduleKey && (
                    <div className="px-6 pb-4 space-y-2">
                      {moduleArticles.map((article, idx) => {
                        const completed = isComplete(article.id);
                        return (
                          <div
                            key={article.id}
                            className="border-b border-gray-100 dark:border-gray-700 last:border-0 pb-2 last:pb-0"
                          >
                            <button
                              onClick={() => toggleLesson(idx)}
                              className="flex items-center justify-between w-full py-2 text-sm hover:text-blue-600 dark:hover:text-blue-400 transition"
                            >
                              <span className="flex items-center gap-2">
                                {completed ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                  <span className="w-4 h-4 text-gray-400">📄</span>
                                )}
                                <span className={completed ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}>
                                  {article.title}
                                </span>
                              </span>
                              <span className="text-xs text-gray-400">Read</span>
                            </button>
                            {expandedLesson === idx && (
                              <div className="mt-2 pl-6 text-gray-700 dark:text-gray-300 text-sm space-y-2">
                                <div
                                  className="prose prose-sm dark:prose-invert max-w-none"
                                  dangerouslySetInnerHTML={{ __html: article.content }}
                                />
                                {!completed && (
                                  <button
                                    onClick={() => markComplete(article.id)}
                                    className="mt-2 px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded transition"
                                  >
                                    Mark as Complete ✅
                                  </button>
                                )}
                                {completed && (
                                  <span className="text-xs text-green-500 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" /> Completed
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Daily Tip */}
        {!searchTerm && (
          <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-800 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">💡 Daily Growth Tip</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Commenting on videos in your niche within the first hour of upload can boost your visibility by up to 40%. 
                Be genuine and add value!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResourceHub;