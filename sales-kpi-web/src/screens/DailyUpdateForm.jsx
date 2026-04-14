import React, { useEffect, useState } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import api from '../api';
import 'react-datepicker/dist/react-datepicker.css';

const DailyUpdateForm = () => {
  const [projects, setProjects] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [formData, setFormData] = useState({
    date: new Date(),
    wagonSoldToday: '',
  });

  const [projectDetails, setProjectDetails] = useState({
    wagonType: '',
    totalOrder: 0,
    soldTillDate: 0,
  });

  // ✅ Fetch projects and past updates on mount
  useEffect(() => {
  const fetchData = async () => {
    try {
      const [projRes, updatesRes] = await Promise.all([
        api.get('/enquiries/orders'),
        api.get('/daily-updates')
      ]);

      const projectList = Array.isArray(projRes.data?.orders) ? projRes.data.orders : [];
      setProjects(projectList);

      const updates = Array.isArray(updatesRes.data) ? updatesRes.data : [];
      setUpdates(updates);

      if (projectList.length > 0) {
        setSelectedProjectId(projectList[0].projectId); // auto-select first
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  fetchData();
}, []);

  // ✅ Update project details whenever selected project or updates change
  useEffect(() => {
    if (!selectedProjectId || projects.length === 0) return;

    const selected = projects.find(p => p.projectId === selectedProjectId);
    if (!selected) return;

    const soldTillDate = updates
      .filter(u => u.projectId === selectedProjectId)
      .reduce((sum, u) => sum + (u.wagonSold || 0), 0);

    setProjectDetails({
      wagonType: selected.wagonType || '',
      totalOrder: (selected.noOfRakes || 0) * (selected.wagonsPerRake || 0),
      soldTillDate,
    });
  }, [selectedProjectId, projects, updates]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        projectId: selectedProjectId,
        date: formData.date.toISOString().split('T')[0],
        wagonSold: parseInt(formData.wagonSoldToday, 10),
      };

       await api.post('/daily-updates', payload);
    alert('✅ Update saved successfully');
      setFormData({ ...formData, wagonSoldToday: '' });

      // 🔁 Refresh data instead of reload
      const updatesRes = await api.get('/daily-updates'); // ✅ no hardcoded localhost
setUpdates(updatesRes.data || []);
    } catch (err) {
      console.error('Error submitting update:', err);
      alert('❌ Failed to save update');
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: '30px', borderRadius: '12px', background: '#f9f9f9', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '25px' }}>🚛 Daily Wagon Update</h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

        {/* Date Picker */}
        <div>
          <label><strong>📅 Date:</strong></label><br />
          <DatePicker
            selected={formData.date}
            onChange={(date) => setFormData({ ...formData, date })}
            dateFormat="yyyy-MM-dd"
            className="form-control"
          />
        </div>

        {/* Project ID Dropdown */}
        <div>
          <label><strong>🆔 Project ID:</strong></label><br />
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="form-control"
          >
            {projects.map(p => (
              <option key={p.projectId} value={p.projectId}>{p.projectId}</option>
            ))}
          </select>
        </div>

        {/* Project Details */}
        <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
          <p><strong>🛤️ Wagon Type:</strong> {projectDetails.wagonType}</p>
          <p><strong>📦 Total Wagon Order:</strong> {projectDetails.totalOrder}</p>
          <p><strong>✅ Wagons Delivered Till Date:</strong> {projectDetails.soldTillDate}</p>
        </div>

        {/* Input Field */}
        <div>
          <label><strong>📤 Wagons Delivered Today:</strong></label><br />
          <input
            type="number"
            value={formData.wagonSoldToday}
            onChange={(e) => setFormData({ ...formData, wagonSoldToday: e.target.value })}
            required
            className="form-control"
            style={{ padding: '10px', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '6px' }}
          />
        </div>

        <button
          type="submit"
          style={{
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
        >
          📥 Submit Update
        </button>
      </form>
    </div>
  );
};

export default DailyUpdateForm;
