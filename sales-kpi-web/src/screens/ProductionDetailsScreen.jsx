import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import "../App.css";
import api from '../api';

// 👉 Milestone label helper
const titleize = (key = '') =>
  key.replace(/_/g, ' ')
     .replace(/\s+/g, ' ')
     .trim()
     .replace(/\w\S*/g, s => s.charAt(0).toUpperCase() + s.slice(1));

// 👉 Check completion
const isComplete = (m) => !!m?.date;

// (OPTIONAL) define a preferred order; unknown keys are appended after
const MILESTONE_ORDER = [
  'advance_received',
  'design_loan_charge_payment',
  'main_file_opening',
  'qap_wps_release',
  'component_ir_file',
  'bom_upload_release',
  'po_released_non_dm',
];

const human0 = (n) => (Number.isFinite(+n) ? +n : 0);

// ----- 5-day bucket helpers (use 1-5..26-30 like your sheet) -----
// ----- 5-day bucket helpers (auto adjust for 30/31) -----
function getBucketRanges(year, month) {  // 🔽 CHANGE HERE
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const ranges = ["1-5", "6-10", "11-15", "16-20", "21-25"];
  ranges.push(daysInMonth === 31 ? "26-31" : "26-30");
  return ranges;
}

function bucketLabelForDate(d, ranges) { // 🔽 CHANGE HERE
  const day = d.getDate();
  if (day <= 5) return "1-5";
  if (day <= 10) return "6-10";
  if (day <= 15) return "11-15";
  if (day <= 20) return "16-20";
  if (day <= 25) return "21-25";
  return ranges[ranges.length - 1]; // last bucket
}


// Build matrices from daily logs for CURRENT month:
// partsMatrix:  { [partName]:  { "1-5": n, "6-10": n, ... } }
// stagesMatrix: { [stageName]: { "1-5": n, "6-10": n, ... } }
function buildFiveDayMatrices(daily = [], BUCKET_RANGES, selectedMonth, selectedYear) {
  const partsMatrix = {};
  const stagesMatrix = {};

  for (const row of daily) {
    const d = new Date(row.date || row.createdAt || row.ts);
    if (d.getMonth() !== selectedMonth || d.getFullYear() !== selectedYear) continue;
    const bucket = bucketLabelForDate(d, BUCKET_RANGES);

    const pp = row.partsProduced || {};
    Object.entries(pp).forEach(([part, qty]) => {
      const q = human0(qty);
      if (!partsMatrix[part]) partsMatrix[part] = Object.fromEntries(BUCKET_RANGES.map(r => [r, 0]));
      partsMatrix[part][bucket] += q;
    });

    const sc = row.stagesCompleted || {};
    Object.entries(sc).forEach(([stage, qty]) => {
      const q = human0(qty);
      if (!stagesMatrix[stage]) stagesMatrix[stage] = Object.fromEntries(BUCKET_RANGES.map(r => [r, 0]));
      stagesMatrix[stage][bucket] += q;
    });
  }

  return { partsMatrix, stagesMatrix };
}

