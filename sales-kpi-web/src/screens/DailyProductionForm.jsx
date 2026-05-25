import React, { useEffect, useMemo, useState } from 'react';
import DatePicker from 'react-datepicker';
import api from '../api';
import 'react-datepicker/dist/react-datepicker.css';

const normalizeInventory = (inv) => {
  if (!inv) return {};
  if (Array.isArray(inv)) {
    const obj = {};
    inv.forEach((it) => {
      const name = it.name ?? it.part ?? '';
      const qty = Number(it.qty ?? it.quantity ?? it.count ?? 0);
      if (name) obj[name] = qty;
    });
    return obj;
  }
  return Object.fromEntries(Object.entries(inv).map(([k, v]) => [k, Number(v) || 0]));
};

const normalizeStageKey = (value = '') =>
  String(value).trim().toLowerCase().replace(/[^a-z0-9]/g, '');

const getInventoryItemName = (item = {}) => {
  const sapCode = String(item?.sapCode || '').trim();
  const description = String(item?.description || '').trim();
  if (sapCode && description) return `${sapCode} - ${description}`;
  return sapCode || description;
};

/* ── Stepper control for stage count ── */
const StageCard = ({ name, index, value, onChange }) => {
  const count = value ?? 0;
  return (
    <div
      className="d-flex align-items-center justify-content-between gap-3 px-3 py-3 rounded-3"
      style={{
        background: count > 0 ? '#f0fdf4' : '#fff',
        border: `1px solid ${count > 0 ? '#86efac' : '#e2e8f0'}`,
        transition: 'all 0.15s'
      }}
    >
      <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ minWidth: 0 }}>
        <span
          className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
          style={{ width: 28, height: 28, fontSize: 12, fontWeight: 700,
            background: count > 0 ? '#16a34a' : '#e2e8f0',
            color: count > 0 ? '#fff' : '#64748b' }}
        >
          {index + 1}
        </span>
        <span className="fw-semibold text-truncate" style={{ fontSize: 14, color: '#1e293b' }}>{name}</span>
      </div>

      <div className="d-flex align-items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={() => onChange(name, Math.max(0, count - 1))}
          className="btn btn-sm d-flex align-items-center justify-content-center"
          style={{ width: 32, height: 32, padding: 0, borderRadius: 8,
            background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', fontSize: 18, lineHeight: 1 }}
        >
          −
        </button>
        <input
          type="number"
          min={0}
          value={count === 0 ? '' : count}
          placeholder="0"
          onChange={(e) => onChange(name, Math.max(0, parseInt(e.target.value, 10) || 0))}
          className="form-control form-control-sm text-center fw-bold"
          style={{ width: 56, height: 32, borderRadius: 8, fontSize: 15,
            borderColor: count > 0 ? '#86efac' : '#cbd5e1',
            background: count > 0 ? '#f0fdf4' : '#fff' }}
        />
        <button
          type="button"
          onClick={() => onChange(name, count + 1)}
          className="btn btn-sm d-flex align-items-center justify-content-center"
          style={{ width: 32, height: 32, padding: 0, borderRadius: 8,
            background: '#0ea5e9', border: '1px solid #0ea5e9', color: '#fff', fontSize: 18, lineHeight: 1 }}
        >
          +
        </button>
      </div>
    </div>
  );
};

