import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import api from '../api';
import { inspectionStages, pdiStages } from './quality/wagonInspectionStageConfig';

const CUSTOM_STAGE_VALUE = '__custom__';

const itemColumns = [
  { key: 'sapCode', label: 'SAP Code' },
  { key: 'sectionGroup', label: 'Section / Group' },
  { key: 'description', label: 'Description' },
  { key: 'qtyPerWagon', label: 'Qty / Wagon' },
  { key: 'uom', label: 'UOM' },
  { key: 'requiredNos', label: 'Required in Nos.' }
];

const createStage = () => ({ name: '', mode: 'select', customName: '' });
const createRule = (stage) => ({
  key: stage.key,
  label: stage.label,
  allowSkip: false,
  isOptional: false
});
const createItem = () => ({
  sapCode: '', sectionGroup: '', description: '',
  qtyPerWagon: '', uom: '', requiredNos: ''
});

const normalizeHeader = (value) =>
  String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

const toNumberOrBlank = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : '';
};

const isFilledItem = (item) =>
  Boolean(item.sapCode || item.sectionGroup || item.description ||
    item.qtyPerWagon !== '' || item.uom || item.requiredNos !== '');

const importColumnMap = {
  sapcode: 'sapCode', sap: 'sapCode',
  sectiongroup: 'sectionGroup', section: 'sectionGroup', group: 'sectionGroup',
  description: 'description',
  qtywagon: 'qtyPerWagon', qtyperwagon: 'qtyPerWagon', quantitywagon: 'qtyPerWagon',
  uom: 'uom',
  requiredinnos: 'requiredNos', requirednos: 'requiredNos', requiredinno: 'requiredNos'
};

const normalizeSavedItems = (items) =>
  Array.isArray(items) && items.length
    ? items.map((item) => ({
        sapCode: item.sapCode || '', sectionGroup: item.sectionGroup || '',
        description: item.description || '', qtyPerWagon: item.qtyPerWagon ?? '',
        uom: item.uom || '', requiredNos: item.requiredNos ?? ''
      }))
    : [createItem()];

const normalizeSavedStages = (stages, availableStageNames) =>
  Array.isArray(stages) && stages.length
    ? stages.map((stage) => {
        const name = String(stage?.name || '').trim();
        const existsInMaster = availableStageNames.includes(name);
        return { name, mode: existsInMaster ? 'select' : 'custom', customName: existsInMaster ? '' : name };
      })
    : [];

const normalizeRuleSet = (savedRules, stageDefs) => {
  const savedMap = new Map(
    (Array.isArray(savedRules) ? savedRules : [])
      .filter((rule) => rule?.key)
      .map((rule) => [rule.key, rule])
  );

  return stageDefs.map((stage) => ({
    key: stage.key,
    label: stage.label,
    allowSkip: Boolean(savedMap.get(stage.key)?.allowSkip),
    isOptional: Boolean(savedMap.get(stage.key)?.isOptional)
  }));
};

const normalizePayloadItems = (items) =>
  items.filter(isFilledItem).map((item) => ({
    sapCode: item.sapCode.trim(), sectionGroup: item.sectionGroup.trim(),
    description: item.description.trim(), qtyPerWagon: Number(item.qtyPerWagon || 0),
    uom: item.uom.trim(), requiredNos: Number(item.requiredNos || 0)
  }));

