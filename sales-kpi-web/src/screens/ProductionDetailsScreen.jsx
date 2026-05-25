import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
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
const formatInventoryMetric = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Number.isInteger(num) ? num : Number(num.toFixed(3));
};
const inventoryUploadColumnMap = {
  sapcode: 'sapCode',
  sap: 'sapCode',
  itemdescription: 'description',
  description: 'description',
  newentry: 'newEntry',
  newstock: 'newEntry',
  quantity: 'newEntry',
  qty: 'newEntry',
  unit: 'unit'
};

const createInventoryEntry = () => ({
  sapCode: '',
  description: '',
  newEntry: '',
  unit: 'nos'
});

const inventoryUnitOptions = ['nos', 'set', 'Lts', 'Kgs'];

const normalizeInventoryHeader = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const isFilledInventoryEntry = (entry = {}) =>
  Boolean(
    entry.sapCode ||
    entry.description ||
    entry.newEntry !== '' ||
    entry.unit
  );

const buildConfiguredPartName = ({ sapCode, description }) => {
  const code = String(sapCode || '').trim();
  const desc = String(description || '').trim();
  if (code && desc) return `${code} - ${desc}`;
  return code || desc;
};

const splitInventoryPartLabel = (part = '', info = {}) => {
  const sapCode = String(info?.sapCode || '').trim();
  const description = String(info?.description || '').trim();

  if (sapCode || description) {
    return {
      sapCode: sapCode || '-',
      description: description || part || '-',
    };
  }

  const [maybeSapCode, ...rest] = String(part || '').split(' - ');
  if (rest.length) {
    return {
      sapCode: maybeSapCode || '-',
      description: rest.join(' - ') || '-',
    };
  }

  return {
    sapCode: '-',
    description: part || '-',
  };
};

