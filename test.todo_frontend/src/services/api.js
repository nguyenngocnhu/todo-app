import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true // allow sending httpOnly refresh cookie
});

const refreshClient = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true
});

let accessToken = null;
let isRefreshing = false;
let subscribers = [];

function onAccessTokenFetched(token) {
  subscribers.forEach(cb => cb(token));
  subscribers = [];
}

function addSubscriber(cb) {
  subscribers.push(cb);
}

export function setAccessToken(token) {
  accessToken = token;
}

export async function doRefresh() {
  const r = await refreshClient.post('/auth/refresh');
  return r.data?.accessToken ?? null;
}

api.interceptors.request.use(config => {
  const url = config.url || '';
  if (url.endsWith('/auth/login') || url.endsWith('/auth/refresh')) return config;
  if (accessToken) config.headers['Authorization'] = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  res => {
    if (res.config.url?.endsWith('/auth/login')) {
      const token = res.data?.accessToken ?? null;
      if (token) {
        accessToken = token;
        setAccessToken(token);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('accessToken', token);
        }
      }
    }
    return res;
  },
  async err => {
    const originalRequest = err.config;
    if (!originalRequest) return Promise.reject(err);

    if (err.response?.status === 401 && !originalRequest._retry) {
      const reqUrl = originalRequest.url || '';
      if (reqUrl.endsWith('/auth/refresh')) {
        accessToken = null;
        onAccessTokenFetched(null);
        if (typeof globalThis !== 'undefined' && globalThis.location)
          globalThis.location.href = '/';
        return Promise.reject(err);
      }
      originalRequest._retry = true;
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          addSubscriber(token => {
            if (!token) return reject(new Error('No token after refresh'));
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;
      try {
        const r = await refreshClient.post('/auth/refresh');
        const newToken = r.data?.accessToken ?? null;
        accessToken = newToken;
        setAccessToken(newToken); 
        onAccessTokenFetched(newToken);
        if (newToken) {
          originalRequest.headers['Authorization'] = 'Bearer ' + newToken;
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('accessToken', newToken);
          }
        }
        return api(originalRequest);
      } catch (refreshErr) {
        accessToken = null;
        onAccessTokenFetched(null);
        if (typeof globalThis !== 'undefined' && globalThis.location)
          globalThis.location.href = '/';
        throw refreshErr;
      } finally {
        isRefreshing = false;
      }
    }

    throw err;
  }
);


export default api;
