import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import {
  IconCalendar,
  IconClock,
  IconGrid,
  IconMoney,
  IconPin,
  IconPlus,
  IconRefresh,
  IconRows,
  IconSearch,
  IconShield,
  IconStack,
  IconWarning,
} from "./TenderIcons";
import {
  buildDisplayDocument,
  condenseAmount,
  daysUntil,
  describeCountdown,
  formatDate,
  hasValue,
  riskMeta,
  truncate,
} from "./tenderShared";
import "./tender.css";

const SORT_OPTIONS = [
  { value: "deadline", label: "Deadline: soonest first" },
  { value: "recent", label: "Recently analysed" },
  { value: "name", label: "Tender name (A-Z)" },
  { value: "authority", label: "Issuing authority (A-Z)" },
];

function StatCard({ icon, tone, value, label }) {
  return (
    <div className="tender-stat">
      <span className={`tender-stat__icon tender-stat__icon--${tone}`}>{icon}</span>
      <div>
        <div className="tender-stat__value">{value}</div>
        <div className="tender-stat__label">{label}</div>
      </div>
    </div>
  );
}

function TileFact({ icon, label, value }) {
  return (
    <div>
      <div className="tender-tile__key">
        {icon}
        {label}
      </div>
      <div
        className={`tender-tile__val ${hasValue(value) ? "" : "tender-tile__val--empty"}`}
        title={hasValue(value) ? String(value) : undefined}
      >
        {hasValue(value) ? value : "Not stated"}
      </div>
    </div>
  );
}

function JobStatusBadge({ status }) {
  const tone =
    status === "SUCCEEDED"
      ? "bg-success"
      : status === "FAILED"
        ? "bg-danger"
        : status === "RUNNING"
          ? "bg-warning text-dark"
          : "bg-secondary";
  return <span className={`badge ${tone}`}>{status}</span>;
}

function TenderTile({ row }) {
  const countdown = describeCountdown(row.submissionDeadline);
  const risk = riskMeta(row.riskLevel);
  const tone = countdown?.tone || "past";

  return (
    <article className="tender-tile">
      <div className={`tender-tile__accent tender-tile__accent--${tone}`} />
      <div className="tender-tile__body">
        <div className="d-flex justify-content-between align-items-center gap-2">
          <span className={`tender-pill tender-pill--${countdown ? tone : "muted"}`}>
            <IconClock size={12} />
            {countdown ? countdown.label : "No deadline read"}
          </span>
          {risk.tone !== "unknown" && (
            <span className={`tender-pill tender-risk--${risk.tone}`}>{risk.label} risk</span>
          )}
        </div>

        <h3 className="tender-tile__title" title={row.tenderTitle}>
          {row.tenderTitle}
        </h3>

        <div className="tender-tile__authority" title={row.issuingAuthority}>
          {row.issuingAuthority}
        </div>

        {hasValue(row.workLocation) && (
          <div className="d-flex align-items-start gap-1 mt-2 small text-muted">
            <IconPin size={13} />
            <span title={row.workLocation}>{truncate(row.workLocation, 70)}</span>
          </div>
        )}

        <div className="tender-tile__grid">
          <TileFact icon={<IconClock size={12} />} label="Submission" value={row.submissionDeadline} />
          <TileFact icon={<IconCalendar size={12} />} label="Bid opening" value={row.bidOpeningDate} />
          <TileFact icon={<IconMoney size={12} />} label="Value" value={row.valueShort} />
          <TileFact icon={<IconShield size={12} />} label="EMD" value={row.emdShort} />
        </div>
      </div>

      <div className="tender-tile__foot">
        <div className="small text-muted" style={{ minWidth: 0 }}>
          <span className="tender-truncate" title={`${row.tenderId} - ${row.sourceFile}`}>
            {row.tenderId}
          </span>
        </div>
        <Link
          to={`/tender/${row.jobId}/analysis/${row.docIndex}`}
          className="btn btn-sm btn-primary flex-shrink-0"
        >
          Open analysis
        </Link>
      </div>
    </article>
  );
}

