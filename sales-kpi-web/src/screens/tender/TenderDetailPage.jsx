import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../api";
import TenderChatWidget from "./TenderChatWidget";
import {
  IconBack,
  IconCalendar,
  IconChecklist,
  IconClock,
  IconCopy,
  IconDoc,
  IconDownload,
  IconFolder,
  IconGauge,
  IconMoney,
  IconPin,
  IconPrint,
  IconScale,
  IconShield,
  IconSparkle,
  IconUser,
  IconWarning,
} from "./TenderIcons";
import {
  buildDisplayDocument,
  buildTenderDownloadUrl,
  confidencePercent,
  describeCountdown,
  daysUntil,
  formatDate,
  formatDayMonth,
  formatFileSize,
  hasValue,
  riskMeta,
} from "./tenderShared";
import "./tender.css";

const EMAIL_PATTERN = /([\w.+-]+@[\w-]+\.[\w.-]+)/g;

function Chip({ label, value }) {
  if (!hasValue(value)) return null;
  return (
    <span className="tender-chip">
      {label && <span className="tender-chip__label">{label}</span>}
      {value}
    </span>
  );
}

function KpiTile({ icon, label, value, foot, footTone, alert }) {
  return (
    <div className={`tender-kpi ${alert ? "tender-kpi--alert" : ""}`}>
      <div className="tender-kpi__label">
        {icon}
        {label}
      </div>
      <div className={`tender-kpi__value ${hasValue(value) ? "" : "tender-kpi__value--empty"}`}>
        {hasValue(value) ? value : "Not stated"}
      </div>
      {foot && <div className={`tender-kpi__foot tender-kpi__foot--${footTone || "safe"}`}>{foot}</div>}
    </div>
  );
}

function SectionCard({ icon, title, count, action, children }) {
  return (
    <div className="tender-card">
      <div className="tender-card__head">
        <h3 className="tender-card__title">
          <span className="tender-card__icon">{icon}</span>
          {title}
        </h3>
        <div className="d-flex align-items-center gap-2">
          {count != null && <span className="tender-card__count">{count}</span>}
          {action}
        </div>
      </div>
      <div className="tender-card__body">{children}</div>
    </div>
  );
}

function Fact({ label, value }) {
  if (!hasValue(value)) return null;
  return (
    <div className="tender-fact">
      <div className="tender-fact__label">{label}</div>
      <div className="tender-fact__value">{value}</div>
    </div>
  );
}

function BulletList({ items, emptyText }) {
  if (!hasValue(items)) {
    return <div className="tender-empty">{emptyText}</div>;
  }
  return (
    <ul className="tender-list">
      {items.map((item, index) => (
        <li key={`${index}-${String(item).slice(0, 24)}`}>{item}</li>
      ))}
    </ul>
  );
}

function ContactText({ text }) {
  const parts = String(text).split(EMAIL_PATTERN);
  return (
    <span>
      {parts.map((part, index) =>
        part.includes("@") && !part.includes(" ") ? (
          <a key={`mail-${index}`} href={`mailto:${part}`}>
            {part}
          </a>
        ) : (
          <React.Fragment key={`txt-${index}`}>{part}</React.Fragment>
        )
      )}
    </span>
  );
}

function buildTimeline(document) {
  const entries = [
    { label: "Pre-bid meeting", raw: document.preBidMeetingDate },
    { label: "Submission deadline", raw: document.submissionDeadline },
    { label: "Bid opening", raw: document.bidOpeningDate },
    ...(document.importantDates || []).map((item) => ({ label: item, raw: item, freeform: true })),
  ].filter((entry) => hasValue(entry.raw));

  const withDays = entries.map((entry) => ({ ...entry, days: daysUntil(entry.raw) }));
  const dated = withDays.filter((entry) => entry.days != null).sort((a, b) => a.days - b.days);
  const undated = withDays.filter((entry) => entry.days == null);
  const nextIndex = dated.findIndex((entry) => entry.days >= 0);

  return [
    ...dated.map((entry, index) => ({
      ...entry,
      isNext: index === nextIndex,
      isDone: entry.days < 0,
    })),
    ...undated,
  ];
}

