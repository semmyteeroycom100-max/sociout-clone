import axios from 'axios';

// THIS IS THE CORRECT PRODUCTION URL
const API_URL = 'https://sociout-backend.onrender.com/api';

const API = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth endpoints
export const register = (data) => API.post('/auth/register', data);
export const login = (data) => API.post('/auth/login', data);
export const getMe = () => API.get('/users/me');

// YouTube endpoints
export const likeVideo = (videoId) => API.post('/youtube/like', { video_id: videoId });
export const subscribeToChannel = (videoId) => API.post('/youtube/subscribe', { video_id: videoId });
export const postComment = (videoId, text) => API.post('/youtube/comment', { video_id: videoId, text });

// Campaign endpoints
export const createCampaign = (data) => API.post('/campaigns/create', data);
export const startCampaign = (id) => API.post(`/campaigns/${id}/start`);
export const getCampaigns = () => API.get('/campaigns');
export const getCampaignStatus = (id) => API.get(`/campaigns/${id}/status`);

export default API;