const getConfiguredInventoryGroups = (wagonConfig) => {
  const makeItems = (items = []) =>
    items
      .map((item) => ({
        key: buildConfiguredPartName(item),
        sapCode: String(item?.sapCode || '').trim(),
        description: String(item?.description || '').trim(),
      }))
      .filter((item) => item.key);

  return [
    { label: 'DM Items', items: makeItems(wagonConfig?.dmItems || []) },
    { label: 'Non DM Items', items: makeItems(wagonConfig?.nonDmItems || []) },
  ];
};

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
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [collapsedInventoryGroups, setCollapsedInventoryGroups] = useState({
    'DM Items': true,
    'Non DM Items': true,
  });
  const [activeInventoryTab, setActiveInventoryTab] = useState('dm');
  const [dmInventoryEntries, setDmInventoryEntries] = useState([createInventoryEntry()]);
  const [nonDmInventoryEntries, setNonDmInventoryEntries] = useState([createInventoryEntry()]);
  const [dmInventoryUploadError, setDmInventoryUploadError] = useState('');
  const [nonDmInventoryUploadError, setNonDmInventoryUploadError] = useState('');
  const [inventorySaving, setInventorySaving] = useState(false);



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


  const PART_ROWS = useMemo(() => [], []);

  const STAGE_ROWS = useMemo(() => {
    const configuredStages = wagonConfig?.stages?.map((s) => s.name).filter(Boolean) || [];
    const loggedStages = Object.keys(stagesMatrix || {});
    return [
      ...configuredStages,
      ...loggedStages.filter((name) => !configuredStages.includes(name)),
    ];
  }, [wagonConfig, stagesMatrix]);

  const inventoryRequirementMap = useMemo(() => {
    const map = new Map();
    const allItems = [
      ...(wagonConfig?.dmItems || []),
      ...(wagonConfig?.nonDmItems || []),
    ];

    allItems.forEach((item) => {
      const partName = buildConfiguredPartName(item);
      if (!partName) return;

      const qtyPerWagon = Number(item?.qtyPerWagon || 0);
      const requiredNos = Number(item?.requiredNos || 0);
      map.set(partName, {
        requiredQty: qtyPerWagon,
        requiredNos,
        qtyPerWagon,
        uom: String(item?.uom || '').trim(),
      });
    });

    return map;
  }, [wagonConfig]);

  const inventoryGroups = useMemo(
    () => getConfiguredInventoryGroups(wagonConfig),
    [wagonConfig]
  );

  const toggleInventoryGroup = (label) => {
    setCollapsedInventoryGroups((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const filterInventoryByConfig = (rawInventory, config = wagonConfig) => {
    if (!config?.parts?.length) return rawInventory || {};
    const validParts = config.parts.map((p) => p.name.toLowerCase());
    return Object.fromEntries(
      Object.entries(rawInventory || {}).filter(([part]) =>
        validParts.includes(part.toLowerCase())
      )
    );
  };

  const resetInventoryModal = () => {
    setActiveInventoryTab('dm');
    setDmInventoryEntries([createInventoryEntry()]);
    setNonDmInventoryEntries([createInventoryEntry()]);
    setDmInventoryUploadError('');
    setNonDmInventoryUploadError('');
    setInventorySaving(false);
  };

  const openInventoryModal = () => {
    resetInventoryModal();
    setShowInventoryModal(true);
  };

  const closeInventoryModal = () => {
    setShowInventoryModal(false);
    resetInventoryModal();
  };

  const getInventoryStateForTab = (tab) => {
    if (tab === 'nonDm') {
      return {
        entries: nonDmInventoryEntries,
        setEntries: setNonDmInventoryEntries,
        uploadError: nonDmInventoryUploadError,
        setUploadError: setNonDmInventoryUploadError,
        configuredItems: wagonConfig?.nonDmItems || [],
      };
    }

    return {
      entries: dmInventoryEntries,
      setEntries: setDmInventoryEntries,
      uploadError: dmInventoryUploadError,
      setUploadError: setDmInventoryUploadError,
      configuredItems: wagonConfig?.dmItems || [],
    };
  };

  const handleInventoryEntryChange = (tab, index, key, value) => {
    const { setEntries } = getInventoryStateForTab(tab);
    setEntries((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const addInventoryEntry = (tab) => {
    const { setEntries } = getInventoryStateForTab(tab);
    setEntries((prev) => [...prev, createInventoryEntry()]);
  };

  const removeInventoryEntry = (tab, index) => {
    const { setEntries } = getInventoryStateForTab(tab);
    setEntries((prev) => {
      const next = prev.filter((_, currentIndex) => currentIndex !== index);
      return next.length ? next : [createInventoryEntry()];
    });
  };

  const handleInventoryUpload = async (tab, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const { setEntries, setUploadError } = getInventoryStateForTab(tab);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (!rows.length) {
        setUploadError('The uploaded sheet is empty.');
        return;
      }

      const parsedEntries = rows
        .map((row) => {
          const mapped = createInventoryEntry();
          Object.entries(row).forEach(([header, value]) => {
            const normalized = normalizeInventoryHeader(header);
            const targetKey = inventoryUploadColumnMap[normalized];
            if (!targetKey) return;
            mapped[targetKey] =
              targetKey === 'newEntry'
                ? value === '' || value === null || value === undefined
                  ? ''
                  : Number(value)
                : String(value || '').trim();
          });
          return mapped;
        })
        .filter((entry) => isFilledInventoryEntry(entry) && Number(entry.newEntry || 0) !== 0);

      if (!parsedEntries.length) {
        setUploadError('No valid rows found. Expected columns: SAP code, Item Description, New entry, Unit.');
        return;
      }

      setEntries(parsedEntries);
      setUploadError('');
    } catch (err) {
      console.error('Failed to parse inventory upload', err);
      setUploadError('Failed to read the Excel file. Please upload a valid .xlsx or .xls sheet.');
    } finally {
      event.target.value = '';
    }
  };

  const submitInventoryUpdate = async () => {
    const partEntries = [...dmInventoryEntries, ...nonDmInventoryEntries]
      .map((entry) => ({
        sapCode: String(entry.sapCode || '').trim(),
        description: String(entry.description || '').trim(),
        newEntry: Number(entry.newEntry || 0),
        unit: String(entry.unit || '').trim()
      }))
      .filter((entry) => (entry.sapCode || entry.description) && entry.newEntry !== 0);

    if (!projectId || !project?.wagonType) {
      alert('Project and wagon type are required to update inventory.');
      return;
    }

    if (!partEntries.length) {
      alert('Add at least one valid inventory row.');
      return;
    }

    setInventorySaving(true);
    setDmInventoryUploadError('');
    setNonDmInventoryUploadError('');

    try {
      await api.post('/inventory/add', {
        date: new Date().toISOString().split('T')[0],
        projectId,
        wagonType: project.wagonType,
        partEntries
      });

      const invRes = await api.get(`/inventory/available/${encodeURIComponent(projectId)}`);
      setInventory(filterInventoryByConfig(invRes.data));
      closeInventoryModal();
    } catch (err) {
      console.error('Failed to update inventory', err);
      alert(err?.response?.data?.message || 'Failed to update inventory');
    } finally {
      setInventorySaving(false);
    }
  };


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

        filteredInventory = filterInventoryByConfig(rawInventory, matchedConfig);

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
          <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
            <h5 className="fw-semibold m-0">📦 Live Inventory</h5>
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={openInventoryModal}
            >
              Update Inventory
            </button>
          </div>
          <div className="table-responsive mb-4">
            <table className="table table-bordered table-hover align-middle text-center">
              <thead className="table-light">
                <tr>
                  <th>SAP Code</th>
                  <th>Part / Component</th>
                  <th>Available</th>
                  <th>No. of Wagon Sets Possible</th>
                  <th>Component Shortage</th>
                  <th>Wagon Set Shortage</th>
                </tr>
              </thead>
              <tbody>
  {!inventory || Object.keys(inventory).length === 0 ? (
    <tr><td colSpan="6">No inventory data</td></tr>
  ) : (
    inventoryGroups.flatMap((group, groupIndex) => {
      if (!group.items.length) return [];
      const isCollapsed = Boolean(collapsedInventoryGroups[group.label]);

      const groupRows = [
        <tr key={`group-${groupIndex}`}>
          <td
            colSpan="6"
            className="fw-bold text-start table-light"
            style={{ cursor: 'pointer' }}
            onClick={() => toggleInventoryGroup(group.label)}
          >
            <div className="d-flex justify-content-between align-items-center">
              <span>{group.label}</span>
              <span>{isCollapsed ? 'Show' : 'Hide'}</span>
            </div>
          </td>
        </tr>
      ];

      if (isCollapsed) {
        return groupRows;
      }

      group.items.forEach((item, itemIndex) => {
        const info = inventory?.[item.key] || {};
        const available = human0(info?.available);
        const requirement = inventoryRequirementMap.get(item.key);
        const perWagonQty = human0(requirement?.qtyPerWagon);
        const requiredNos = human0(requirement?.requiredNos);
        const { sapCode, description } = splitInventoryPartLabel(item.key, {
          ...info,
          sapCode: item.sapCode || info?.sapCode,
          description: item.description || info?.description,
        });
        const wagonSetsPossible =
          perWagonQty > 0 ? available / perWagonQty : 0;
        const componentShortage =
          requiredNos > 0 ? Math.max(requiredNos - available, 0) : 0;
        const wagonSetShortage =
          perWagonQty > 0 ? componentShortage / perWagonQty : 0;

        groupRows.push(
          <tr key={`group-${groupIndex}-item-${itemIndex}`}>
            <td>{sapCode}</td>
            <td className="text-start">{description}</td>
            <td>{available}</td>
            <td>{formatInventoryMetric(wagonSetsPossible)}</td>
            <td>{componentShortage}</td>
            <td>{formatInventoryMetric(wagonSetShortage)}</td>
          </tr>
        );
      });

      return groupRows;
    })
  )}
</tbody>
            </table>
          </div>

          {showInventoryModal && (
            <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
              <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Update Inventory</h5>
                    <button className="btn-close" onClick={closeInventoryModal}></button>
                  </div>
                  <div className="modal-body">
                    {(() => {
                      const {
                        entries: activeEntries,
                        uploadError: activeUploadError,
                        configuredItems: activeConfiguredItems,
                      } = getInventoryStateForTab(activeInventoryTab);

                      return (
                        <>
                          <div className="d-flex gap-2 mb-3">
                            <button
                              className={`btn btn-sm ${activeInventoryTab === 'dm' ? 'btn-primary' : 'btn-outline-primary'}`}
                              onClick={() => setActiveInventoryTab('dm')}
                            >
                              DM Items
                            </button>
                            <button
                              className={`btn btn-sm ${activeInventoryTab === 'nonDm' ? 'btn-primary' : 'btn-outline-primary'}`}
                              onClick={() => setActiveInventoryTab('nonDm')}
                            >
                              Non DM Items
                            </button>
                          </div>

                          <div className="mb-2 text-muted small">
                            {activeInventoryTab === 'dm' ? 'Update DM item stock separately.' : 'Update Non DM item stock separately.'}
                          </div>

                          <div className="mb-3">
                            <input
                              type="file"
                              className="form-control"
                              accept=".xlsx,.xls"
                              onChange={(event) => handleInventoryUpload(activeInventoryTab, event)}
                            />
                            <div className="form-text">
                              Upload Excel columns: SAP code, Item Description, New entry, Unit
                            </div>
                            {activeUploadError && (
                              <div className="text-danger mt-2">{activeUploadError}</div>
                            )}
                          </div>

                          {!!activeConfiguredItems.length && (
                            <div className="alert alert-light border mb-3">
                              <div className="fw-semibold mb-1">Configured {activeInventoryTab === 'dm' ? 'DM' : 'Non DM'} items</div>
                              <div className="small text-muted">
                                {activeConfiguredItems
                                  .map((item) => buildConfiguredPartName(item))
                                  .filter(Boolean)
                                  .join(', ')}
                              </div>
                            </div>
                          )}

                          <div className="table-responsive">
                            <table className="table table-bordered align-middle">
                              <thead className="table-light">
                                <tr>
                                  <th>SAP Code</th>
                                  <th>Item Description</th>
                                  <th>New Entry</th>
                                  <th>Unit</th>
                                  <th>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activeEntries.map((entry, index) => (
                                  <tr key={`${activeInventoryTab}-${index}`}>
                                    <td>
                                      <input
                                        type="text"
                                        className="form-control"
                                        value={entry.sapCode}
                                        onChange={(e) => handleInventoryEntryChange(activeInventoryTab, index, 'sapCode', e.target.value)}
                                        placeholder="SAP code"
                                      />
                                    </td>
                                    <td>
                                      <input
                                        type="text"
                                        className="form-control"
                                        value={entry.description}
                                        onChange={(e) => handleInventoryEntryChange(activeInventoryTab, index, 'description', e.target.value)}
                                        placeholder="Item description"
                                      />
                                    </td>
                                    <td>
                                      <input
                                        type="number"
                                        className="form-control"
                                        min="0"
                                        value={entry.newEntry}
                                        onChange={(e) => handleInventoryEntryChange(activeInventoryTab, index, 'newEntry', e.target.value)}
                                        placeholder="0"
                                      />
                                    </td>
                                    <td>
                                      <select
                                        className="form-select"
                                        value={entry.unit}
                                        onChange={(e) => handleInventoryEntryChange(activeInventoryTab, index, 'unit', e.target.value)}
                                      >
                                        {inventoryUnitOptions.map((unit) => (
                                          <option key={unit} value={unit}>
                                            {unit}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="text-center">
                                      <button
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={() => removeInventoryEntry(activeInventoryTab, index)}
                                      >
                                        Remove
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => addInventoryEntry(activeInventoryTab)}
                          >
                            Add Row
                          </button>
                        </>
                      );
                    })()}
                  </div>
                  <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={closeInventoryModal}>
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={submitInventoryUpdate}
                      disabled={inventorySaving}
                    >
                      {inventorySaving ? 'Saving...' : 'Save Inventory'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== Stage-wise overall progress ===== */}
          <h5 className="fw-semibold border-bottom pb-2 mb-3">🛠️ Stage-wise Progress</h5>
          <div className="table-responsive mb-4">
	            <table className="table table-bordered table-hover align-middle">
	              <thead className="table-light">
	                <tr>
	                  <th>Stage No.</th>
	                  <th>Stage</th>
	                  <th className="text-end">Completed</th>
	                  <th className="text-end">Total</th>
	                  <th className="text-end">Left</th>
	                  <th style={{ width: 220 }}>Progress</th>
                </tr>
              </thead>
              <tbody>
	                {(!stages || stages.length === 0) ? (
	                  <tr><td colSpan="6" className="text-center">No stage data</td></tr>
	                ) : (
	                  stages.map((s, i) => {
	                    const done = human0(s.completed);
	                    const tot = human0(s.total);
	                    const left = Math.max(0, tot - done);
	                    const pct = tot > 0 ? (100 * done) / tot : 0;
	                    return (
	                      <tr key={i}>
	                        <td className="text-center">{s.stageNo || i + 1}</td>
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
        <th>Stage</th>
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