/* ─── Read-only table shown inside saved config cards ─── */
const ConfigItemsTable = ({ items }) => {
  if (!items?.length) return <p className="text-muted small mb-0">No items.</p>;
  return (
    <div className="table-responsive">
      <table className="table table-sm table-bordered table-hover mb-0" style={{ fontSize: 13 }}>
        <thead className="table-light">
          <tr>
            {itemColumns.map((c) => <th key={c.key} className="fw-semibold">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              {itemColumns.map((c) => <td key={c.key}>{item[c.key] || '—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ConfigStagesTable = ({ stages }) => {
  if (!stages?.length) return <p className="text-muted small mb-0">No stages.</p>;
  return (
    <div className="d-flex flex-wrap gap-2">
      {stages.map((stage, i) => (
        <span key={i} className="badge rounded-pill" style={{ background: '#e8f0fe', color: '#1a56db', fontSize: 13, fontWeight: 500, padding: '6px 14px' }}>
          <span style={{ opacity: 0.65, marginRight: 4 }}>{i + 1}.</span>{stage.name}
        </span>
      ))}
    </div>
  );
};

const ConfigRuleTable = ({ title, rules }) => {
  const visibleRules = (rules || []).filter((rule) => rule.allowSkip || rule.isOptional);
  return (
    <div>
      <div className="fw-semibold mb-2" style={{ fontSize: 13, color: '#334155' }}>{title}</div>
      {visibleRules.length === 0 ? (
        <p className="text-muted small mb-0">No skip rules configured.</p>
      ) : (
        <div className="d-flex flex-column gap-2">
          {visibleRules.map((rule) => (
            <div key={rule.key} className="d-flex align-items-center justify-content-between rounded px-3 py-2"
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 13 }}>
              <span>{rule.label}</span>
              <div className="d-flex gap-2">
                {rule.allowSkip && <span className="badge rounded-pill" style={{ background: '#ffedd5', color: '#c2410c' }}>Skip allowed</span>}
                {rule.isOptional && <span className="badge rounded-pill" style={{ background: '#e0f2fe', color: '#075985' }}>Optional</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Collapsible accordion-style section ─── */
const CollapsibleSection = ({ title, defaultOpen = false, count, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border rounded mb-2" style={{ overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="d-flex align-items-center justify-content-between w-100 px-3 py-2 border-0"
        style={{ background: '#f8fafc', cursor: 'pointer' }}
      >
        <div className="d-flex align-items-center gap-2">
          <span className="fw-semibold" style={{ fontSize: 14, color: '#334155' }}>{title}</span>
          {count !== undefined && (
            <span className="badge bg-secondary" style={{ fontSize: 11 }}>{count}</span>
          )}
        </div>
        <span style={{ fontSize: 18, color: '#64748b', lineHeight: 1 }}>{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && <div className="p-3">{children}</div>}
    </div>
  );
};

/* ─── Items editor (DM / Non-DM) ─── */
const ItemsSection = ({ title, accentColor, items, uploadError, onUpload, onChange, onRemove, onAdd, addLabel }) => (
  <div className="mb-4">
    <div className="d-flex align-items-center gap-2 mb-2">
      <div style={{ width: 4, height: 20, borderRadius: 2, background: accentColor }} />
      <h6 className="mb-0 fw-bold" style={{ color: '#1e293b' }}>{title}</h6>
    </div>

    {/* Upload row */}
    <div className="p-3 rounded mb-3" style={{ background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
      <div className="d-flex align-items-start gap-3 flex-wrap">
        <div>
          <label className="btn btn-sm btn-outline-secondary" style={{ cursor: 'pointer', marginBottom: 0 }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ marginRight: 6 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Upload Excel
            <input type="file" accept=".xlsx,.xls" onChange={onUpload} style={{ display: 'none' }} />
          </label>
        </div>
        <p className="mb-0 text-muted" style={{ fontSize: 12, lineHeight: 1.6 }}>
          Columns: <strong>SAP Code, Section / Group, Description, Qty / Wagon, UOM, Required in Nos.</strong>
        </p>
      </div>
      {uploadError && (
        <div className="alert alert-danger mb-0 mt-2 py-1 px-2" style={{ fontSize: 12 }}>{uploadError}</div>
      )}
    </div>

    {/* Table */}
    <div className="table-responsive">
      <table className="table table-sm table-bordered align-middle mb-2" style={{ minWidth: 900, fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f1f5f9' }}>
            <th style={{ width: 36 }} className="text-center text-muted">#</th>
            {itemColumns.map((c) => (
              <th key={c.key} className="fw-semibold" style={{ color: '#374151' }}>{c.label}</th>
            ))}
            <th style={{ width: 60 }} />
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={`${title}-${index}`}>
              <td className="text-center text-muted" style={{ fontSize: 12 }}>{index + 1}</td>
              {itemColumns.map((c) => (
                <td key={c.key}>
                  <input
                    type={c.key === 'qtyPerWagon' || c.key === 'requiredNos' ? 'number' : 'text'}
                    min={c.key === 'qtyPerWagon' || c.key === 'requiredNos' ? '0' : undefined}
                    placeholder={c.label}
                    value={item[c.key]}
                    onChange={(e) => onChange(index, c.key, e.target.value)}
                    className="form-control form-control-sm"
                    style={{ minWidth: c.key === 'description' ? 220 : 110 }}
                  />
                </td>
              ))}
              <td className="text-center">
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="btn btn-sm btn-outline-danger"
                  title="Remove row"
                  style={{ padding: '2px 8px', lineHeight: 1 }}
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <button type="button" onClick={onAdd} className="btn btn-sm btn-outline-primary">
      + {addLabel}
    </button>
  </div>
);

/* ═══════════════════════════════════════════════════════ */
const ManageWagonTypesScreen = () => {
  const [wagonType, setWagonType] = useState('');
  const [stages, setStages] = useState([]);
  const [stageOptions, setStageOptions] = useState([]);
  const [dmItems, setDmItems] = useState([createItem()]);
  const [nonDmItems, setNonDmItems] = useState([createItem()]);
  const [inspectionRules, setInspectionRules] = useState(() => inspectionStages.map(createRule));
  const [pdiRules, setPdiRules] = useState(() => pdiStages.map(createRule));
  const [configs, setConfigs] = useState([]);
  const [editId, setEditId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [dmUploadError, setDmUploadError] = useState('');
  const [nonDmUploadError, setNonDmUploadError] = useState('');

  useEffect(() => { fetchConfigs(); fetchStageOptions(); }, []);

  const fetchConfigs = async () => { const res = await api.get('/wagons'); setConfigs(res.data); };
  const fetchStageOptions = async () => {
    const res = await api.get('/wagons/stages/master');
    setStageOptions(Array.isArray(res.data) ? res.data.map((s) => s.name) : []);
  };

  const handleStageSelectChange = (idx, value) => {
    const updated = [...stages];
    if (value === CUSTOM_STAGE_VALUE) {
      updated[idx] = { ...updated[idx], mode: 'custom', name: '', customName: '' };
    } else {
      updated[idx] = { ...updated[idx], mode: 'select', name: value, customName: '' };
    }
    setStages(updated);
  };

  const handleCustomStageChange = (idx, value) => {
    const updated = [...stages];
    updated[idx] = { ...updated[idx], mode: 'custom', customName: value, name: value };
    setStages(updated);
  };

  const addStage = () => setStages([...stages, createStage()]);
  const removeStage = (idx) => setStages(stages.filter((_, i) => i !== idx));

  const handleItemChange = (setter, items) => (index, key, value) => {
    const updated = [...items]; updated[index][key] = value; setter(updated);
  };
  const addItem = (setter, items) => () => setter([...items, createItem()]);
  const removeItem = (setter, items) => (index) => {
    const updated = items.filter((_, i) => i !== index);
    setter(updated.length ? updated : [createItem()]);
  };

  const resetForm = () => {
    setWagonType(''); setStages([]); setDmItems([createItem()]);
    setNonDmItems([createItem()]); setEditId(null);
    setInspectionRules(inspectionStages.map(createRule));
    setPdiRules(pdiStages.map(createRule));
    setDmUploadError(''); setNonDmUploadError('');
    setFormOpen(false);
  };

  const handleSubmit = async () => {
    const payload = {
      wagonType: wagonType.trim(),
      stages: stages.map((s) => ({ name: String(s.mode === 'custom' ? s.customName : s.name).trim() })).filter((s) => s.name),
      inspectionStageRules: inspectionRules.map((rule) => ({
        key: rule.key,
        allowSkip: Boolean(rule.allowSkip),
        isOptional: Boolean(rule.isOptional)
      })),
      pdiStageRules: pdiRules.map((rule) => ({
        key: rule.key,
        allowSkip: Boolean(rule.allowSkip),
        isOptional: Boolean(rule.isOptional)
      })),
      dmItems: normalizePayloadItems(dmItems),
      nonDmItems: normalizePayloadItems(nonDmItems)
    };
    await api.post('/wagons', payload);
    await Promise.all([fetchConfigs(), fetchStageOptions()]);
    resetForm(); // also sets formOpen → false
  };

  const handleEdit = (config) => {
    setEditId(config._id);
    setWagonType(config.wagonType || '');
    setStages(normalizeSavedStages(config.stages, stageOptions));
    setInspectionRules(normalizeRuleSet(config.inspectionStageRules, inspectionStages));
    setPdiRules(normalizeRuleSet(config.pdiStageRules, pdiStages));
    setDmItems(normalizeSavedItems(config.dmItems));
    setNonDmItems(normalizeSavedItems(config.nonDmItems));
    setDmUploadError(''); setNonDmUploadError('');
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this wagon type configuration?')) {
      await api.delete(`/wagons/${id}`);
      await fetchConfigs();
      if (editId === id) resetForm();
    }
  };

  const handleItemsUpload = async (event, setter, errorSetter, label) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
      if (!rows.length) { errorSetter('The uploaded sheet is empty.'); return; }

      const parsedItems = rows.map((row) => {
        const mapped = createItem();
        Object.entries(row).forEach(([header, value]) => {
          const key = importColumnMap[normalizeHeader(header)];
          if (!key) return;
          mapped[key] = key === 'qtyPerWagon' || key === 'requiredNos'
            ? toNumberOrBlank(value) : String(value || '').trim();
        });
        return mapped;
      }).filter(isFilledItem);

      if (!parsedItems.length) {
        errorSetter(`No valid ${label} rows found. Check column names.`);
        return;
      }
      setter(parsedItems); errorSetter('');
    } catch {
      errorSetter('Failed to read the Excel file. Upload a valid .xlsx or .xls file.');
    } finally {
      event.target.value = '';
    }
  };

  const isEditing = Boolean(editId);
  const handleRuleToggle = (setter, rules, key, field) => {
    setter(rules.map((rule) => (
      rule.key === key ? { ...rule, [field]: !rule[field] } : rule
    )));
  };

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* ── Page header ── */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h4 className="mb-0 fw-bold" style={{ color: '#0f172a' }}>Manage Wagon Types</h4>
          <p className="mb-0 text-muted" style={{ fontSize: 13 }}>Configure wagon types, stages, and material items</p>
        </div>
        {isEditing && (
          <span className="badge" style={{ background: '#fef3c7', color: '#92400e', fontSize: 13, padding: '6px 14px', borderRadius: 20 }}>
            Editing: {wagonType || '…'}
          </span>
        )}
      </div>

      {/* ── Form card ── */}
      <div className="card shadow-sm mb-5" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <button
          type="button"
          onClick={() => setFormOpen((v) => !v)}
          className="d-flex align-items-center justify-content-between w-100 border-0 px-4 py-3"
          style={{
            background: isEditing ? '#fffbeb' : '#f8fafc',
            borderRadius: formOpen ? '12px 12px 0 0' : 12,
            cursor: 'pointer',
            borderBottom: formOpen ? '1px solid #e2e8f0' : 'none',
          }}
        >
          <h5 className="mb-0 fw-semibold" style={{ color: '#1e293b', fontSize: 16 }}>
            {isEditing ? '✏️  Edit Wagon Type' : '＋  New Wagon Type'}
          </h5>
          <span style={{ fontSize: 18, color: '#64748b', lineHeight: 1 }}>{formOpen ? '▲' : '▼'}</span>
        </button>

        {formOpen && <div className="card-body px-4 py-4">
          {/* Wagon Type name */}
          <div className="mb-4" style={{ maxWidth: 400 }}>
            <label className="form-label fw-semibold" style={{ fontSize: 13, color: '#374151' }}>Wagon Type Name</label>
            <input
              className="form-control"
              placeholder="e.g. ACT 1, BCT 2…"
              value={wagonType}
              onChange={(e) => setWagonType(e.target.value)}
            />
          </div>

          {/* ── Stages ── */}
          <div className="mb-4">
            <div className="d-flex align-items-center gap-2 mb-3">
              <div style={{ width: 4, height: 20, borderRadius: 2, background: '#6366f1' }} />
              <h6 className="mb-0 fw-bold" style={{ color: '#1e293b' }}>Production Stages</h6>
              <span className="badge bg-light text-secondary">{stages.length}</span>
            </div>

            {stages.length === 0 && (
              <p className="text-muted" style={{ fontSize: 13 }}>No stages added yet. Click "+ Add Stage" to begin.</p>
            )}

            <div className="d-flex flex-column gap-2 mb-3">
              {stages.map((stage, idx) => (
                <div key={`stage-${idx}`} className="d-flex align-items-center gap-2 p-2 rounded flex-wrap"
                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <span className="badge rounded-circle d-flex align-items-center justify-content-center fw-semibold"
                    style={{ width: 28, height: 28, background: '#6366f1', color: '#fff', fontSize: 12, flexShrink: 0 }}>
                    {idx + 1}
                  </span>

                  {stage.mode === 'custom' ? (
                    <input
                      className="form-control form-control-sm"
                      style={{ maxWidth: 300 }}
                      value={stage.customName}
                      onChange={(e) => handleCustomStageChange(idx, e.target.value)}
                      placeholder="Type stage name…"
                    />
                  ) : (
                    <select
                      className="form-select form-select-sm"
                      style={{ maxWidth: 300 }}
                      value={stage.name || ''}
                      onChange={(e) => handleStageSelectChange(idx, e.target.value)}
                    >
                      <option value="">Select stage…</option>
                      {stageOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                      <option value={CUSTOM_STAGE_VALUE}>— Type New Stage —</option>
                    </select>
                  )}

                  {stage.mode === 'custom' && (
                    <button type="button" className="btn btn-sm btn-outline-secondary"
                      onClick={() => handleStageSelectChange(idx, '')} style={{ fontSize: 12 }}>
                      Use list
                    </button>
                  )}

                  <button type="button" className="btn btn-sm btn-outline-danger ms-auto"
                    onClick={() => removeStage(idx)} style={{ fontSize: 12 }}>
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <button type="button" onClick={addStage} className="btn btn-sm btn-outline-secondary">
              + Add Stage
            </button>
          </div>

          <div className="mb-4">
            <div className="d-flex align-items-center gap-2 mb-3">
              <div style={{ width: 4, height: 20, borderRadius: 2, background: '#f97316' }} />
              <h6 className="mb-0 fw-bold" style={{ color: '#1e293b' }}>Inspection Skip Rules</h6>
            </div>
            <div className="row g-3">
              {[{ title: 'Daily Status', rules: inspectionRules, setter: setInspectionRules }, { title: 'PDI Status', rules: pdiRules, setter: setPdiRules }].map((group) => (
                <div className="col-12 col-xl-6" key={group.title}>
                  <div className="border rounded p-3 h-100" style={{ background: '#fff', borderColor: '#e2e8f0' }}>
                    <div className="fw-semibold mb-3" style={{ color: '#334155', fontSize: 14 }}>{group.title}</div>
                    <div className="d-flex flex-column gap-2">
                      {group.rules.map((rule) => (
                        <div key={rule.key} className="d-flex align-items-center justify-content-between flex-wrap gap-2 rounded px-3 py-2"
                          style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                          <span style={{ fontSize: 13, color: '#0f172a' }}>{rule.label}</span>
                          <div className="d-flex gap-3 align-items-center">
                            <label className="form-check form-switch mb-0">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={rule.allowSkip}
                                onChange={() => handleRuleToggle(group.setter, group.rules, rule.key, 'allowSkip')}
                              />
                              <span className="form-check-label" style={{ fontSize: 12 }}>Allow skip</span>
                            </label>
                            <label className="form-check form-switch mb-0">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={rule.isOptional}
                                onChange={() => handleRuleToggle(group.setter, group.rules, rule.key, 'isOptional')}
                              />
                              <span className="form-check-label" style={{ fontSize: 12 }}>Optional</span>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── DM Items ── */}
          <ItemsSection
            title="Direct Material (DM) Items"
            accentColor="#10b981"
            items={dmItems}
            uploadError={dmUploadError}
            onUpload={(e) => handleItemsUpload(e, setDmItems, setDmUploadError, 'DM item')}
            onChange={handleItemChange(setDmItems, dmItems)}
            onRemove={removeItem(setDmItems, dmItems)}
            onAdd={addItem(setDmItems, dmItems)}
            addLabel="Add DM Item"
          />

          {/* ── Non-DM Items ── */}
          <ItemsSection
            title="Non-DM Items"
            accentColor="#f59e0b"
            items={nonDmItems}
            uploadError={nonDmUploadError}
            onUpload={(e) => handleItemsUpload(e, setNonDmItems, setNonDmUploadError, 'Non DM item')}
            onChange={handleItemChange(setNonDmItems, nonDmItems)}
            onRemove={removeItem(setNonDmItems, nonDmItems)}
            onAdd={addItem(setNonDmItems, nonDmItems)}
            addLabel="Add Non-DM Item"
          />

          {/* ── Action buttons ── */}
          <div className="d-flex gap-2 pt-2 border-top">
            <button type="button" onClick={handleSubmit}
              className={`btn ${isEditing ? 'btn-warning' : 'btn-primary'} px-4`}>
              {isEditing ? 'Update Configuration' : 'Save Configuration'}
            </button>
            {isEditing && (
              <button type="button" onClick={resetForm} className="btn btn-outline-secondary">
                Cancel
              </button>
            )}
          </div>
        </div>}
      </div>

      {/* ── Saved configurations ── */}
      <div className="mb-3 d-flex align-items-center justify-content-between">
        <h5 className="fw-bold mb-0" style={{ color: '#0f172a' }}>
          Saved Configurations
          <span className="badge bg-secondary ms-2" style={{ fontSize: 13 }}>{configs.length}</span>
        </h5>
      </div>

      {configs.length === 0 && (
        <div className="text-center py-5 text-muted" style={{ background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
          <p className="mb-0" style={{ fontSize: 14 }}>No wagon types configured yet.</p>
        </div>
      )}

      <div className="d-flex flex-column gap-3">
        {configs.map((config) => (
          <div key={config._id} className="card shadow-sm" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
            {/* Config card header */}
            <div className="card-header px-4 py-3 d-flex align-items-center justify-content-between flex-wrap gap-2"
              style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', borderRadius: '12px 12px 0 0' }}>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <h6 className="mb-0 fw-bold" style={{ fontSize: 16, color: '#1e293b' }}>{config.wagonType}</h6>
                <span className="badge rounded-pill" style={{ background: '#e0e7ff', color: '#4338ca', fontSize: 11 }}>
                  {config.stages?.length || 0} stages
                </span>
                <span className="badge rounded-pill" style={{ background: '#d1fae5', color: '#065f46', fontSize: 11 }}>
                  {config.dmItems?.length || 0} DM items
                </span>
                <span className="badge rounded-pill" style={{ background: '#fef3c7', color: '#92400e', fontSize: 11 }}>
                  {config.nonDmItems?.length || 0} Non-DM items
                </span>
              </div>
              <div className="d-flex gap-2">
                <button type="button" onClick={() => handleEdit(config)}
                  className="btn btn-sm btn-outline-primary">
                  Edit
                </button>
                <button type="button" onClick={() => handleDelete(config._id)}
                  className="btn btn-sm btn-outline-danger">
                  Delete
                </button>
              </div>
            </div>

            <div className="card-body px-4 py-3">
              <CollapsibleSection title="Stages" defaultOpen count={config.stages?.length || 0}>
                <ConfigStagesTable stages={config.stages} />
              </CollapsibleSection>

              <CollapsibleSection title="Inspection Skip Rules">
                <div className="d-flex flex-column gap-3">
                  <ConfigRuleTable title="Daily Status" rules={normalizeRuleSet(config.inspectionStageRules, inspectionStages)} />
                  <ConfigRuleTable title="PDI Status" rules={normalizeRuleSet(config.pdiStageRules, pdiStages)} />
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="DM Items" count={config.dmItems?.length || 0}>
                <ConfigItemsTable items={config.dmItems} />
              </CollapsibleSection>

              <CollapsibleSection title="Non-DM Items" count={config.nonDmItems?.length || 0}>
                <ConfigItemsTable items={config.nonDmItems} />
              </CollapsibleSection>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ManageWagonTypesScreen;
