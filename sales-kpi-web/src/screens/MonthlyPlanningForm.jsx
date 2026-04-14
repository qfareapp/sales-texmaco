import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import api from '../api';
import 'react-datepicker/dist/react-datepicker.css';

const MonthlyPlanningForm = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [month, setMonth] = useState(null);
  const [projectDetails, setProjectDetails] = useState({});
  const [monthlyTarget, setMonthlyTarget] = useState('');

  // 🔹 Fetch confirmed projects
  useEffect(() => {
    api.get('/enquiries')
      .then(res => {
        const confirmedProjects = res.data.filter(e => e.stage === 'Confirmed');
        setProjects(confirmedProjects);
      })
      .catch(err => console.error('❌ Error fetching projects:', err));
  }, []);

  // 🔹 Auto-fill details when project changes
  useEffect(() => {
    if (selectedProjectId) {
      const details = projects.find(p => p.projectId === selectedProjectId);
      if (details) setProjectDetails(details);
    }
  }, [selectedProjectId, projects]);

  // 🔹 Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!month) {
      alert('Please select a month');
      return;
    }

    const year = month.getFullYear();
    const monthNum = month.getMonth() + 1; // 1–12

    const payload = {
      projectId: selectedProjectId,
      clientName: projectDetails.clientName,
      clientType: projectDetails.clientType,
      wagonType: projectDetails.wagonType,
      month: `${year}-${String(monthNum).padStart(2, '0')}`, // "YYYY-MM"
      year,
      monthNum,
      monthlyTarget: Number(monthlyTarget),
    };

    try {
      await api.post('/production/monthly-planning', payload);
      alert('✅ Monthly plan submitted!');
      setSelectedProjectId('');
      setMonth(null);
      setMonthlyTarget('');
      setProjectDetails({});
    } catch (err) {
      console.error('❌ Submission error:', err);
      alert('❌ Failed to submit monthly plan.');
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
      <h2>📅 Monthly Planning</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        {/* Project Selector */}
        <div>
          <label><strong>Project ID:</strong></label><br />
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            required
            style={{ width: '100%', padding: 8 }}
          >
            <option value="">-- Select --</option>
            {projects.map(p => (
              <option key={p._id} value={p.projectId}>
                {p.projectId}
              </option>
            ))}
          </select>
        </div>

        {/* Month Picker */}
        <div>
          <label><strong>Month:</strong></label><br />
          <DatePicker
            selected={month}
            onChange={(date) => setMonth(date)}
            dateFormat="MM/yyyy"
            showMonthYearPicker
            required
            placeholderText="Select Month"
          />
        </div>

        {/* Project Details */}
        {selectedProjectId && (
          <div style={{ background: '#f9f9f9', padding: 15, borderRadius: 8 }}>
            <p><strong>Client:</strong> {projectDetails.clientName}</p>
            <p><strong>Start Date:</strong> {projectDetails.deliveryStart ? new Date(projectDetails.deliveryStart).toLocaleDateString() : 'N/A'}</p>
            <p><strong>End Date:</strong> {projectDetails.deliveryEnd ? new Date(projectDetails.deliveryEnd).toLocaleDateString() : 'N/A'}</p>
            <p><strong>Total Wagons:</strong> {(projectDetails.noOfRakes || 0) * (projectDetails.wagonsPerRake || 0)}</p>
            <p><strong>Wagons Sold:</strong> {projectDetails.wagonsSoldTillDate || 0}</p>
          </div>
        )}

        {/* Target Input */}
        <div>
          <label><strong>Monthly Target (No. of Wagons):</strong></label><br />
          <input
            type="number"
            value={monthlyTarget}
            onChange={(e) => setMonthlyTarget(e.target.value)}
            min="1"
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        <button
          type="submit"
          style={{
            marginTop: 10,
            padding: '10px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          ✅ Submit Plan
        </button>
      </form>
    </div>
  );
};

export default MonthlyPlanningForm;
