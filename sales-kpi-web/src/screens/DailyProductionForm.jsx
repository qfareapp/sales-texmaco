import React, { useState, useEffect, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import api from '../api';
import 'react-datepicker/dist/react-datepicker.css';

/**
 * Assumptions:
 * - GET /enquiries/orders → { orders: [...] }
 *   where each order: { projectId, clientName, wagonType, stage }
 * - GET /production/parts/:projectId → { partName: qty, ... } or array [{ name, qty }]
 * - GET /wagons/:wagonType → {
 *      wagonType,
 *      parts: [{ name, total }],
 *      stages: [{ name, partUsage: [{ name, used }] }]
 *   }
 * - POST /production/daily-wagon-update → save daily log
 */

const normalizeInventory = (inv) => {
  if (!inv) return {};
  if (Array.isArray(inv)) {
    const obj = {};
    inv.forEach(it => {
      const name = it.name ?? it.part ?? '';
      const qty = Number(it.qty ?? it.quantity ?? it.count ?? 0);
      if (name) obj[name] = qty;
    });
    return obj;
  }
  return Object.fromEntries(Object.entries(inv).map(([k, v]) => [k, Number(v) || 0]));
};

const toIndex = (arr, key = 'name') =>
  Array.isArray(arr)
    ? arr.reduce((acc, it) => {
        const k = it?.[key];
        if (k) acc[k] = it;
        return acc;
      }, {})
    : {};

const DailyProductionForm = () => {
  const [date, setDate] = useState(new Date());
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');

  const [baseInventory, setBaseInventory] = useState({});
  const [partsProduced, setPartsProduced] = useState({});
  const [stagesCompleted, setStagesCompleted] = useState({});

  const [wagonConfig, setWagonConfig] = useState({ parts: [], stages: [] });
  const [wagonType, setWagonType] = useState('');

  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  // Fetch confirmed projects
  useEffect(() => {
    api.get('/enquiries/orders')
      .then(res => {
        const data = Array.isArray(res.data?.orders) ? res.data.orders : [];
        const confirmed = data.filter(o => (o.stage || '').toLowerCase().includes('confirm'));
        setProjects(confirmed);
      })
      .catch(err => setErrMsg(err?.response?.data?.message || 'Failed to load orders'));
  }, []);

  const selected = useMemo(
    () => projects.find(p => p.projectId === selectedProject),
    [projects, selectedProject]
  );

  const stageIndex = useMemo(
    () => toIndex(wagonConfig?.stages || [], 'name'),
    [wagonConfig]
  );

  // When project changes → load inventory + wagon config
  useEffect(() => {
    if (!selectedProject) return;
    setErrMsg('');
    setLoading(true);

    const type = selected?.wagonType || '';
    setWagonType(type);

    Promise.all([
      api.get(`/production/parts/${selectedProject}`),
      type ? api.get(`/wagons/bom/${type}`) : Promise.resolve({ data: { parts: [], stages: [] } })
    ])
      .then(([invRes, cfgRes]) => {
        setBaseInventory(normalizeInventory(invRes.data));

        const cfg = cfgRes?.data || { parts: [], stages: [] };
        setWagonConfig({
          wagonType: cfg.wagonType || '',
          parts: Array.isArray(cfg.parts) ? cfg.parts : [],
          stages: Array.isArray(cfg.stages) ? cfg.stages : []
        });

        setPartsProduced({});
        setStagesCompleted({});
      })
      .catch(err => {
        console.warn('⚠️ Failed to load inventory/config:', err?.response?.data?.message || err.message);
        setBaseInventory({});
        setWagonConfig({ parts: [], stages: [] });
        setPartsProduced({});
        setStagesCompleted({});
        setErrMsg('Failed to load inventory/config');
      })
      .finally(() => setLoading(false));
  }, [selectedProject, selected?.wagonType]);

  // Handlers
  const handlePartsProducedInput = (part, value) => {
    const qty = Math.max(0, parseInt(value, 10) || 0);
    setPartsProduced(prev => ({ ...prev, [part]: qty }));
  };

  const handleStageInput = (stageName, count) => {
    const qty = Math.max(0, parseInt(count, 10) || 0);
    setStagesCompleted(prev => ({ ...prev, [stageName]: qty }));
  };

  // Inventory calculations
  const consumedByStages = useMemo(() => {
    const usage = {};
    Object.entries(stagesCompleted).forEach(([stageName, stageCount]) => {
      if (!stageCount) return;
      const s = stageIndex[stageName];
      if (!s?.partUsage?.length) return;
      s.partUsage.forEach(u => {
        const p = u?.name;
        const perUnit = Number(u?.used || 0);
        if (!p || perUnit <= 0) return;
        usage[p] = (usage[p] || 0) + perUnit * stageCount;
      });
    });
    return usage;
  }, [stagesCompleted, stageIndex]);

  const previewInventory = useMemo(() => {
    const allParts = new Set([
      ...Object.keys(baseInventory || {}),
      ...Object.keys(partsProduced || {}),
      ...Object.keys(consumedByStages || {})
    ]);
    const out = {};
    allParts.forEach(name => {
      const base = Number(baseInventory?.[name] || 0);
      const prod = Number(partsProduced?.[name] || 0);
      const cons = Number(consumedByStages?.[name] || 0);
      out[name] = base + prod - cons;
    });
    return out;
  }, [baseInventory, partsProduced, consumedByStages]);

  const hasNegativePreview = useMemo(
  () => Object.values(previewInventory || {}).some(v => Number(v) < 0),
  [previewInventory]
);

  // Submit
  const handleSubmit = async (e) => {
  e.preventDefault();
  if (!selectedProject) {
    alert('Please select a project.');
    return;
  }
if (hasNegativePreview) {
    alert('Some parts would go below zero. Please adjust quantities.');
    return;
  }
  const payload = {
    date: date.toISOString().split('T')[0],
    projectId: selectedProject,
    wagonType,
    partsProduced,
    stagesCompleted
  };

  setLoading(true);
  setErrMsg('');

  try {
    await api.post('/production/daily-wagon-update', payload);

    // ⬇️ Refresh inventory from server so UI shows the new truth
    try {
      const invRes = await api.get(`/production/parts/${selectedProject}`);
      setBaseInventory(normalizeInventory(invRes.data));
    } catch (refetchErr) {
      // ⬇️ If refetch fails, fallback to optimistic update using preview
      setBaseInventory(prev => {
        const updated = {};
        const all = new Set([
          ...Object.keys(prev || {}),
          ...Object.keys(partsProduced || {}),
          ...Object.keys(consumedByStages || {})
        ]);
        all.forEach(name => {
          const base = Number(prev?.[name] || 0);
          const prod = Number(partsProduced?.[name] || 0);
          const cons = Number(consumedByStages?.[name] || 0);
          updated[name] = base + prod - cons;
        });
        return updated;
      });
      console.warn('Inventory refetch failed, used optimistic update:', refetchErr);
    }

    // Clear today’s inputs after updating baseInventory
    setPartsProduced({});
    setStagesCompleted({});
    alert('✅ Daily production log saved!');
  } catch (err) {
    console.error('❌ Error submitting update:', err);
    setErrMsg(err?.response?.data?.message || 'Error saving update');
    alert(err?.response?.data?.message || 'Error saving update');
  } finally {
    setLoading(false);
  }
};


  return (
    <div style={{ padding: 24, maxWidth: 920, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 16 }}>📦 Daily Production Entry</h2>

      {errMsg && (
        <div style={{ background: '#ffeaea', color: '#b30000', padding: 10, borderRadius: 6, marginBottom: 12 }}>
          {errMsg}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Date */}
        <div style={{ marginBottom: 16 }}>
          <label><b>Date:&nbsp;</b></label>
          <DatePicker selected={date} onChange={setDate} dateFormat="yyyy-MM-dd" />
        </div>

        {/* Project Select */}
        <div style={{ marginBottom: 20 }}>
          <label><b>Select Project:</b></label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            style={{ width: '100%', padding: 10, marginTop: 6 }}
            disabled={loading}
          >
            <option value="">-- Select Project --</option>
            {projects.map(p => (
              <option key={p.projectId} value={p.projectId}>
                {p.projectId} – {p.clientName} ({p.wagonType})
              </option>
            ))}
          </select>
        </div>

        {/* Parts Manufactured Today */}
        <h3 style={{ marginTop: 24, marginBottom: 12 }}>🧩 Parts Manufactured/received Today</h3>
        {wagonConfig.parts?.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 8 }}>
            {wagonConfig.parts.map(p => (
              <React.Fragment key={p.name}>
                <label style={{ display: 'flex', alignItems: 'center' }}>{p.name} :</label>
                <input
                  type="number"
                  min={0}
                  value={partsProduced[p.name] ?? ''}
                  onChange={e => handlePartsProducedInput(p.name, e.target.value)}
                  style={{ width: '100%', padding: 8 }}
                />
              </React.Fragment>
            ))}
          </div>
        ) : (
          <p style={{ color: '#666' }}>No parts defined in config for this wagon type.</p>
        )}

        <hr style={{ margin: '24px 0' }} />

        {/* Stages Completed */}
        <h3 style={{ marginBottom: 12 }}>🏗️ Stages Completed</h3>
        {wagonConfig.stages?.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 8 }}>
            {wagonConfig.stages.map(s => (
              <React.Fragment key={s.name}>
                <div>
                  <div style={{ fontWeight: 600 }}>{s.name}</div>
                  {Array.isArray(s.partUsage) && s.partUsage.length > 0 ? (
                    <div style={{ fontSize: 12, color: '#555' }}>
                      uses:&nbsp;{s.partUsage.map(u => `${u.name}×${u.used}`).join(', ')}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#999' }}>no part usage configured</div>
                  )}
                </div>
                <input
                  type="number"
                  min={0}
                  value={stagesCompleted[s.name] ?? ''}
                  onChange={e => handleStageInput(s.name, e.target.value)}
                  style={{ width: '100%', padding: 8 }}
                />
              </React.Fragment>
            ))}
          </div>
        ) : (
          <p style={{ color: '#666' }}>No stages defined in config for this wagon type.</p>
        )}

        {/* Inventory Preview */}
        <h3 style={{ marginTop: 24, marginBottom: 12 }}>📦 Updated Part Inventory Preview</h3>

        {hasNegativePreview && (
  <div
    style={{
      background: '#fff3cd',
      color: '#7a5b00',
      padding: 10,
      borderRadius: 6,
      margin: '12px 0'
    }}
  >
    Some parts would go below zero. Please adjust quantities.
  </div>
)}
        <div style={{ overflowX: 'auto' }}>
          <table border="1" cellPadding={8} style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th align="left">Part</th>
                <th align="right">Current</th>
                <th align="right">+ Produced</th>
                <th align="right">− Consumed</th>
                <th align="right">= Preview</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(previewInventory).length === 0 && (
                <tr><td colSpan={5} style={{ color: '#666' }}>No inventory available for this project.</td></tr>
              )}
              {Object.keys(previewInventory).sort().map(part => {
                const base = Number(baseInventory?.[part] || 0);
                const prod = Number(partsProduced?.[part] || 0);
                const cons = Number(consumedByStages?.[part] || 0);
                const next = Number(previewInventory?.[part] || 0);
                const isNegative = next < 0;
                return (
                  <tr key={part}>
                    <td>{part}</td>
                    <td align="right">{base}</td>
                    <td align="right">{prod}</td>
                    <td align="right">{cons}</td>
                    <td align="right" style={{ color: isNegative ? '#b30000' : 'inherit', fontWeight: isNegative ? 700 : 400 }}>
                      {next}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button
  type="submit"
  style={{ marginTop: 20, padding: '10px 14px', backgroundColor: hasNegativePreview ? '#aaa' : '#2ecc71', color: 'white', border: 'none', borderRadius: 6 }}
  disabled={loading || !selectedProject || hasNegativePreview}
>
  {hasNegativePreview ? '🚫 Fix Negative Stock' : '✅ Save Daily Update'}
</button>
      </form>
    </div>
  );
};

export default DailyProductionForm;