function buildKeyFactsText(document, job) {
  const lines = [
    `Tender: ${document.tenderTitle || document.relativePath || "n/a"}`,
    `Tender ID: ${document.tenderId || "n/a"}`,
    `Issuing authority: ${document.issuingAuthority || "n/a"}`,
    `Submission deadline: ${document.submissionDeadline || "n/a"}`,
    `Bid opening: ${document.bidOpeningDate || "n/a"}`,
    `Estimated value: ${[document.estimatedValue, document.currency].filter(Boolean).join(" ") || "n/a"}`,
    `EMD: ${document.emdAmount || "n/a"}`,
    `Tender fee: ${document.tenderFee || "n/a"}`,
    `Work location: ${document.workLocation || "n/a"}`,
    `Risk level: ${document.riskLevel || "n/a"}`,
    `Analysed: ${formatDate(job?.updatedAt || job?.createdAt)}`,
  ];
  if (document.summary) {
    lines.push("", `Summary: ${document.summary}`);
  }
  return lines.join("\n");
}

export default function TenderDetailPage() {
  const { jobId, docIndex } = useParams();
  const [payload, setPayload] = useState(null);
  const [sourceFiles, setSourceFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [checked, setChecked] = useState({});
  const [copied, setCopied] = useState(false);

  const checklistKey = `tender-checklist:${jobId}:${docIndex}`;

  useEffect(() => {
    const load = async () => {
      try {
        const [documentsResponse, sourceFilesResponse] = await Promise.all([
          api.get(`/tender-jobs/${jobId}/documents`),
          api.get(`/tender-jobs/${jobId}/source-files`).catch(() => ({ data: { sourceFiles: [] } })),
        ]);
        setPayload(documentsResponse.data);
        setSourceFiles(sourceFilesResponse.data?.sourceFiles || []);
        setError("");
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Failed to load tender analysis.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [jobId]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(checklistKey);
      setChecked(stored ? JSON.parse(stored) : {});
    } catch {
      setChecked({});
    }
  }, [checklistKey]);

  const job = payload?.job;
  const documents = useMemo(() => payload?.documents || [], [payload]);
  const skippedDocuments = payload?.skippedDocuments || [];
  const document = documents[Number(docIndex)];
  const displayDocument = useMemo(
    () => buildDisplayDocument(document, documents),
    [document, documents]
  );

  const timeline = useMemo(
    () => (displayDocument ? buildTimeline(displayDocument) : []),
    [displayDocument]
  );

  if (loading) {
    return (
      <div className="container py-5 text-center text-muted">
        <div className="spinner-border text-primary mb-3" role="status" />
        <div>Loading tender analysis...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  if (!document || !displayDocument) {
    return (
      <div className="container py-4">
        <div className="alert alert-warning">Tender analysis record not found.</div>
      </div>
    );
  }

  const risk = riskMeta(displayDocument.riskLevel || document.riskLevel);
  const confidence = confidencePercent(document.confidence);
  const countdown = describeCountdown(displayDocument.submissionDeadline);
  const requiredDocuments = displayDocument.requiredDocuments || [];
  const doneCount = requiredDocuments.filter((_, index) => checked[index]).length;
  const donePercent = requiredDocuments.length
    ? Math.round((doneCount / requiredDocuments.length) * 100)
    : 0;
  const criteriaCount =
    (document.technicalCriteria || []).length +
    (document.legalCriteria || []).length +
    (displayDocument.financialCriteria || []).length +
    (document.complianceRequirements || []).length;
  const zipUrl = `${api.defaults.baseURL}/tender-jobs/${jobId}/source-files.zip`;

  const toggleChecked = (index) => {
    setChecked((prev) => {
      const next = { ...prev, [index]: !prev[index] };
      try {
        window.localStorage.setItem(checklistKey, JSON.stringify(next));
      } catch {
        /* storage unavailable - checklist stays in memory only */
      }
      return next;
    });
  };

  const copyKeyFacts = async () => {
    try {
      await navigator.clipboard.writeText(buildKeyFactsText(displayDocument, job));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="container-fluid px-0 tender-page">
      {/* ---------- Header ---------- */}
      <header className="tender-hero mb-4">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 position-relative">
          <div className="flex-grow-1" style={{ minWidth: 260 }}>
            <div className="tender-hero__crumbs">
              <Link to="/tender">Tender Dashboard</Link> / Analysed Tender
            </div>
            <h1 className="tender-hero__title">
              {displayDocument.tenderTitle || document.relativePath || "Tender Analysis"}
            </h1>
            <div className="d-flex flex-wrap gap-2">
              <Chip label="ID" value={displayDocument.tenderId} />
              <Chip label="Authority" value={displayDocument.issuingAuthority} />
              <Chip label="Type" value={document.documentKind} />
              <Chip label="Method" value={displayDocument.procurementMethod} />
              <Chip label="Location" value={displayDocument.workLocation} />
            </div>
          </div>

          <div className="text-end" style={{ minWidth: 210 }}>
            <span className={`tender-risk tender-risk--${risk.tone}`}>
              <span className="tender-risk__dot" />
              {risk.tone === "unknown" ? risk.label : `${risk.label} risk`}
            </span>
            {confidence != null && (
              <div className="mt-3 text-start">
                <div className="d-flex justify-content-between small mb-1" style={{ opacity: 0.85 }}>
                  <span>Extraction confidence</span>
                  <span className="fw-bold">{confidence}%</span>
                </div>
                <div className="tender-confidence__track">
                  <div className="tender-confidence__fill" style={{ width: `${confidence}%` }} />
                </div>
              </div>
            )}
            <div className="small mt-3" style={{ opacity: 0.75 }}>
              Analysed {formatDate(job?.updatedAt || job?.createdAt)}
            </div>
          </div>
        </div>

        <div className="tender-hero__actions d-flex flex-wrap gap-2 mt-4 position-relative tender-no-print">
          <button type="button" className="btn btn-light btn-sm d-inline-flex align-items-center gap-2" onClick={() => setChatOpen(true)}>
            <IconSparkle size={16} /> Ask AI about this tender
          </button>
          <Link to="/tender" className="btn btn-ghost btn-sm d-inline-flex align-items-center gap-2">
            <IconBack size={16} /> Dashboard
          </Link>
          <button type="button" className="btn btn-ghost btn-sm d-inline-flex align-items-center gap-2" onClick={copyKeyFacts}>
            <IconCopy size={16} /> {copied ? "Copied" : "Copy key facts"}
          </button>
          <button type="button" className="btn btn-ghost btn-sm d-inline-flex align-items-center gap-2" onClick={() => window.print()}>
            <IconPrint size={16} /> Print / PDF
          </button>
          <a href={zipUrl} className="btn btn-ghost btn-sm d-inline-flex align-items-center gap-2" target="_blank" rel="noreferrer">
            <IconDownload size={16} /> Source ZIP
          </a>
          {job?.resultFiles?.documentsJsonPath && (
            <a
              href={buildTenderDownloadUrl(job.id, job.resultFiles.documentsJsonPath)}
              className="btn btn-ghost btn-sm d-inline-flex align-items-center gap-2"
              target="_blank"
              rel="noreferrer"
            >
              <IconDownload size={16} /> JSON
            </a>
          )}
        </div>
      </header>

      {/* ---------- Deadline strip ---------- */}
      {countdown && countdown.tone !== "safe" && (
        <div className={`tender-alert tender-alert--${countdown.tone} mb-4`}>
          <IconWarning size={20} />
          <div>
            <strong>{countdown.label}.</strong>{" "}
            {countdown.tone === "past"
              ? "The submission window recorded in this tender set has already closed."
              : `Submission closes on ${formatDayMonth(displayDocument.submissionDeadline) || displayDocument.submissionDeadline}. Confirm bid readiness with the team.`}
          </div>
        </div>
      )}

      {/* ---------- KPI row ---------- */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3 col-xl">
          <KpiTile
            icon={<IconClock size={15} />}
            label="Submission deadline"
            value={displayDocument.submissionDeadline}
            foot={countdown?.label}
            footTone={countdown?.tone}
            alert={countdown?.tone === "urgent"}
          />
        </div>
        <div className="col-6 col-lg-3 col-xl">
          <KpiTile icon={<IconCalendar size={15} />} label="Bid opening" value={displayDocument.bidOpeningDate} />
        </div>
        <div className="col-6 col-lg-3 col-xl">
          <KpiTile
            icon={<IconMoney size={15} />}
            label="Estimated value"
            value={[displayDocument.estimatedValue, displayDocument.currency].filter(Boolean).join(" ")}
          />
        </div>
        <div className="col-6 col-lg-3 col-xl">
          <KpiTile icon={<IconShield size={15} />} label="EMD amount" value={displayDocument.emdAmount} />
        </div>
        <div className="col-6 col-lg-3 col-xl">
          <KpiTile icon={<IconDoc size={15} />} label="Tender fee" value={displayDocument.tenderFee} />
        </div>
        <div className="col-6 col-lg-3 col-xl">
          <KpiTile icon={<IconGauge size={15} />} label="Bid validity" value={displayDocument.bidValidity} />
        </div>
      </div>

      <div className="row g-4">
        {/* ---------- Main column ---------- */}
        <div className="col-xl-8">
          <div className="row g-4">
            <div className="col-12">
              <SectionCard icon={<IconDoc size={16} />} title="Executive Summary">
                {hasValue(document.summary) ? (
                  <div className="tender-summary tender-summary__quote">{document.summary}</div>
                ) : (
                  <div className="tender-empty">No summary was extracted for this document.</div>
                )}
                <div className="mt-3">
                  <Fact label="Eligibility overview" value={document.eligibilityOverview} />
                </div>
                {hasValue(document.notes) && (
                  <div className="tender-fact">
                    <div className="tender-fact__label">Analyst notes</div>
                    <BulletList items={document.notes} />
                  </div>
                )}
              </SectionCard>
            </div>

            <div className="col-12">
              <SectionCard
                icon={<IconCalendar size={16} />}
                title="Key Dates & Milestones"
                count={timeline.length ? `${timeline.length} dates` : null}
              >
                {timeline.length === 0 ? (
                  <div className="tender-empty">No dates were found in this document.</div>
                ) : (
                  <ul className="tender-timeline">
                    {timeline.map((entry, index) => (
                      <li
                        key={`${entry.label}-${index}`}
                        className={entry.isNext ? "is-next" : entry.isDone ? "is-done" : ""}
                      >
                        <div className="tender-timeline__label">
                          {entry.freeform ? entry.label : `${entry.label}: ${entry.raw}`}
                          {entry.isNext && <span className="badge bg-danger ms-2">Next up</span>}
                        </div>
                        <div className="tender-timeline__meta">
                          {formatDayMonth(entry.raw) || "Date not machine-readable"}
                          {entry.days != null &&
                            ` - ${entry.days < 0 ? `${Math.abs(entry.days)} days ago` : entry.days === 0 ? "today" : `in ${entry.days} days`}`}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            </div>

            <div className="col-md-6">
              <SectionCard
                icon={<IconGauge size={16} />}
                title="Technical Criteria"
                count={(document.technicalCriteria || []).length || null}
              >
                <BulletList items={document.technicalCriteria} emptyText="No technical criteria extracted." />
              </SectionCard>
            </div>

            <div className="col-md-6">
              <SectionCard
                icon={<IconScale size={16} />}
                title="Legal Criteria"
                count={(document.legalCriteria || []).length || null}
              >
                <BulletList items={document.legalCriteria} emptyText="No legal criteria extracted." />
              </SectionCard>
            </div>

            <div className="col-md-6">
              <SectionCard
                icon={<IconMoney size={16} />}
                title="Financial Criteria"
                count={(displayDocument.financialCriteria || []).length || null}
              >
                <BulletList
                  items={displayDocument.financialCriteria}
                  emptyText="No financial criteria extracted."
                />
              </SectionCard>
            </div>

            <div className="col-md-6">
              <SectionCard
                icon={<IconShield size={16} />}
                title="Compliance Requirements"
                count={(document.complianceRequirements || []).length || null}
              >
                <BulletList
                  items={document.complianceRequirements}
                  emptyText="No compliance requirements extracted."
                />
              </SectionCard>
            </div>

            <div className="col-12">
              <SectionCard
                icon={<IconChecklist size={16} />}
                title="Submission Checklist"
                count={requiredDocuments.length ? `${doneCount}/${requiredDocuments.length} ready` : null}
              >
                {requiredDocuments.length === 0 ? (
                  <div className="tender-empty">No required-document list was extracted.</div>
                ) : (
                  <>
                    <div className="d-flex align-items-center gap-3 mb-3 tender-checklist-progress">
                      <div className="tender-progress flex-grow-1">
                        <div className="tender-progress__fill" style={{ width: `${donePercent}%` }} />
                      </div>
                      <span className="small fw-semibold text-muted">{donePercent}%</span>
                    </div>
                    <div className="row g-1 tender-checklist-grid">
                      {requiredDocuments.map((item, index) => (
                        <div className="col-lg-6 tender-checklist-grid__item" key={`req-${index}`}>
                          <label className={`tender-check ${checked[index] ? "is-checked" : ""}`}>
                            <input
                              type="checkbox"
                              checked={Boolean(checked[index])}
                              onChange={() => toggleChecked(index)}
                            />
                            <span className="tender-check__text">{item}</span>
                          </label>
                        </div>
                      ))}
                    </div>
                    <div className="text-muted small mt-2 tender-no-print">
                      Tick marks are saved in this browser so the bid team can track readiness.
                    </div>
                  </>
                )}
              </SectionCard>
            </div>

            <div className="col-md-6">
              <SectionCard
                icon={<IconMoney size={16} />}
                title="Payment Terms"
                count={(displayDocument.paymentTerms || []).length || null}
              >
                <BulletList
                  items={displayDocument.paymentTerms}
                  emptyText="No payment terms extracted."
                />
              </SectionCard>
            </div>

            <div className="col-md-6">
              <SectionCard
                icon={<IconWarning size={16} />}
                title="Penalties & Risks"
                count={(displayDocument.penalties || []).length || null}
              >
                <BulletList
                  items={displayDocument.penalties}
                  emptyText="No penalty clauses extracted."
                />
              </SectionCard>
            </div>

            <div className="col-12">
              <SectionCard
                icon={<IconUser size={16} />}
                title="Key Contacts"
                count={(displayDocument.contactDetails || []).length || null}
              >
                {hasValue(displayDocument.contactDetails) ? (
                  <div className="row g-2">
                    {displayDocument.contactDetails.map((contact, index) => (
                      <div className="col-lg-6" key={`contact-${index}`}>
                        <div className="tender-contact">
                          <span className="tender-contact__avatar">
                            {String(contact).trim().charAt(0).toUpperCase() || "?"}
                          </span>
                          <ContactText text={contact} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="tender-empty">No contact details were found in this document.</div>
                )}
              </SectionCard>
            </div>

            <div className="col-12 tender-no-print">
              <SectionCard
                icon={<IconFolder size={16} />}
                title="Source Tender Files"
                count={sourceFiles.length || null}
                action={
                  <a
                    href={zipUrl}
                    className="btn btn-sm btn-outline-primary tender-no-print"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download ZIP
                  </a>
                }
              >
                {sourceFiles.length === 0 ? (
                  <div className="tender-empty">
                    Source file links are not available yet. They appear once the tender documents are
                    synced to Cloudinary.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="tender-table">
                      <thead>
                        <tr>
                          <th>File</th>
                          <th>Storage</th>
                          <th>Size</th>
                          <th className="text-end tender-no-print">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sourceFiles.map((file) => (
                          <tr key={file.relativePath}>
                            <td className="fw-semibold">{file.relativePath}</td>
                            <td>
                              <span className="tender-badge-soft">{file.storage || "local"}</span>
                            </td>
                            <td>{formatFileSize(file.size)}</td>
                            <td className="text-end tender-no-print">
                              {file.url ? (
                                <a
                                  href={file.url}
                                  className="btn btn-sm btn-outline-primary"
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Download
                                </a>
                              ) : (
                                <span className="text-muted small">No cloud link</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            </div>

            <div className="col-12 tender-no-print">
              <SectionCard
                icon={<IconWarning size={16} />}
                title="Skipped Files"
                count={skippedDocuments.length || null}
              >
                {skippedDocuments.length === 0 ? (
                  <div className="tender-empty">All scanned source files produced an analysis record.</div>
                ) : (
                  <div className="table-responsive">
                    <table className="tender-table">
                      <thead>
                        <tr>
                          <th>File</th>
                          <th>Reason</th>
                          <th>Confidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {skippedDocuments.map((item) => (
                          <tr key={`${item.relativePath}-${item.reason}`}>
                            <td className="fw-semibold">{item.relativePath}</td>
                            <td>{item.reason || "Skipped"}</td>
                            <td>{item.confidence != null ? `${Math.round(Number(item.confidence) * 100)}%` : "n/a"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            </div>
          </div>
        </div>

        {/* ---------- Side column ---------- */}
        <div className="col-xl-4">
          <div className="tender-sticky d-flex flex-column gap-4">
            <SectionCard icon={<IconPin size={16} />} title="At a Glance">
              <div className="tender-glance__row">
                <span className="tender-glance__key">Tender ID</span>
                <span className="tender-glance__val">{displayDocument.tenderId || "Not stated"}</span>
              </div>
              <div className="tender-glance__row">
                <span className="tender-glance__key">Issuing authority</span>
                <span className="tender-glance__val">{displayDocument.issuingAuthority || "Not stated"}</span>
              </div>
              <div className="tender-glance__row">
                <span className="tender-glance__key">Procurement method</span>
                <span className="tender-glance__val">{displayDocument.procurementMethod || "Not stated"}</span>
              </div>
              <div className="tender-glance__row">
                <span className="tender-glance__key">Work location</span>
                <span className="tender-glance__val">{displayDocument.workLocation || "Not stated"}</span>
              </div>
              <div className="tender-glance__row">
                <span className="tender-glance__key">Criteria captured</span>
                <span className="tender-glance__val">{criteriaCount}</span>
              </div>
              <div className="tender-glance__row">
                <span className="tender-glance__key">Documents to submit</span>
                <span className="tender-glance__val">{requiredDocuments.length}</span>
              </div>
              <div className="tender-glance__row">
                <span className="tender-glance__key">Source document</span>
                <span className="tender-glance__val">{document.relativePath || "n/a"}</span>
              </div>
              <div className="tender-glance__row">
                <span className="tender-glance__key">Job ID</span>
                <span className="tender-glance__val small">{job?.id || "n/a"}</span>
              </div>
            </SectionCard>

            <div className="tender-ask-cta tender-no-print">
              <div className="d-flex align-items-center gap-2 mb-2">
                <IconSparkle size={20} />
                <span className="fw-bold">Tender Assistant</span>
              </div>
              <p className="small mb-3" style={{ opacity: 0.9 }}>
                Ask questions in plain language - deadlines, eligibility, EMD, penalties. Answers come
                only from this tender document.
              </p>
              <button type="button" className="btn btn-light btn-sm w-100" onClick={() => setChatOpen(true)}>
                Start asking
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Floating assistant ---------- */}
      {!chatOpen && (
        <button
          type="button"
          className="tender-chat-fab tender-no-print"
          onClick={() => setChatOpen(true)}
          aria-label="Open tender assistant"
        >
          <span className="tender-chat-fab__pulse" />
          <IconSparkle size={20} />
          <span>Ask AI</span>
        </button>
      )}

      <TenderChatWidget
        jobId={jobId}
        docIndex={docIndex}
        document={document}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={chatMessages}
        setMessages={setChatMessages}
      />
    </div>
  );
}
