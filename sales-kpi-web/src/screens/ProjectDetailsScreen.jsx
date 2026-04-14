// src/screens/ProjectDetailsScreen.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';

const MILESTONES_MASTER = [
  { key: 'advance_received', label: 'Advance received from client' },
  { key: 'design_loan_charge_payment', label: 'Design loan charge Payment (only for private customers)', privateOnly: true },
  { key: 'main_file_opening', label: 'Main file opening' },
  { key: 'qap_wps_release', label: 'QAP & WPS release' },
  { key: 'component_ir_file', label: 'Component IR file' },
  { key: 'bom_upload_release', label: 'Bill Of Material upload release' },
  { key: 'po_released_non_dm', label: 'PO released for non DM component' },
];

const emptyRow = { date: '', notes: '', file: null, existingFileUrl: '', existingFileName: '' };

const ProjectDetailsScreen = () => {
  const { projectId } = useParams();

  const [projectData, setProjectData] = useState(null);
  const [milestones, setMilestones] = useState({}); // { [key]: { date, notes, file, existingFileUrl, existingFileName } }
  const [savingAll, setSavingAll] = useState(false);
  const [savingOne, setSavingOne] = useState({}); // { [key]: boolean }
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const visibleMilestones = useMemo(() => {
    const isPrivate = (projectData?.customerType || projectData?.clientType || '').toLowerCase() === 'private';
    return MILESTONES_MASTER.filter(m => !m.privateOnly || isPrivate);
  }, [projectData]);

  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        const res = await api.get(`/enquiries/project-summary/${projectId}`, { params: { ts: Date.now() } });
        setProjectData(res.data);

        const seeded = {};
        MILESTONES_MASTER.forEach(m => {
          const fromApi = res.data?.milestones?.[m.key] || {};
          seeded[m.key] = {
            date: fromApi.date ? String(fromApi.date).slice(0, 10) : '',
            notes: fromApi.notes || '',
            file: null,
            existingFileUrl: fromApi.fileUrl || '',
            existingFileName: fromApi.fileName || (fromApi.fileUrl ? String(fromApi.fileUrl).split('/').pop() : ''),
          };
        });
        setMilestones(seeded);
      } catch (err) {
        console.error('Failed to fetch project data:', err);
        setError('Could not load project data.');
      }
    };
    fetchProjectData();
  }, [projectId]);

  const handleDateChange = (key, value) => {
    setMilestones(prev => ({ ...prev, [key]: { ...prev[key], date: value || '' } }));
  };

  const handleNotesChange = (key, value) => {
    setMilestones(prev => ({ ...prev, [key]: { ...prev[key], notes: value ?? '' } }));
  };

  const handleFileChange = (key, file) => {
    setMilestones(prev => ({ ...prev, [key]: { ...prev[key], file: file || null } }));
  };

  // Save ALL milestones (kept if you still want bulk save)
  const handleSaveAll = async () => {
    setSavingAll(true);
    setError('');
    setSuccess('');
    try {
      const formData = new FormData();
      visibleMilestones.forEach(m => {
        const row = milestones[m.key] || emptyRow;
        formData.append(`${m.key}[date]`, row.date || '');
        formData.append(`${m.key}[notes]`, row.notes || '');
        if (row.file instanceof File) formData.append(`${m.key}[file]`, row.file);
      });

      const res = await api.post(`/enquiries/${projectId}/milestones`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const posted = res.data?.milestones || {};
      setMilestones(prev => {
        const next = { ...prev };
        Object.entries(posted).forEach(([k, v = {}]) => {
          next[k] = {
            ...(next[k] || emptyRow),
            date: v.date ? String(v.date).slice(0, 10) : (next[k]?.date || ''),
            notes: v.notes ?? next[k]?.notes ?? '',
            file: null,
            existingFileUrl: v.fileUrl || next[k]?.existingFileUrl || '',
            existingFileName: v.fileName || next[k]?.existingFileName || '',
          };
        });
        return next;
      });

      setSuccess(res.data?.message || 'Milestones saved successfully!');
      setTimeout(() => setSuccess(''), 3500);
    } catch (err) {
      console.error('Failed to save milestones:', err);
      setError('Save failed. Please try again.');
    } finally {
      setSavingAll(false);
    }
  };

  // Save ONE milestone (individual row save)
  const handleSaveOne = async (key) => {
    setSavingOne(prev => ({ ...prev, [key]: true }));
    setError('');
    setSuccess('');
    try {
      const row = milestones[key] || emptyRow;
      const formData = new FormData();
      // Send ONLY this milestone; backend can handle partial payload keyed by milestone name
      formData.append(`${key}[date]`, row.date || '');
      formData.append(`${key}[notes]`, row.notes || '');
      if (row.file instanceof File) formData.append(`${key}[file]`, row.file);

      // OPTION A: single-route that accepts partial payloads (preferred)
      const res = await api.post(`/enquiries/${projectId}/milestones`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // OPTION B (if your backend exposes per-milestone endpoint):
      // const res = await api.post(`/enquiries/${projectId}/milestones/${key}`, formData, {
      //   headers: { 'Content-Type': 'multipart/form-data' },
      // });

      const v = (res.data?.milestones && res.data.milestones[key]) || {};
      setMilestones(prev => ({
        ...prev,
        [key]: {
          ...(prev[key] || emptyRow),
          date: v.date ? String(v.date).slice(0, 10) : (row.date || ''),
          notes: v.notes ?? row.notes ?? '',
          file: null, // clear the file input
          existingFileUrl: v.fileUrl || prev[key]?.existingFileUrl || '',
          existingFileName: v.fileName || prev[key]?.existingFileName || '',
        },
      }));

      setSuccess(res.data?.message || 'Milestone saved.');
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      console.error(`Failed to save milestone "${key}"`, err);
      setError('Save failed for this milestone. Please try again.');
    } finally {
      setSavingOne(prev => ({ ...prev, [key]: false }));
    }
  };

  if (!projectData) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>📌 Project Summary for {projectData.projectId}</h2>

      {error && (
        <div style={{ padding: '10px 12px', background: '#ffe8e8', border: '1px solid #ffb3b3', borderRadius: 6, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '10px 12px', background: '#e8ffe8', border: '1px solid #8bc48b', borderRadius: 6, marginBottom: 12 }}>
          {success}
        </div>
      )}

      <p><b>Client:</b> {projectData.clientName || 'N/A'}</p>
      <p><b>Customer Type:</b> {(projectData.customerType || projectData.clientType) || 'N/A'}</p>
      <p><b>Wagon Type:</b> {projectData.wagonType || 'N/A'}</p>

      <p><b>Delivery Period:</b>{' '}
        {projectData.startDate ? new Date(projectData.startDate).toLocaleDateString() : 'N/A'} to{' '}
        {projectData.endDate ? new Date(projectData.endDate).toLocaleDateString() : 'N/A'}
      </p>

      <p><b>Total Ordered:</b> {projectData.totalOrdered}</p>
      <p><b>Delivered:</b> {projectData.delivered}</p>
      <p><b>Pending:</b> {projectData.pending}</p>

      <p><b>Total Quoted Price:</b>{' '}
        {projectData.quotedPrice ? `₹${Number(projectData.quotedPrice).toLocaleString()}` : 'N/A'}
      </p>
      <p><b>Quoted Price per Wagon:</b>{' '}
        {projectData.pricePerWagon ? `₹${Number(projectData.pricePerWagon).toLocaleString()}` : 'N/A'}
      </p>

      {/* -------- Milestones block -------- */}
      <h3 style={{ marginTop: 24 }}>🗂️ Project Milestones (Individual Save • Date • Attachment)</h3>
      <div style={{ overflowX: 'auto' }}>
        <table
          border="1"
          cellPadding="10"
          style={{ marginTop: 10, width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}
        >
          <thead style={{ background: '#f6f6f6' }}>
            <tr>
              <th style={{ minWidth: 240 }}>Milestone</th>
              <th style={{ minWidth: 160 }}>Date</th>
              <th>Details / Notes</th>
              <th style={{ minWidth: 220 }}>Attachment</th>
              <th style={{ minWidth: 140 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleMilestones.map(m => {
              const row = milestones[m.key] || emptyRow;
              const isCompleted = !!row.date;
              const savingRow = !!savingOne[m.key];

              return (
                <tr key={m.key}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span>{m.label}</span>
                      {isCompleted && (
                        <span
                          title="Completed on"
                          style={{
                            fontSize: 12,
                            background: '#e7f7e7',
                            border: '1px solid #85c785',
                            color: '#256029',
                            padding: '3px 6px',
                            borderRadius: 12
                          }}
                        >
                          ✅ Completed on {row.date}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="date"
                        value={row.date}
                        onChange={(e) => handleDateChange(m.key, e.target.value)}
                        style={{ padding: 6, width: '100%' }}
                      />
                      {/* Quick-complete: set today if empty */}
                      {!row.date && (
                        <button
                          type="button"
                          onClick={() => {
                            const today = new Date();
                            const yyyy = today.getFullYear();
                            const mm = String(today.getMonth() + 1).padStart(2, '0');
                            const dd = String(today.getDate()).padStart(2, '0');
                            handleDateChange(m.key, `${yyyy}-${mm}-${dd}`);
                          }}
                          style={{
                            padding: '6px 8px',
                            background: '#e9eefc',
                            border: '1px solid #b8c3f7',
                            borderRadius: 6,
                            cursor: 'pointer',
                          }}
                        >
                          Today
                        </button>
                      )}
                    </div>
                  </td>
                  <td>
                    <textarea
                      placeholder="Add any remarks, reference no., payment details, etc."
                      value={row.notes}
                      onChange={(e) => handleNotesChange(m.key, e.target.value)}
                      rows={2}
                      style={{ width: '100%', padding: 6, resize: 'vertical' }}
                    />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="file"
                        onChange={(e) => handleFileChange(m.key, e.target.files?.[0] || null)}
                      />
                      {row.existingFileUrl ? (
                        <a
                          href={row.existingFileUrl}
                          target="_blank"
                          rel="noreferrer"
                          download
                          style={{ color: '#0b74de', textDecoration: 'underline' }}
                        >
                          📂 {row.existingFileName || 'Download file'}
                        </a>
                      ) : (
                        <span style={{ color: '#777' }}>No file uploaded</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleSaveOne(m.key)}
                      disabled={savingRow}
                      style={{
                        padding: '8px 12px',
                        background: savingRow ? '#999' : '#0b74de',
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        cursor: savingRow ? 'not-allowed' : 'pointer',
                        width: 110
                      }}
                    >
                      {savingRow ? 'Saving…' : 'Save'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Optional bulk save (keep or remove) */}
      <div style={{ marginTop: 12 }}>
        <button
          onClick={handleSaveAll}
          disabled={savingAll}
          style={{
            padding: '10px 16px',
            background: savingAll ? '#999' : '#0b74de',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: savingAll ? 'not-allowed' : 'pointer',
          }}
        >
          {savingAll ? 'Saving…' : 'Save All Milestones'}
        </button>
      </div>

      {/* -------- Existing delivery table -------- */}
      <h4 style={{ marginTop: 28 }}>📅 Daily Wagon Delivery Status</h4>
      <table border="1" cellPadding="10" style={{ marginTop: 10, width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
        <thead style={{ background: '#f6f6f6' }}>
          <tr>
            <th>Date</th>
            <th>Wagons Delivered</th>
          </tr>
        </thead>
        <tbody>
          {projectData.dateWiseDelivery && Object.entries(projectData.dateWiseDelivery).length > 0 ? (
            Object.entries(projectData.dateWiseDelivery).map(([date, count]) => (
              <tr key={date}>
                <td>{new Date(date).toLocaleDateString()}</td>
                <td>{count}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="2">No delivery data available</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ProjectDetailsScreen;
