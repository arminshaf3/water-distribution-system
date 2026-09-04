import axios, { InternalAxiosRequestConfig } from 'axios';

const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (window.location.pathname.includes('/water')) {
      return `${origin}/water/api/v1/`;
    }
    return `${origin}/api/v1/`;
  }
  return '/api/v1/';
};

const API = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

API.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const base = getBaseURL();
  config.baseURL = base;
  if (config.url) {
    config.url = config.url.replace(/^\/+/, '');
  }
  const token = localStorage.getItem('water_dist_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('water_dist_token');
      localStorage.removeItem('water_dist_user');
      if (!window.location.hash.includes('login')) {
        window.location.hash = '#/login';
      }
    }
    return Promise.reject(error);
  }
);

export default API;
