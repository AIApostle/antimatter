/**
 * Antimatter EDA Platform - API & WebSocket Configuration
 *
 * Supports seamless switching between local development environment and
 * production cloud deployment on Render (https://antimatter-3p10.onrender.com).
 */

export const PRODUCTION_API_ORIGIN = 'https://antimatter-3p10.onrender.com';

/**
 * Returns true if the client is currently running in a local/loopback environment.
 */
export const isLocalhost = (): boolean => {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname || '';
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.endsWith('.local')
  );
};

/**
 * Returns the resolved HTTP API base URL (e.g., http://localhost:8000/api or https://antimatter-3p10.onrender.com/api).
 */
export const getApiBase = (): string => {
  // 1. Explicit environment variable takes top precedence
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }

  // 2. If running locally in dev, default to local FastAPI backend
  if (isLocalhost()) {
    const host = window.location.hostname || 'localhost';
    return `http://${host}:8000/api`;
  }

  // 3. Default to production Render API endpoint
  return `${PRODUCTION_API_ORIGIN}/api`;
};

/**
 * Returns the resolved WebSocket base URL (e.g., ws://localhost:8000/api or wss://antimatter-3p10.onrender.com/api).
 */
export const getWsBase = (): string => {
  // 1. Explicit environment variable takes top precedence
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL.replace(/\/+$/, '');
  }

  // 2. Localhost WebSocket
  if (isLocalhost()) {
    const host = window.location.hostname || 'localhost';
    return `ws://${host}:8000/api`;
  }

  // 3. Production secure WebSocket (wss)
  return 'wss://antimatter-3p10.onrender.com/api';
};

export const API_BASE = getApiBase();