export default function TenderDashboard() {
  const [jobs, setJobs] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [sortBy, setSortBy] = useState("deadline");
  const [view, setView] = useState("cards");
  const [showJobs, setShowJobs] = useState(false);

  const loadJobs = async () => {
    try {
      const { data } = await api.get("/tender-jobs");
      const nextJobs = data.jobs || [];
      setJobs(nextJobs);
      const completedJobs = nextJobs.filter(
        (job) => job.status === "SUCCEEDED" && job.resultFiles?.documentsJsonPath
      );
      const responses = await Promise.all(
        completedJobs.map((job) =>
          api
            .get(`/tender-jobs/${job.id}/documents`)
            .then(({ data: detail }) => ({ job, documents: detail.documents || [] }))
            .catch(() => ({ job, documents: [] }))
        )
      );

      // Specs and annexures usually leave the headline fields blank, so every
      // document borrows missing values from the strongest document of its job.
      const nextRows = responses.flatMap(({ job, documents }) =>
        documents.map((doc, index) => {
          const merged = buildDisplayDocument(doc, documents) || doc;
          return {
            jobId: job.id,
            docIndex: index,
            tenderTitle: merged.tenderTitle || doc.relativePath || "Untitled Tender",
            tenderId: merged.tenderId || "No tender ID",
            issuingAuthority: merged.issuingAuthority || "Authority not stated",
            submissionDeadline: merged.submissionDeadline || "",
            bidOpeningDate: merged.bidOpeningDate || "",
            estimatedValue: merged.estimatedValue || "",
            valueShort: [condenseAmount(merged.estimatedValue), merged.currency]
              .filter(Boolean)
              .join(" "),
            emdShort: condenseAmount(merged.emdAmount) || "",
            workLocation: merged.workLocation || "",
            riskLevel: merged.riskLevel || doc.riskLevel || "",
            sourceFile: doc.relativePath || "",
            analysedAt: job.updatedAt || job.createdAt,
          };
        })
      );

      setRows(nextRows);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load analysed tenders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
    const timer = window.setInterval(loadJobs, 15000);
    return () => window.clearInterval(timer);
  }, []);

  const activeJobs = jobs.filter((job) => job.status === "RUNNING" || job.status === "QUEUED");
  const failedJobs = jobs.filter((job) => job.status === "FAILED");

  const stats = useMemo(() => {
    let closingSoon = 0;
    let closed = 0;
    let highRisk = 0;

    rows.forEach((row) => {
      const days = daysUntil(row.submissionDeadline);
      if (days != null && days >= 0 && days <= 7) closingSoon += 1;
      if (days != null && days < 0) closed += 1;
      if (riskMeta(row.riskLevel).tone === "high") highRisk += 1;
    });

    return { total: rows.length, closingSoon, closed, highRisk };
  }, [rows]);

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      if (riskFilter !== "all" && riskMeta(row.riskLevel).tone !== riskFilter) return false;
      if (!term) return true;
      return [row.tenderTitle, row.tenderId, row.issuingAuthority, row.workLocation, row.sourceFile]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });

    const sorted = [...filtered];
    if (sortBy === "deadline") {
      sorted.sort((a, b) => {
        const left = daysUntil(a.submissionDeadline);
        const right = daysUntil(b.submissionDeadline);
        // Tenders without a readable date sink below the live ones.
        if (left == null && right == null) return 0;
        if (left == null) return 1;
        if (right == null) return -1;
        if (left >= 0 && right < 0) return -1;
        if (right >= 0 && left < 0) return 1;
        return left >= 0 ? left - right : right - left;
      });
    } else if (sortBy === "recent") {
      sorted.sort((a, b) => new Date(b.analysedAt || 0) - new Date(a.analysedAt || 0));
    } else if (sortBy === "name") {
      sorted.sort((a, b) => a.tenderTitle.localeCompare(b.tenderTitle));
    } else if (sortBy === "authority") {
      sorted.sort((a, b) => a.issuingAuthority.localeCompare(b.issuingAuthority));
    }

    return sorted;
  }, [rows, search, riskFilter, sortBy]);

  return (
    <div className="container-fluid px-0 tender-page">
      {/* ---------- Header ---------- */}
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
        <div>
          <h2 className="mb-1 fw-bold">Tender Dashboard</h2>
          <p className="text-muted mb-0">
            Every analysed tender, its deadline position and the extracted commercials in one place.
          </p>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
            onClick={loadJobs}
          >
            <IconRefresh size={16} /> Refresh
          </button>
          <Link to="/tender/analyse" className="btn btn-primary d-inline-flex align-items-center gap-2">
            <IconPlus size={16} /> New analysis
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

      {/* ---------- Live job strips ---------- */}
      {activeJobs.map((job) => (
        <div key={job.id} className="tender-alert tender-alert--soon mb-3">
          <div className="spinner-border spinner-border-sm" role="status" />
          <div className="flex-grow-1">
            <strong>
              Analysing {job.processedFiles || 0} of {job.totalFiles || 0} files
            </strong>
            <div className="small">{job.currentFile || "Preparing documents..."}</div>
            <div className="tender-progress mt-2" style={{ maxWidth: 420 }}>
              <div
                className="tender-progress__fill"
                style={{
                  width: `${job.totalFiles ? Math.round(((job.processedFiles || 0) / job.totalFiles) * 100) : 5}%`,
                }}
              />
            </div>
          </div>
        </div>
      ))}

      {failedJobs.length > 0 && (
        <div className="tender-alert tender-alert--urgent mb-3">
          <IconWarning size={20} />
          <div>
            <strong>
              {failedJobs.length} tender job{failedJobs.length === 1 ? "" : "s"} failed.
            </strong>{" "}
            {failedJobs[0].error || "Open the job history below for details."}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-muted py-5">
          <div className="spinner-border text-primary mb-3" role="status" />
          <div>Loading analysed tenders...</div>
        </div>
      ) : (
        <>
          {/* ---------- Summary ---------- */}
          <div className="row g-3 mb-4">
            <div className="col-6 col-lg-3">
              <StatCard icon={<IconStack size={20} />} tone="blue" value={stats.total} label="Analysed tenders" />
            </div>
            <div className="col-6 col-lg-3">
              <StatCard
                icon={<IconClock size={20} />}
                tone="red"
                value={stats.closingSoon}
                label="Closing in 7 days"
              />
            </div>
            <div className="col-6 col-lg-3">
              <StatCard icon={<IconWarning size={20} />} tone="amber" value={stats.highRisk} label="High risk" />
            </div>
            <div className="col-6 col-lg-3">
              <StatCard
                icon={<IconCalendar size={20} />}
                tone="slate"
                value={stats.closed}
                label="Deadline passed"
              />
            </div>
          </div>

          {/* ---------- Board ---------- */}
          <div className="tender-card mb-4">
            <div className="tender-card__head flex-wrap">
              <h3 className="tender-card__title">
                <span className="tender-card__icon">
                  <IconStack size={16} />
                </span>
                Analysed Tenders
                <span className="tender-card__count ms-2">
                  {visibleRows.length}
                  {visibleRows.length !== rows.length ? ` of ${rows.length}` : ""}
                </span>
              </h3>

              <div className="tender-toolbar">
                <div className="tender-search">
                  <span className="tender-search__icon">
                    <IconSearch size={16} />
                  </span>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search name, ID, authority, location..."
                    aria-label="Search analysed tenders"
                  />
                </div>
                <select
                  className="tender-select"
                  value={riskFilter}
                  onChange={(event) => setRiskFilter(event.target.value)}
                  aria-label="Filter by risk level"
                >
                  <option value="all">All risk levels</option>
                  <option value="high">High risk</option>
                  <option value="medium">Medium risk</option>
                  <option value="low">Low risk</option>
                  <option value="unknown">Not assessed</option>
                </select>
                <select
                  className="tender-select"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  aria-label="Sort tenders"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="tender-viewtoggle">
                  <button
                    type="button"
                    className={view === "cards" ? "is-active" : ""}
                    onClick={() => setView("cards")}
                    title="Card view"
                    aria-label="Card view"
                  >
                    <IconGrid size={15} />
                  </button>
                  <button
                    type="button"
                    className={view === "table" ? "is-active" : ""}
                    onClick={() => setView("table")}
                    title="Table view"
                    aria-label="Table view"
                  >
                    <IconRows size={15} />
                  </button>
                </div>
              </div>
            </div>

            {visibleRows.length === 0 ? (
              <div className="tender-empty py-5">
                {rows.length === 0
                  ? "No completed analysed tenders yet. Running jobs appear at the top of this page."
                  : "No tenders match the current search or filter."}
              </div>
            ) : view === "cards" ? (
              <div className="tender-card__body">
                <div className="row g-3">
                  {visibleRows.map((row) => (
                    <div className="col-xl-4 col-md-6" key={`${row.jobId}-${row.docIndex}`}>
                      <TenderTile row={row} />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="tender-table tender-table--board">
                  <thead>
                    <tr>
                      <th>Tender</th>
                      <th>Authority</th>
                      <th>Submission</th>
                      <th>Bid opening</th>
                      <th>Value</th>
                      <th>EMD</th>
                      <th>Risk</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row) => {
                      const countdown = describeCountdown(row.submissionDeadline);
                      const risk = riskMeta(row.riskLevel);
                      return (
                        <tr key={`${row.jobId}-${row.docIndex}`}>
                          <td>
                            <div className="tender-table__title" title={row.tenderTitle}>
                              {row.tenderTitle}
                            </div>
                            <div className="small text-muted">{row.tenderId}</div>
                          </td>
                          <td title={row.issuingAuthority}>{truncate(row.issuingAuthority, 60)}</td>
                          <td>
                            <div>{row.submissionDeadline || <span className="text-muted">Not stated</span>}</div>
                            {countdown && (
                              <span className={`tender-pill tender-pill--${countdown.tone} mt-1`}>
                                {countdown.label}
                              </span>
                            )}
                          </td>
                          <td>{row.bidOpeningDate || <span className="text-muted">Not stated</span>}</td>
                          <td title={row.estimatedValue}>
                            {row.valueShort || <span className="text-muted">Not stated</span>}
                          </td>
                          <td>{row.emdShort || <span className="text-muted">Not stated</span>}</td>
                          <td>
                            <span className={`tender-pill tender-risk--${risk.tone}`}>{risk.label}</span>
                          </td>
                          <td className="text-end">
                            <Link
                              to={`/tender/${row.jobId}/analysis/${row.docIndex}`}
                              className="btn btn-sm btn-primary"
                            >
                              Open
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ---------- Job history ---------- */}
          <div className="tender-card">
            <div className="tender-card__head">
              <h3 className="tender-card__title">
                <span className="tender-card__icon">
                  <IconRefresh size={16} />
                </span>
                Processing History
                <span className="tender-card__count ms-2">{jobs.length} jobs</span>
              </h3>
              <button
                type="button"
                className="tender-jobs-toggle"
                onClick={() => setShowJobs((prev) => !prev)}
              >
                {showJobs ? "Hide" : "Show"} job history
              </button>
            </div>
            {showJobs &&
              (jobs.length === 0 ? (
                <div className="tender-empty">No tender jobs yet.</div>
              ) : (
                <div className="table-responsive">
                  <table className="tender-table">
                    <thead>
                      <tr>
                        <th>Job ID</th>
                        <th>Status</th>
                        <th>Files</th>
                        <th>Current file</th>
                        <th>Started</th>
                        <th>Updated</th>
                        <th>Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map((job) => (
                        <tr key={job.id}>
                          <td className="small">{job.id}</td>
                          <td>
                            <JobStatusBadge status={job.status} />
                          </td>
                          <td>
                            {job.processedFiles || 0} / {job.totalFiles || 0}
                          </td>
                          <td className="small" title={job.currentFile}>
                            {truncate(job.currentFile, 40) || "n/a"}
                          </td>
                          <td className="small">{formatDate(job.createdAt)}</td>
                          <td className="small">{formatDate(job.updatedAt)}</td>
                          <td className="small text-danger" title={job.error}>
                            {truncate(job.error, 60) || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