function buildDailyMatrices(daily = [], selectedMonth, selectedYear) {
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const dayLabels = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`);

  const partsMatrix = {};
  const stagesMatrix = {};

  for (const row of daily) {
    const d = new Date(row.date || row.createdAt || row.ts);
    if (d.getMonth() !== selectedMonth || d.getFullYear() !== selectedYear) continue;
    const label = `${d.getDate()}`;

    const pp = row.partsProduced || {};
    Object.entries(pp).forEach(([part, qty]) => {
      if (!partsMatrix[part]) partsMatrix[part] = Object.fromEntries(dayLabels.map(l => [l, 0]));
      partsMatrix[part][label] += human0(qty);
    });

    const sc = row.stagesCompleted || {};
    Object.entries(sc).forEach(([stage, qty]) => {
      if (!stagesMatrix[stage]) stagesMatrix[stage] = Object.fromEntries(dayLabels.map(l => [l, 0]));
      stagesMatrix[stage][label] += human0(qty);
    });
  }

  return { partsMatrix, stagesMatrix, dayLabels };
}

const ProgressBar = ({ value }) => {
  const v = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <div className="progress" role="progressbar" aria-valuenow={v} aria-valuemin="0" aria-valuemax="100">
      <div className="progress-bar" style={{ width: `${v}%` }} title={`${v}%`} />
    </div>
  );
};

export default function ProductionDetailsScreen() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Data
  const [project, setProject] = useState(null);     // order/enquiry basics
  const [planning, setPlanning] = useState(null);   // monthly target, PDI, etc.
  const [inventory, setInventory] = useState(null); // current live inventory
  const [stages, setStages] = useState([]);         // per-stage completion (overall)
  const [daily, setDaily] = useState([]);           // raw daily logs for the month
  const [milestones, setMilestones] = useState({});
  const [wagonConfig, setWagonConfig] = useState(null);



  // Derived summary
  const today = new Date();
const [selectedMonth, setSelectedMonth] = useState(today.getMonth()); // 0 = Jan
const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [showOverall, setShowOverall] = useState(false);
  const [trendMode, setTrendMode] = useState("bucket"); // can be "bucket" or "daily"
  const monthTarget = human0(planning?.monthlyTarget);
  const pulloutDone = human0(planning?.pulloutDone);
  const readyForPullout = human0(planning?.readyForPullout);
  const totalCompleted = pulloutDone + readyForPullout;
  const left = monthTarget > 0 ? Math.max(0, monthTarget - totalCompleted) : 0;
  const pct = monthTarget > 0 ? (100 * totalCompleted) / monthTarget : 0;

    // --- KPI Computations ---
  const workingDays = new Set(
    daily
      .filter(row => {
        const d = new Date(row.date || row.createdAt || row.ts);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      })
      .map(row => new Date(row.date || row.createdAt || row.ts).getDate())
  ).size; // count of unique active days in month

  const completed = pulloutDone + readyForPullout;
  const targetAchievedPct = monthTarget > 0 ? (completed / monthTarget) * 100 : 0;
  const avgDailyRate = workingDays > 0 ? completed / workingDays : 0;
  const remaining = monthTarget - completed;

  // estimate days needed at current rate
  const estDaysToFinish =
    avgDailyRate > 0 ? Math.ceil(remaining / avgDailyRate) : null;
  const estCompletionDate =
    estDaysToFinish !== null
      ? new Date(today.getFullYear(), today.getMonth(), today.getDate() + estDaysToFinish)
      : null;
  // --- Performance Confidence Tag ---
const confidence =
  avgDailyRate > 0 && remaining > 0
    ? targetAchievedPct >= 80
      ? "🟢 On Track"
      : targetAchievedPct >= 50
      ? "🟡 Moderate"
      : "🔴 Behind"
    : "—";


  // 🔽 NEW: calculate bucket ranges dynamically for current month
const monthName = new Date(selectedYear, selectedMonth).toLocaleString("default", {
  month: "long",
  year: "numeric",
});

const BUCKET_RANGES = useMemo(
  () => getBucketRanges(selectedYear, selectedMonth),
  [selectedYear, selectedMonth]
);


// 🔽 NEW: choose which matrix to build depending on trend mode
const { partsMatrix, stagesMatrix, dayLabels } = useMemo(() => {
  if (trendMode === "bucket") {
    const ranges = getBucketRanges(selectedYear, selectedMonth);
    return { ...buildFiveDayMatrices(daily, ranges, selectedMonth, selectedYear), dayLabels: ranges };
  } else {
    return buildDailyMatrices(daily, selectedMonth, selectedYear);
  }
}, [daily, trendMode, selectedMonth, selectedYear]);

const milestoneList = useMemo(() => {
  const obj = milestones || {};
  const keys = Object.keys(obj);

  // Stable order: known ones first, then the rest alphabetically
  const known = MILESTONE_ORDER.filter(k => keys.includes(k));
  const unknown = keys.filter(k => !MILESTONE_ORDER.includes(k)).sort();

  const ordered = [...known, ...unknown];

  return ordered.map(k => {
    const m = obj[k] || {};
    // The API already returns ISO yyyy-mm-dd for date fields in project-summary;
    // but if not, normalize here:
    const ymd = m?.date ? String(m.date).slice(0, 10) : '';
    return {
      key: k,
      label: titleize(k),
      date: ymd,
      notes: m?.notes || '',
      fileUrl: m?.fileUrl || null,
      fileName: m?.fileName || null,
      done: !!ymd,
    };
  });
}, [milestones]);


  // Your canonical row orders (match the sheet)
    // Dynamically derive Parts & Stages from wagon configuration
  const PART_ROWS = useMemo(() => {
    return wagonConfig?.parts?.map(p => p.name) || [];
  }, [wagonConfig]);

  const STAGE_ROWS = useMemo(() => {
    return wagonConfig?.stages?.map(s => s.name) || [];
  }, [wagonConfig]);


  useEffect(() => {
  let mounted = true;
  (async () => {
    try {
      setLoading(true);
      setError('');

      const [
        summaryRes,
        ordersRes,
        overallRes,
        planRes,
        invRes,
        stagesRes,
        dailyRes,
      ] = await Promise.all([
        api.get(`/enquiries/project-summary/${encodeURIComponent(projectId)}`, { params: { ts: Date.now() } }),
        api.get('/enquiries/orders'),
        api.get(`/production/projects/${encodeURIComponent(projectId)}/overall`),
        api.get(`/production/monthly-planning?projectId=${encodeURIComponent(projectId)}&month=${selectedMonth + 1}&year=${selectedYear}`),
        api.get(`/inventory/available/${encodeURIComponent(projectId)}`),
        api.get(`/production/stages/${encodeURIComponent(projectId)}?month=${selectedMonth + 1}&year=${selectedYear}`).catch(() => ({ data: [] })),
        api.get(`/production/daily?projectId=${encodeURIComponent(projectId)}&month=${selectedMonth + 1}&year=${selectedYear}`).catch(() => ({ data: [] })),
      ]);

      const ordersArray = Array.isArray(ordersRes.data?.orders) ? ordersRes.data.orders : [];
      const proj =
        ordersArray.find(
          (o) =>
            (o.projectId || '').toLowerCase().trim() ===
            (projectId || '').toLowerCase().trim()
        ) || null;

      const planningArray = Array.isArray(planRes.data)
        ? planRes.data
        : Array.isArray(planRes.data?.data)
        ? planRes.data.data
        : [];

      const plan =
        planningArray.find(
          (p) =>
            (p.projectId || '').toLowerCase().trim() ===
            (projectId || '').toLowerCase().trim()
        ) || null;

      if (mounted) {
        setMilestones(summaryRes?.data?.milestones || {});
        setProject({
          ...proj,
          overallCompleted: human0(overallRes?.data?.overallCompleted),
          overallPulloutDone: human0(overallRes?.data?.overallPulloutDone),
          totalOrdered: human0(overallRes?.data?.totalOrdered),
        });
        setPlanning(plan);
        setDaily(Array.isArray(dailyRes.data) ? dailyRes.data : []);

        // ✅ 1. Fetch Wagon Config FIRST
        let matchedConfig = null;
        if (proj?.wagonType) {
          try {
            const configRes = await api.get(
              `/wagons/${encodeURIComponent(proj.wagonType)}`
            );
            matchedConfig = configRes.data;
            setWagonConfig(matchedConfig);
          } catch (err) {
            console.error('Failed to load wagon config', err);
            setWagonConfig(null);
          }
        }

        // ✅ 2. Then filter inventory and stages based on fetched config
        const rawInventory = invRes.data || {};
        const rawStages = Array.isArray(stagesRes.data)
          ? stagesRes.data
          : [];

        let filteredInventory = rawInventory;
        let filteredStages = rawStages;

        if (matchedConfig?.parts?.length) {
          const validParts = matchedConfig.parts.map((p) =>
            p.name.toLowerCase()
          );
          filteredInventory = Object.fromEntries(
            Object.entries(rawInventory).filter(([part]) =>
              validParts.includes(part.toLowerCase())
            )
          );
        }

        if (matchedConfig?.stages?.length) {
          const validStages = matchedConfig.stages.map((s) =>
            s.name.toLowerCase()
          );
          filteredStages = rawStages.filter((s) =>
            validStages.includes(
              (s.stage || s.name || '').toLowerCase()
            )
          );
        }

        setInventory(filteredInventory);
        setStages(filteredStages);
      }
    } catch (e) {
      if (mounted)
        setError(
          e?.response?.data?.message || e.message || 'Failed to load'
        );
    } finally {
      if (mounted) setLoading(false);
    }
  })();

  return () => {
    mounted = false;
  };
}, [projectId, selectedMonth, selectedYear]);


  return (
    
    <div className="container mt-0 pt-4">
      {/* ===== Milestone Status ===== */}
<div className="card mb-3">
  <div className="card-body">
    <div className="d-flex justify-content-between align-items-center">
      <h5 className="fw-semibold m-0">🧭 Milestone Status</h5>
      <small className="text-muted">
        Click a completed milestone to open its file (if attached)
      </small>
    </div>

    {(!milestoneList || milestoneList.length === 0) ? (
      <div className="mt-3 text-muted">No milestones defined for this project.</div>
    ) : (
      <div className="mt-3 d-flex flex-wrap gap-2">
        {milestoneList.map(m => (
          <button
            key={m.key}
            className={`btn btn-sm ${m.done ? 'btn-success' : 'btn-outline-secondary'}`}
            style={{ borderRadius: '999px' }}
            title={m.notes ? `Notes: ${m.notes}` : (m.date ? `Done on ${m.date}` : 'Pending')}
            onClick={() => {
              if (m.done && m.fileUrl) window.open(m.fileUrl, '_blank', 'noopener,noreferrer');
            }}
          >
            <span className="me-2">{m.label}</span>
            {m.done ? (
              <span className="badge bg-light text-success border">{m.date}</span>
            ) : (
              <span className="badge bg-light text-muted border">Pending</span>
            )}
          </button>
        ))}
      </div>
    )}
  </div>
</div>

      <div className="d-flex justify-content-between align-items-center mb-3">

      
  <h3 className="fw-bold m-0">
    Production Details — {projectId}{" "}
    {!showOverall && (
      <span className="text-muted small">({monthName})</span>
    )}
  </h3>
  <div>
    <button
      className="btn btn-sm btn-outline-primary me-2"
      onClick={() => setShowOverall(!showOverall)}
    >
      {showOverall ? "Show Monthly Target" : "Show Overall Progress"}
    </button>
    <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>← Back</button>
  </div>
</div>


      {loading && <div className="alert alert-info">Loading…</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && (
        <>
          {/* ===== Summary ===== */}
          <div className="row g-3 mb-4">
  {!showOverall ? (
    <>
      
    

      {/* ===== Monthly Target View ===== */}
      <div className="col-md-3">
        <div className="card h-100">
          <div className="card-body">
            <div className="text-muted small">Client</div>
            <div className="fw-semibold">
              {(project?.clientName || '—')} <span className="text-muted">({project?.clientType || '—'})</span>
            </div>
            <div className="text-muted small mt-2">Wagon Type</div>
            <div className="fw-semibold">{project?.wagonType || '—'}</div>
          </div>
        </div>
      </div>

      <div className="col-md-3">
        <div className="card h-100">
          <div className="card-body">
            <div className="text-muted small">Monthly Target ({monthName})</div>
            <div className="display-6">{monthTarget || '—'}</div>
            <div className="mt-2"><ProgressBar value={pct} /></div>
            <div className="small text-muted mt-1">
              {monthTarget ? `${totalCompleted}/${monthTarget} (${Math.round(pct)}%)` : `${totalCompleted} (no target)`}
            </div>
          </div>
        </div>
      </div>

      <div className="col-md-3">
        <div className="card h-100">
          <div className="card-body">
            <div className="text-muted small">Completed</div>
            <div className="display-6">{totalCompleted}</div>
            <div className="text-muted small mt-2">Pullout Done</div>
            <div className="fw-semibold">{pulloutDone}</div>
            <div className="text-muted small mt-1">Ready for Pullout</div>
            <div className="fw-semibold">{readyForPullout}</div>
          </div>
        </div>
      </div>

      <div className="col-md-3">
        <div className="card h-100">
          <div className="card-body">
            <div className="text-muted small">Left (vs Target)</div>
            <div className="display-6">{left}</div>
            <div className="text-muted small mt-2">Project ID</div>
            <div className="fw-semibold">{projectId}</div>
          </div>
        </div>
      </div>
 {/* ===== KPI Summary ===== */}
<h5 className="fw-semibold border-bottom pb-2 mb-3">
  📈 Key Production KPIs
</h5>

<div className="row row-cols-1 row-cols-sm-2 row-cols-md-5 g-3 mb-4 text-center">



  {/* Target Achieved */}
<div className="col">
  <div className="card kpi-card h-100 shadow-sm d-flex align-items-center justify-content-center">
    <div className="card-body d-flex flex-column align-items-center justify-content-center text-center">
      <div className="text-muted small mb-2">Target Achieved</div>
      <div className="kpi-percentage fw-bold mb-1">
        {targetAchievedPct.toFixed(1)}%
      </div>
      <div className="progress-container w-75 mt-2">
        <ProgressBar value={targetAchievedPct} />
      </div>
    </div>
  </div>
</div>


  {/* Average Daily Rate */}
<div className="col">
  <div className="card kpi-card h-100 shadow-sm d-flex align-items-center justify-content-center">
    <div className="card-body d-flex flex-column align-items-center justify-content-center text-center">
      <div className="text-muted small mb-2">Average Daily Rate</div>
      <div className="kpi-rate fw-bold mb-1">
        {avgDailyRate.toFixed(2)}
      </div>
      <div className="kpi-subtext text-muted small">
        wagons/day over {workingDays} active days
      </div>
    </div>
  </div>
</div>


  {/* Estimated Completion */}
<div className="col">
  <div
    className={`card kpi-card h-100 shadow-sm d-flex align-items-center justify-content-center ${
      confidence.includes("🟢")
        ? "border-success"
        : confidence.includes("🟡")
        ? "border-warning"
        : confidence.includes("🔴")
        ? "border-danger"
        : ""
    }`}
  >
    <div className="card-body d-flex flex-column align-items-center justify-content-center text-center">
      <div className="text-muted small mb-2">Estimated Completion</div>

      {estCompletionDate ? (
        <>
          <div className="kpi-date display-6 fw-bold mb-1">
            {estCompletionDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </div>
          <div className="kpi-subtext text-muted small mb-1">
            in ~{estDaysToFinish} days
          </div>
          <div className="kpi-status fw-semibold">{confidence}</div>
        </>
      ) : (
        <div className="text-muted">—</div>
      )}
    </div>
  </div>
</div>

</div>


    </>
    
  ) : (
    <>
      {/* ===== Overall Project View ===== */}
      <div className="col-md-3">
        <div className="card h-100">
          <div className="card-body">
            <div className="text-muted small">Client</div>
            <div className="fw-semibold">
              {(project?.clientName || '—')} <span className="text-muted">({project?.clientType || '—'})</span>
            </div>
            <div className="text-muted small mt-2">Wagon Type</div>
            <div className="fw-semibold">{project?.wagonType || '—'}</div>
          </div>
        </div>
      </div>

      <div className="col-md-3">
        <div className="card h-100">
          <div className="card-body">
            <div className="text-muted small">Overall Completed</div>
            <div className="display-6">{human0(project?.overallCompleted)}</div>
            <div className="mt-2">
              <ProgressBar
                value={
                  project?.totalOrdered > 0
                    ? (100 * human0(project?.overallCompleted)) / human0(project?.totalOrdered)
                    : 0
                }
              />
            </div>
            <div className="small text-muted mt-1">
              {project?.totalOrdered
                ? `${human0(project?.overallCompleted)}/${human0(project?.totalOrdered)} (${Math.round(
                    (100 * human0(project?.overallCompleted)) / human0(project?.totalOrdered)
                  )}%)`
                : `${human0(project?.overallCompleted)} (no total)` }
            </div>
            <div className="text-muted small mt-2">Pullout Done</div>
            <div className="fw-semibold">{human0(project?.overallPulloutDone)}</div>
          </div>
        </div>
      </div>

      <div className="col-md-3">
        <div className="card h-100">
          <div className="card-body">
            <div className="text-muted small">Remaining</div>
            <div className="display-6">
              {Math.max(0, human0(project?.totalOrdered) - human0(project?.overallCompleted))}
            </div>
          </div>
        </div>
      </div>

      <div className="col-md-3">
        <div className="card h-100">
          <div className="card-body">
            <div className="text-muted small">Project ID</div>
            <div className="fw-semibold">{projectId}</div>
          </div>
        </div>
      </div>
    </>
  )}
</div>



          {/* ===== Inventory ===== */}
          <h5 className="fw-semibold border-bottom pb-2 mb-3">📦 Live Inventory</h5>
          <div className="table-responsive mb-4">
            <table className="table table-bordered table-hover align-middle text-center">
              <thead className="table-light">
                <tr>
                  <th>Part / Component</th>
                  <th>Available</th>
                  <th>Reserved</th>
                  <th>Min Level</th>
                  <th>Max Level</th>
                </tr>
              </thead>
              <tbody>
  {!inventory || Object.keys(inventory).length === 0 ? (
    <tr><td colSpan="5">No inventory data</td></tr>
  ) : (
    Object.entries(inventory).map(([part, info], i) => (
      <tr key={i}>
        <td className="text-start">{part}</td>
        <td>{human0(info?.available)}</td>
        <td>{human0(info?.reserved)}</td>
        <td>{human0(info?.minLevel)}</td>
        <td>{human0(info?.maxLevel)}</td>
      </tr>
    ))
  )}
</tbody>
            </table>
          </div>

          {/* ===== Stage-wise overall progress ===== */}
          <h5 className="fw-semibold border-bottom pb-2 mb-3">🛠️ Stage-wise Progress</h5>
          <div className="table-responsive mb-4">
            <table className="table table-bordered table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>Stage</th>
                  <th className="text-end">Completed</th>
                  <th className="text-end">Total</th>
                  <th className="text-end">Left</th>
                  <th style={{ width: 220 }}>Progress</th>
                </tr>
              </thead>
              <tbody>
                {(!stages || stages.length === 0) ? (
                  <tr><td colSpan="5" className="text-center">No stage data</td></tr>
                ) : (
                  stages.map((s, i) => {
                    const done = human0(s.completed);
                    const tot = human0(s.total);
                    const left = Math.max(0, tot - done);
                    const pct = tot > 0 ? (100 * done) / tot : 0;
                    return (
                      <tr key={i}>
                        <td className="text-start">{s.stage || s.name || `Stage ${i+1}`}</td>
                        <td className="text-end">{done}</td>
                        <td className="text-end">{tot}</td>
                        <td className="text-end">{left}</td>
                        <td><ProgressBar value={pct} /></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

         
          {/* ===== Trend (5-day / Daily) ===== */}

<div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
  <h5 className="fw-semibold m-0">
    🗓️ Production Trend {!showOverall && `(${monthName})`}
  </h5>
  <div className="d-flex">
    <select
      className="form-select form-select-sm me-2"
      value={selectedMonth}
      onChange={(e) => setSelectedMonth(Number(e.target.value))}
    >
      {Array.from({ length: 12 }, (_, i) => (
        <option key={i} value={i}>
          {new Date(2000, i).toLocaleString("default", { month: "long" })}
        </option>
      ))}
    </select>
    <select
      className="form-select form-select-sm"
      value={selectedYear}
      onChange={(e) => setSelectedYear(Number(e.target.value))}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const year = today.getFullYear() - 2 + i; // last 2, current, next 2
        return (
          <option key={year} value={year}>
            {year}
          </option>
        );
      })}
    </select>
  </div>
</div>

<div className="mb-2">
  <div className="btn-group">
    <button
      className={`btn btn-sm ${trendMode === "bucket" ? "btn-primary" : "btn-outline-primary"}`}
      onClick={() => setTrendMode("bucket")}
    >
      5-Day Buckets
    </button>
    <button
      className={`btn btn-sm ${trendMode === "daily" ? "btn-primary" : "btn-outline-primary"}`}
      onClick={() => setTrendMode("daily")}
    >
      Daily
    </button>
  </div>
</div>

<div className="table-responsive mb-4">
  <table className="table table-bordered table-hover align-middle text-center">
    <thead className="table-dark">
      <tr>
        <th>Date</th>
        {dayLabels.map(range => (
          <th key={range}>{range}</th>
        ))}
      </tr>
    </thead>
    <tbody>

      {!wagonConfig ? (
  <tr>
    <td colSpan={1 + dayLabels.length} className="text-center text-muted">
      Loading wagon configuration…
    </td>
  </tr>
) : (
  PART_ROWS.map(name => {
    const row = partsMatrix[name] || Object.fromEntries(dayLabels.map(r => [r, 0]));
    return (
      <tr key={name}>
        <td className="text-start">{name}</td>
        {dayLabels.map(range => <td key={range}>{row[range]}</td>)}
      </tr>
    );
  })
)}


      {/* Stages */}
      {!wagonConfig ? (
  <tr>
    <td colSpan={1 + dayLabels.length} className="text-center text-muted">
      Loading wagon configuration…
    </td>
  </tr>
) : (
  STAGE_ROWS.map(name => {
    const row = stagesMatrix[name] || Object.fromEntries(dayLabels.map(r => [r, 0]));
    return (
      <tr key={name}>
        <td className="text-start">{name}</td>
        {dayLabels.map(range => <td key={range}>{row[range]}</td>)}
      </tr>
    );
  })
)}

    </tbody>
  </table>
</div>
        </>
      )}
    </div>
  );
}