/* ── Inventory section accordion ── */
const InventorySection = ({ label, rows, accentColor }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-3 overflow-hidden mb-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="d-flex align-items-center justify-content-between w-100 px-3 py-2 border-0"
        style={{ background: '#f8fafc', cursor: 'pointer' }}
      >
        <div className="d-flex align-items-center gap-2">
          <div style={{ width: 3, height: 16, borderRadius: 2, background: accentColor }} />
          <span className="fw-semibold" style={{ fontSize: 14, color: '#334155' }}>{label}</span>
          <span className="badge bg-secondary" style={{ fontSize: 11 }}>{rows.length}</span>
        </div>
        <span style={{ fontSize: 16, color: '#94a3b8' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="table-responsive">
          <table className="table table-sm table-hover mb-0" style={{ fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th className="ps-3" style={{ color: '#475569', fontWeight: 600 }}>Part / Item</th>
                <th className="text-end" style={{ color: '#475569', fontWeight: 600 }}>Previous</th>
                <th className="text-end" style={{ color: '#475569', fontWeight: 600 }}>Consumed</th>
                <th className="text-end pe-3" style={{ color: '#475569', fontWeight: 600 }}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name}>
                  <td className="ps-3" style={{ color: '#1e293b', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</td>
                  <td className="text-end text-muted">{row.previous}</td>
                  <td className="text-end" style={{ color: row.consumed > 0 ? '#dc2626' : '#64748b' }}>{row.consumed}</td>
                  <td className="text-end pe-3 fw-semibold" style={{ color: row.updated < 0 ? '#dc2626' : row.updated === 0 ? '#64748b' : '#16a34a' }}>
                    {row.updated}
                    {row.updated < 0 && <span className="ms-1" style={{ fontSize: 10 }}>⚠</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════ */
const DailyProductionForm = () => {
  const [date, setDate] = useState(new Date());
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [baseInventory, setBaseInventory] = useState({});
  const [stagesCompleted, setStagesCompleted] = useState({});
  const [wagonConfig, setWagonConfig] = useState({ parts: [], stages: [], dmItems: [], nonDmItems: [] });
  const [wagonType, setWagonType] = useState('');
  const [isLiveInventoryOpen, setIsLiveInventoryOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    api.get('/enquiries/orders')
      .then((res) => {
        const data = Array.isArray(res.data?.orders) ? res.data.orders : [];
        setProjects(data.filter((o) => (o.stage || '').toLowerCase().includes('confirm')));
      })
      .catch((err) => setErrMsg(err?.response?.data?.message || 'Failed to load orders'));
  }, []);

  const selected = useMemo(
    () => projects.find((p) => p.projectId === selectedProject),
    [projects, selectedProject]
  );

  useEffect(() => {
    if (!selectedProject || !selected) {
      setErrMsg(''); setWagonType(''); setBaseInventory({});
      setWagonConfig({ parts: [], stages: [], dmItems: [], nonDmItems: [] });
      setStagesCompleted({}); return;
    }

    setErrMsg(''); setLoading(true);
    const type = selected.wagonType || '';
    setWagonType(type);

    Promise.all([
      api.get(`/production/parts/${selectedProject}`),
      type ? api.get(`/wagons/bom/${type}`) : Promise.resolve({ data: { parts: [], stages: [], dmItems: [], nonDmItems: [] } })
    ])
      .then(([invRes, cfgRes]) => {
        setBaseInventory(normalizeInventory(invRes.data));
        const cfg = cfgRes?.data || {};
        setWagonConfig({
          wagonType: cfg.wagonType || '',
          parts: Array.isArray(cfg.parts) ? cfg.parts : [],
          stages: Array.isArray(cfg.stages) ? cfg.stages : [],
          dmItems: Array.isArray(cfg.dmItems) ? cfg.dmItems : [],
          nonDmItems: Array.isArray(cfg.nonDmItems) ? cfg.nonDmItems : []
        });
        setStagesCompleted({});
      })
      .catch((err) => {
        setBaseInventory({});
        setWagonConfig({ parts: [], stages: [], dmItems: [], nonDmItems: [] });
        setStagesCompleted({});
        setErrMsg('Failed to load wagon config / inventory');
      })
      .finally(() => setLoading(false));
  }, [selectedProject, selected]);

  const handleStageInput = (stageName, count) => {
    setStagesCompleted((prev) => ({ ...prev, [stageName]: Math.max(0, count) }));
  };

  const totalCompleted = useMemo(
    () => Object.values(stagesCompleted).reduce((s, v) => s + (v || 0), 0),
    [stagesCompleted]
  );

  const liveInventorySections = useMemo(() => {
    const airBrakeCount = Object.entries(stagesCompleted || {}).reduce((count, [name, qty]) => {
      if (normalizeStageKey(name) !== normalizeStageKey('Air Brake Testing')) return count;
      return Math.max(0, parseInt(qty, 10) || 0);
    }, 0);

    const buildRows = (items = []) =>
      items.map((item) => {
        const name = getInventoryItemName(item);
        const previous = Number(baseInventory?.[name] || 0);
        const perWagon = Number(item?.qtyPerWagon || 0);
        const consumed = airBrakeCount > 0 ? perWagon * airBrakeCount : 0;
        return name ? { name, previous, consumed, updated: previous - consumed } : null;
      }).filter(Boolean);

    return [
      { label: 'DM Items', rows: buildRows(wagonConfig.dmItems), accentColor: '#10b981' },
      { label: 'Non-DM Items', rows: buildRows(wagonConfig.nonDmItems), accentColor: '#f59e0b' }
    ].filter((s) => s.rows.length);
  }, [baseInventory, stagesCompleted, wagonConfig]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProject) { alert('Please select a project.'); return; }

    const payload = {
      date: date.toISOString().split('T')[0],
      projectId: selectedProject,
      wagonType,
      stagesCompleted
    };

    setLoading(true); setErrMsg('');
    try {
      await api.post('/production/daily-wagon-update', payload);
      const invRes = await api.get(`/production/parts/${selectedProject}`);
      setBaseInventory(normalizeInventory(invRes.data));
      setStagesCompleted({});
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Error saving update';
      setErrMsg(msg);
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const stageCount = wagonConfig.stages?.length || 0;
  const filledStageCount = Object.values(stagesCompleted).filter((v) => v > 0).length;

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", maxWidth: 760, margin: '0 auto' }}>

      {/* ── Page header ── */}
      <div className="mb-4">
        <h4 className="fw-bold mb-1" style={{ color: '#0f172a' }}>Daily Production Entry</h4>
        <p className="text-muted mb-0" style={{ fontSize: 13 }}>Record wagon stage completions and track inventory</p>
      </div>

      {/* ── Error banner ── */}
      {errMsg && (
        <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 mb-3" style={{ fontSize: 13 }}>
          <span>⚠</span> {errMsg}
        </div>
      )}

      {/* ── Success toast ── */}
      {submitted && (
        <div className="alert alert-success d-flex align-items-center gap-2 py-2 px-3 mb-3" style={{ fontSize: 13 }}>
          <span>✓</span> Daily production log saved successfully!
        </div>
      )}

      <form onSubmit={handleSubmit}>

        {/* ── Date + Project card ── */}
        <div className="card shadow-sm mb-4" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div className="card-body px-4 py-4">

            {/* Date */}
            <div className="mb-4">
              <label className="form-label fw-semibold mb-1" style={{ fontSize: 13, color: '#374151' }}>
                Date
              </label>
              <div>
                <DatePicker
                  selected={date}
                  onChange={setDate}
                  dateFormat="dd MMM yyyy"
                  className="form-control"
                  wrapperClassName="w-100"
                  style={{ maxWidth: 200 }}
                />
              </div>
            </div>

            {/* Project */}
            <div>
              <label className="form-label fw-semibold mb-1" style={{ fontSize: 13, color: '#374151' }}>
                Select Project
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="form-select"
                disabled={loading}
              >
                <option value="">— Select a project —</option>
                {projects.map((p) => (
                  <option key={p.projectId} value={p.projectId}>
                    {p.projectId} — {p.clientName} ({p.wagonType})
                  </option>
                ))}
              </select>
            </div>

            {/* Selected project info chips */}
            {selected && (
              <div className="d-flex flex-wrap gap-2 mt-3">
                <span className="badge rounded-pill" style={{ background: '#e0e7ff', color: '#4338ca', fontSize: 12, padding: '5px 12px' }}>
                  {selected.wagonType || 'No wagon type'}
                </span>
                <span className="badge rounded-pill" style={{ background: '#f0fdf4', color: '#166534', fontSize: 12, padding: '5px 12px' }}>
                  {selected.clientName}
                </span>
                {stageCount > 0 && (
                  <span className="badge rounded-pill" style={{ background: '#fff7ed', color: '#9a3412', fontSize: 12, padding: '5px 12px' }}>
                    {stageCount} stages
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Stages card ── */}
        <div className="card shadow-sm mb-4" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div className="card-header px-4 py-3 d-flex align-items-center justify-content-between flex-wrap gap-2"
            style={{ background: '#f8fafc', border: 'none', borderBottom: '1px solid #e2e8f0', borderRadius: '12px 12px 0 0' }}>
            <div className="d-flex align-items-center gap-2">
              <div style={{ width: 4, height: 20, borderRadius: 2, background: '#6366f1' }} />
              <h6 className="mb-0 fw-bold" style={{ color: '#1e293b' }}>Stages Completed</h6>
            </div>
            {stageCount > 0 && (
              <div className="d-flex align-items-center gap-2">
                <div className="progress flex-grow-1" style={{ height: 6, width: 100, borderRadius: 10 }}>
                  <div
                    className="progress-bar bg-success"
                    style={{ width: `${Math.min(100, (filledStageCount / stageCount) * 100)}%`, borderRadius: 10 }}
                  />
                </div>
                <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                  {filledStageCount}/{stageCount} active
                </span>
              </div>
            )}
          </div>

          <div className="card-body px-4 py-3">
            {loading && (
              <div className="text-center py-4 text-muted" style={{ fontSize: 13 }}>
                Loading stages…
              </div>
            )}
            {!loading && !stageCount && (
              <div className="text-center py-4" style={{ color: '#94a3b8', fontSize: 14 }}>
                {selectedProject ? 'No stages defined for this wagon type.' : 'Select a project to see stages.'}
              </div>
            )}
            {!loading && stageCount > 0 && (
              <>
                {totalCompleted > 0 && (
                  <div className="mb-3 px-3 py-2 rounded-3 d-flex align-items-center gap-2"
                    style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <span style={{ fontSize: 18 }}>✓</span>
                    <span style={{ fontSize: 13, color: '#166534', fontWeight: 600 }}>
                      {totalCompleted} wagons completed today across {filledStageCount} stage{filledStageCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
                  {wagonConfig.stages.map((stage, idx) => (
                    <StageCard
                      key={stage.name}
                      name={stage.name}
                      index={idx}
                      value={stagesCompleted[stage.name] ?? 0}
                      onChange={handleStageInput}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Live Inventory card ── */}
        <div className="card shadow-sm mb-4" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <button
            type="button"
            onClick={() => setIsLiveInventoryOpen((v) => !v)}
            className="d-flex align-items-center justify-content-between w-100 px-4 py-3 border-0"
            style={{ background: '#f8fafc', cursor: 'pointer', borderRadius: isLiveInventoryOpen ? '12px 12px 0 0' : 12 }}
          >
            <div className="d-flex align-items-center gap-2">
              <div style={{ width: 4, height: 20, borderRadius: 2, background: '#0ea5e9' }} />
              <h6 className="mb-0 fw-bold" style={{ color: '#1e293b' }}>Live Inventory Preview</h6>
            </div>
            <span style={{ fontSize: 16, color: '#94a3b8' }}>{isLiveInventoryOpen ? '▲' : '▼'}</span>
          </button>

          {isLiveInventoryOpen && (
            <div className="card-body px-4 py-3">
              {!liveInventorySections.length ? (
                <p className="text-muted mb-0" style={{ fontSize: 13 }}>
                  {selectedProject ? 'No inventory items available for this project.' : 'Select a project to preview inventory.'}
                </p>
              ) : (
                <>
                  <p className="text-muted mb-3" style={{ fontSize: 12 }}>
                    Inventory changes are calculated based on Air Brake Testing count.
                  </p>
                  {liveInventorySections.map((section) => (
                    <InventorySection key={section.label} {...section} />
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Submit ── */}
        <div className="d-grid gap-2">
          <button
            type="submit"
            disabled={loading || !selectedProject}
            className="btn btn-lg fw-semibold"
            style={{
              borderRadius: 10,
              background: loading || !selectedProject ? '#94a3b8' : '#0ea5e9',
              border: 'none',
              color: '#fff',
              padding: '14px',
              fontSize: 15,
              letterSpacing: 0.2
            }}
          >
            {loading ? (
              <span className="d-flex align-items-center justify-content-center gap-2">
                <span className="spinner-border spinner-border-sm" />
                Saving…
              </span>
            ) : (
              'Save Daily Update'
            )}
          </button>
        </div>

      </form>
    </div>
  );
};

export default DailyProductionForm;
