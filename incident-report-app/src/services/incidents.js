import { API_BASE_URL } from "../config/api";

/* ── Fetch with timeout ── */
function fetchWithTimeout(url, options = {}, timeoutMs = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

async function parseApiResponse(response, fallbackMessage) {
  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();

  let data = null;
  if (contentType.includes("application/json")) {
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch (_) {
      data = null;
    }
  }

  if (!response.ok) {
    const messageFromJson =
      data?.errors?.join("\n") ||
      data?.message ||
      data?.status;

    const messageFromHtml = rawText.trim().startsWith("<")
      ? "Server returned an HTML error page. Check whether the live backend is deployed and reachable."
      : rawText.trim();

    throw new Error(messageFromJson || messageFromHtml || fallbackMessage);
  }

  if (!data) {
    throw new Error("Server returned an unexpected response format.");
  }

  return data;
}

/* ── Wake up Render backend before submitting ── */
async function ensureBackendAwake() {
  try {
    await fetchWithTimeout(`${API_BASE_URL}/health`, {}, 60000);
  } catch (_) {
    // ignore — if health check fails the submit will surface the error
  }
}

export async function submitIncidentReport(values) {
  // Wake Render out of sleep before the real submission
  await ensureBackendAwake();

  const formData = new FormData();

  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (key === "attachments") return;
    formData.append(key, value);
  });

  (values.attachments || []).forEach((file, index) => {
    formData.append("attachments", {
      uri: file.uri,
      name: file.name || `attachment-${index + 1}`,
      type: file.mimeType || file.type || "application/octet-stream",
    });
  });

  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/incidents`,
      { method: "POST", body: formData },
      60000
    );
    return parseApiResponse(response, "Submission failed");
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Request timed out. The server may be starting up — please try again in a moment.");
    }
    throw err;
  }
}

export async function getMyIncidentReports({ empId, mobileNumber }) {
  const params = new URLSearchParams();
  if (empId) params.append("empId", empId);
  if (mobileNumber) params.append("mobileNumber", mobileNumber);

  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/incidents?${params.toString()}`, {}, 60000);
    const data = await parseApiResponse(response, "Unable to load reports");
    return data.reports || [];
  } catch (err) {
    if (err.name === "AbortError") throw new Error("Request timed out. Please try again.");
    throw err;
  }
}

/* ── Simple in-memory cache for the full report list ── */
let _cache = null;
let _cacheAt = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds

export async function getAllIncidentReports({ forceRefresh = false } = {}) {
  const now = Date.now();
  if (!forceRefresh && _cache && now - _cacheAt < CACHE_TTL_MS) {
    return _cache;
  }

  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/incidents`, {}, 60000);
    const data = await parseApiResponse(response, "Unable to load dashboard reports");
    _cache = data.reports || [];
    _cacheAt = Date.now();
    return _cache;
  } catch (err) {
    if (err.name === "AbortError") throw new Error("Request timed out. Please try again.");
    throw err;
  }
}

export function invalidateReportsCache() {
  _cache = null;
  _cacheAt = 0;
}
