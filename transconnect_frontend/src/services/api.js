
import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach the current access token to API requests.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Manage simultaneous requests waiting for a token refresh.
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((request) => {
    if (error) {
      request.reject(error);
    } else {
      request.resolve(token);
    }
  });

  failedQueue = [];
};

// Automatically refresh expired access tokens.
api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.includes("auth/login/") ||
      originalRequest.url?.includes("auth/refresh/")
    ) {
      return Promise.reject(error);
    }

    // If another request is already refreshing, wait for it.
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${token}`;

        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = localStorage.getItem("refresh_token");

    if (!refreshToken) {
      isRefreshing = false;

      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("username");

      window.dispatchEvent(
        new Event("transconnect:session-expired")
      );

      return Promise.reject(error);
    }

    try {
      const refreshUrl = `${api.defaults.baseURL.replace(/\/$/, "")}/auth/refresh/`;

      const response = await axios.post(refreshUrl, {
        refresh: refreshToken,
      });

      const newAccessToken = response.data.access;

      localStorage.setItem("access_token", newAccessToken);

      processQueue(null, newAccessToken);

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      return api(originalRequest);

    } catch (refreshError) {
      processQueue(refreshError, null);

      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("username");

      window.dispatchEvent(
        new Event("transconnect:session-expired")
      );

      return Promise.reject(refreshError);

    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
