import { API_ROOT } from "../../config/apiBase";

export function formatDate(value) {
  if (!value) return "n/a";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function buildTenderDownloadUrl(jobId, filePath) {
  const params = new URLSearchParams({ path: filePath });
  return `${API_ROOT}/tender-jobs/${jobId}/file?${params.toString()}`;
}

export function hasValue(value) {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  return String(value).trim() !== "";
}

const DMY_PATTERN = /(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/;
const ISO_PATTERN = /(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/;

/**
 * Tender dates arrive as free text ("30/06/2025 upto 15:00 hrs", "2025-06-30").
 * Returns a Date when a day can be identified, otherwise null.
 */
export function parseTenderDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;

  const iso = text.match(ISO_PATTERN);
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const dmy = text.match(DMY_PATTERN);
  if (dmy) {
    const year = Number(dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]);
    const date = new Date(year, Number(dmy[2]) - 1, Number(dmy[1]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDayMonth(value) {
  const date = parseTenderDate(value);
  if (!date) return null;
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

/** Whole days from today to the given tender date. Negative means the date has passed. */
export function daysUntil(value) {
  const date = parseTenderDate(value);
  if (!date) return null;
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((startOfTarget - startOfToday) / 86400000);
}

export function describeCountdown(value) {
  const days = daysUntil(value);
  if (days == null) return null;
  if (days < 0) return { label: `Closed ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`, tone: "past" };
  if (days === 0) return { label: "Closes today", tone: "urgent" };
  if (days === 1) return { label: "1 day left", tone: "urgent" };
  if (days <= 7) return { label: `${days} days left`, tone: "urgent" };
  if (days <= 21) return { label: `${days} days left`, tone: "soon" };
  return { label: `${days} days left`, tone: "safe" };
}

export function riskMeta(value) {
  const text = String(value || "").toLowerCase();
  if (!text || text === "n/a") return { label: "Not assessed", tone: "unknown" };
  if (text.includes("high") || text.includes("critical")) return { label: value, tone: "high" };
  if (text.includes("medium") || text.includes("moderate")) return { label: value, tone: "medium" };
  if (text.includes("low")) return { label: value, tone: "low" };
  return { label: value, tone: "unknown" };
}

/** Model confidence arrives as 0-1 or 0-100. Normalises to a whole percentage. */
export function confidencePercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const percent = numeric <= 1 ? numeric * 100 : numeric;
  return Math.max(0, Math.min(100, Math.round(percent)));
}

/**
 * A tender folder is analysed file by file, so specs and annexures often carry
 * blank headline fields while the NIT / tender document carries them. Rank the
 * documents of one job and borrow the first stated value.
 */
function scoreDocument(document) {
  const kind = String(document?.documentKind || "").toLowerCase();
  const title = String(document?.tenderTitle || "").toLowerCase();
  let score = Number(document?.confidence || 0);

  if (kind.includes("nit")) score += 50;
  if (kind.includes("tender document")) score += 40;
  if (kind.includes("tender")) score += 20;
  if (kind.includes("spec")) score -= 10;
  if (kind.includes("annex")) score -= 5;
  if (title.includes("tender")) score += 5;

  return score;
}

function chooseSiblingValue(documents, selectedDocument, key) {
  if (hasValue(selectedDocument?.[key])) {
    return selectedDocument[key];
  }

  const ranked = [...documents].sort((left, right) => scoreDocument(right) - scoreDocument(left));
  for (const item of ranked) {
    if (hasValue(item?.[key])) {
      return item[key];
    }
  }

  return selectedDocument?.[key];
}

function chooseSiblingList(documents, selectedDocument, key) {
  const selectedValues = Array.isArray(selectedDocument?.[key]) ? selectedDocument[key] : [];
  if (selectedValues.length > 0) {
    return selectedValues;
  }

  const merged = [];
  const seen = new Set();
  const ranked = [...documents].sort((left, right) => scoreDocument(right) - scoreDocument(left));

  for (const item of ranked) {
    const values = Array.isArray(item?.[key]) ? item[key] : [];
    for (const value of values) {
      const normalized = String(value || "").trim();
      if (!normalized) {
        continue;
      }
      const dedupeKey = normalized.toLowerCase();
      if (seen.has(dedupeKey)) {
        continue;
      }
      seen.add(dedupeKey);
      merged.push(normalized);
    }
  }

  return merged;
}

const SCALAR_FALLBACK_KEYS = [
  "tenderId",
  "tenderTitle",
  "issuingAuthority",
  "procurementMethod",
  "submissionDeadline",
  "bidOpeningDate",
  "preBidMeetingDate",
  "bidValidity",
  "workLocation",
  "currency",
  "estimatedValue",
  "emdAmount",
  "tenderFee",
];

const LIST_FALLBACK_KEYS = [
  "financialCriteria",
  "paymentTerms",
  "penalties",
  "contactDetails",
  "importantDates",
  "requiredDocuments",
];

export function buildDisplayDocument(selectedDocument, documents) {
  if (!selectedDocument) {
    return null;
  }

  const displayDocument = { ...selectedDocument };
  for (const key of SCALAR_FALLBACK_KEYS) {
    displayDocument[key] = chooseSiblingValue(documents || [], selectedDocument, key);
  }
  for (const key of LIST_FALLBACK_KEYS) {
    displayDocument[key] = chooseSiblingList(documents || [], selectedDocument, key);
  }

  return displayDocument;
}

/**
 * Extracted amounts read like "Rs. 47,10,56,000/- (Rupees Forty Seven Crores ...)
 * inclusive of GST". Keep the figure, drop the words-in-brackets tail.
 */
export function condenseAmount(value) {
  if (!hasValue(value)) return null;
  const text = String(value).trim();
  const beforeBracket = text.split("(")[0].trim().replace(/[,;]$/, "");
  if (beforeBracket.length >= 3 && /\d/.test(beforeBracket)) {
    return beforeBracket;
  }
  return text;
}

export function truncate(value, maxLength = 80) {
  if (!hasValue(value)) return null;
  const text = String(value).trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}...` : text;
}

export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return "n/a";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
