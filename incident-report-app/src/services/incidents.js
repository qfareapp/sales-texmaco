import { API_BASE_URL } from "../config/api";

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

export async function submitIncidentReport(values) {
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

  const response = await fetch(`${API_BASE_URL}/incidents`, {
    method: "POST",
    body: formData,
  });

  return parseApiResponse(response, "Submission failed");
}

export async function getMyIncidentReports({ empId, mobileNumber }) {
  const params = new URLSearchParams();
  if (empId) params.append("empId", empId);
  if (mobileNumber) params.append("mobileNumber", mobileNumber);

  const response = await fetch(`${API_BASE_URL}/incidents?${params.toString()}`);
  const data = await parseApiResponse(response, "Unable to load reports");

  return data.reports || [];
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

  const response = await fetch(`${API_BASE_URL}/incidents`);
  const data = await parseApiResponse(response, "Unable to load dashboard reports");

  _cache = data.reports || [];
  _cacheAt = Date.now();
  return _cache;
}

export function invalidateReportsCache() {
  _cache = null;
  _cacheAt = 0;
}
