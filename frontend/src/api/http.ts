import axios, { AxiosHeaders, InternalAxiosRequestConfig } from 'axios';

export const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL ||
  'https://kurumsal-takvim-panel.onrender.com/api';

export const http = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function setAuthToken(token: string | null) {
  if (token) {
    http.defaults.headers.common.Authorization = `Bearer ${token}`;
    (http.defaults.headers.common as any).authorization = `Bearer ${token}`;
  } else {
    delete (http.defaults.headers.common as any).Authorization;
    delete (http.defaults.headers.common as any).authorization;
  }
}

setAuthToken(localStorage.getItem('auth_token'));

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers = config.headers || {};
    if (config.headers instanceof AxiosHeaders) {
      config.headers.set('Authorization', `Bearer ${token}`);
      config.headers.set('authorization', `Bearer ${token}`);
    } else {
      (config.headers as any).Authorization = `Bearer ${token}`;
      (config.headers as any).authorization = `Bearer ${token}`;
    }
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      try {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_admin');
      } catch {
        // ignore
      }
      try {
        delete (http.defaults.headers.common as any).Authorization;
        delete (http.defaults.headers.common as any).authorization;
      } catch {
        // ignore
      }

      if (typeof window !== 'undefined' && window.location?.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  },
);
