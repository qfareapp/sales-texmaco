const fallbackBaseUrl =
  import.meta.env.MODE === "production"
    ? "https://sales-backend-covv.onrender.com"
    : "http://localhost:5000";

function normalizeBaseUrl(url) {
  return (url || fallbackBaseUrl).trim().replace(/\/+$/, "");
}

function ensureApiSuffix(url) {
  return url.endsWith("/api") ? url : `${url}/api`;
}

export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
export const API_ROOT = ensureApiSuffix(API_BASE_URL);
