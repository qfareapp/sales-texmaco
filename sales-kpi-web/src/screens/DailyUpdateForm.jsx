import React, { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import api from '../api';
import 'react-datepicker/dist/react-datepicker.css';

const DailyUpdateForm = () => {
  const [projects, setProjects] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [formData, setFormData] = useState({ date: new Date(), wagonSoldToday: '' });
  const [projectDetails, setProjectDetails] = useState({ wagonType: '', totalOrder: 0, soldTillDate: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projRes, updatesRes] = await Promise.all([
          api.get('/enquiries/orders'),
          api.get('/daily-updates')
        ]);
        const projectList = Array.isArray(projRes.data?.orders) ? projRes.data.orders : [];
        setProjects(projectList);
        setUpdates(Array.isArray(updatesRes.data) ? updatesRes.data : []);
        if (projectList.length > 0) setSelectedProjectId(projectList[0].projectId);
      } catch (err) {
        setErrMsg('Failed to load data. Please refresh.');
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedProjectId || !projects.length) return;
    const selected = projects.find(p => p.projectId === selectedProjectId);
    if (!selected) return;
    const soldTillDate = updates
      .filter(u => u.projectId === selectedProjectId)
      .reduce((sum, u) => sum + (u.wagonSold || 0), 0);
    setProjectDetails({
      wagonType: selected.wagonType || '—',
      totalOrder: (selected.noOfRakes || 0) * (selected.wagonsPerRake || 0),
      soldTillDate,
    });
  }, [selectedProjectId, projects, updates]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg(''); setErrMsg('');
    const count = parseInt(formData.wagonSoldToday, 10);
    if (!count || count < 1) { setErrMsg('Enter a valid wagon count (≥ 1).'); return; }

    setSubmitting(true);
    try {
      await api.post('/daily-updates', {
        projectId: selectedProjectId,
        date: formData.date.toISOString().split('T')[0],
        wagonSold: count,
      });
      const updatesRes = await api.get('/daily-updates');
      setUpdates(Array.isArray(updatesRes.data) ? updatesRes.data : []);
      setFormData(f => ({ ...f, wagonSoldToday: '' }));
      setSuccessMsg('Update saved successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'Failed to save update.');
    } finally {
      setSubmitting(false);
    }
  };

  const { totalOrder, soldTillDate, wagonType } = projectDetails;
  const remaining = Math.max(0, totalOrder - soldTillDate);
  const pct = totalOrder > 0 ? Math.min(100, Math.round((soldTillDate / totalOrder) * 100)) : 0;

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", maxWidth: 560, margin: '0 auto' }}>

      {/* Header */}
      <div className="mb-4">
        <h4 className="fw-bold mb-1" style={{ color: '#0f172a' }}>Daily Wagon Update</h4>
        <p className="text-muted mb-0" style={{ fontSize: 13 }}>Record wagons delivered for today</p>
      </div>

      {/* Banners */}
      {errMsg && (
        <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 mb-3" style={{ fontSize: 13, borderRadius: 10 }}>
          <span>⚠</span> {errMsg}
        </div>
      )}
      {successMsg && (
        <div className="alert alert-success d-flex align-items-center gap-2 py-2 px-3 mb-3" style={{ fontSize: 13, borderRadius: 10 }}>
          <span>✓</span> {successMsg}
        </div>
      )}

      {/* Form card */}
      <div className="card shadow-sm" style={{ borderRadius: 14, border: '1px solid #e2e8f0' }}>
        <div className="card-body px-4 py-4">
          <form onSubmit={handleSubmit}>

            {/* Date */}
            <div className="mb-4">
              <label className="form-label fw-semibold mb-1" style={{ fontSize: 13, color: '#374151' }}>Date</label>
              <DatePicker
                selected={formData.date}
                onChange={(date) => setFormData(f => ({ ...f, date }))}
                dateFormat="dd MMM yyyy"
                className="form-control"
                wrapperClassName="d-block"
              />
            </div>

            {/* Project */}
            <div className="mb-4">
              <label className="form-label fw-semibold mb-1" style={{ fontSize: 13, color: '#374151' }}>Project</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="form-select"
              >
                {projects.map(p => (
                  <option key={p.projectId} value={p.projectId}>
                    {p.projectId}{p.clientName ? ` — ${p.clientName}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Project stats */}
            {selectedProjectId && (
              <div className="mb-4 rounded-3 p-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <span className="badge rounded-pill" style={{ background: '#e0e7ff', color: '#4338ca', fontSize: 12, padding: '4px 12px' }}>
                    {wagonType}
                  </span>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-4 text-center">
                    <div className="fw-bold" style={{ fontSize: 22, color: '#1e293b' }}>{totalOrder || '—'}</div>
                    <div className="text-muted" style={{ fontSize: 11 }}>Total Order</div>
                  </div>
                  <div className="col-4 text-center" style={{ borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0' }}>
                    <div className="fw-bold" style={{ fontSize: 22, color: '#16a34a' }}>{soldTillDate}</div>
                    <div className="text-muted" style={{ fontSize: 11 }}>Delivered</div>
                  </div>
                  <div className="col-4 text-center">
                    <div className="fw-bold" style={{ fontSize: 22, color: remaining > 0 ? '#dc2626' : '#16a34a' }}>{remaining}</div>
                    <div className="text-muted" style={{ fontSize: 11 }}>Remaining</div>
                  </div>
                </div>

                {/* Progress bar */}
                {totalOrder > 0 && (
                  <div>
                    <div className="d-flex justify-content-between mb-1">
                      <span style={{ fontSize: 12, color: '#64748b' }}>Delivery progress</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626' }}>
                        {pct}%
                      </span>
                    </div>
                    <div className="progress" style={{ height: 8, borderRadius: 10 }}>
                      <div
                        className="progress-bar"
                        style={{
                          width: `${pct}%`,
                          borderRadius: 10,
                          background: pct >= 80 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#ef4444'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Wagons delivered today */}
            <div className="mb-4">
              <label className="form-label fw-semibold mb-1" style={{ fontSize: 13, color: '#374151' }}>
                Wagons Delivered Today
              </label>
              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(f => ({ ...f, wagonSoldToday: Math.max(0, (parseInt(f.wagonSoldToday) || 0) - 1) }))}
                  className="btn d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 40, height: 44, borderRadius: 10, background: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: 22, color: '#475569' }}
                >
                  −
                </button>
                <input
                  type="number"
                  min="0"
                  value={formData.wagonSoldToday}
                  onChange={(e) => setFormData(f => ({ ...f, wagonSoldToday: e.target.value }))}
                  placeholder="0"
                  required
                  className="form-control text-center fw-bold"
                  style={{ fontSize: 20, height: 44, borderRadius: 10 }}
                />
                <button
                  type="button"
                  onClick={() => setFormData(f => ({ ...f, wagonSoldToday: (parseInt(f.wagonSoldToday) || 0) + 1 }))}
                  className="btn d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 40, height: 44, borderRadius: 10, background: '#0ea5e9', border: '1px solid #0ea5e9', fontSize: 22, color: '#fff' }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !selectedProjectId}
              className="btn w-100 fw-semibold"
              style={{
                height: 48,
                borderRadius: 10,
                fontSize: 15,
                background: submitting || !selectedProjectId ? '#94a3b8' : '#0ea5e9',
                border: 'none',
                color: '#fff',
                letterSpacing: 0.2,
              }}
            >
              {submitting ? (
                <span className="d-flex align-items-center justify-content-center gap-2">
                  <span className="spinner-border spinner-border-sm" /> Saving…
                </span>
              ) : (
                'Submit Update'
              )}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
};

export default DailyUpdateForm;
