/**
 * API Service
 * Centralised Axios client for backend communication
 *
 * @module services/api
 */

import axios from "axios";

const API_BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.error?.message || error.message;
    console.error(`[API Error] ${message}`);
    return Promise.reject(error);
  },
);

export const checkHealth = () => api.get("/health");

/**
 * Search for flights (Sprint 2)
 * @param {Object} searchParams - Search parameters
 * @returns {Promise<Object>} Flight search results
 */
export const searchFlights = (searchParams) =>
  api.post("/api/flights/search", searchParams);
