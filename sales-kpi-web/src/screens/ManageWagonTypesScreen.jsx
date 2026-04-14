import React, { useState, useEffect } from 'react';
import api from '../api';
import axios from 'axios';

const partsList = ['Underframe', 'Body Side', 'Body End', 'Roof', 'Wheel Set', 'Bogie', 'CRF Set', 'Coupler (Including DG 71)', 'Barrel', 'Brake System (ABE, SAB, ABP)', 'Huck Bolt (Lock Bolt)', 'Steel Set', 'Hinge', 'Sub Assebly (Matching Set)', 'Lashing Chain', 'Door'];
const stagesList = ['Floor Fit & Weilding', 'Reverse Welding', 'Air brake pipe fitting', 'Final Visual', 'DM', 'Boxing', 'BMP', 'Wheeling & Visual Clearence', 'Shot Blasting & Primer', 'Final Painting & Lettering', 'Air Brake Testing', 'APD', 'PDI'];

const ManageWagonTypesScreen = () => {
  const [wagonType, setWagonType] = useState('');
  const [parts, setParts] = useState([{ name: '', total: '' }]);
  const [stages, setStages] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    const res = await api.get('/wagons');
    setConfigs(res.data);
  };

  const handlePartChange = (index, key, value) => {
    const updated = [...parts];
    updated[index][key] = value;
    setParts(updated);
  };

  const handleStageChange = (stageIndex, value) => {
    const updated = [...stages];
    updated[stageIndex].name = value;
    setStages(updated);
  };

  const handleStagePartChange = (stageIndex, partIndex, key, value) => {
    const updated = [...stages];
    updated[stageIndex].partUsage[partIndex][key] = value;
    setStages(updated);
  };

  const addPart = () => setParts([...parts, { name: '', total: '' }]);
  const addStage = () => setStages([...stages, { name: '', partUsage: [{ name: '', used: '' }] }]);
  const addStagePart = (stageIndex) => {
    const updated = [...stages];
    updated[stageIndex].partUsage.push({ name: '', used: '' });
    setStages(updated);
  };

  const resetForm = () => {
    setWagonType('');
    setParts([{ name: '', total: '' }]);
    setStages([]);
    setEditId(null);
  };

  const handleSubmit = async () => {
    const payload = {
      wagonType,
      parts: parts.filter(p => p.name && p.total),
      stages: stages.map(s => ({
        name: s.name,
        partUsage: s.partUsage.filter(p => p.name && p.used)
      }))
    };

    if (editId) {
  await api.post('/wagons', payload);   // use POST for both new + update
} else {
  await api.post('/wagons', payload);
}

    fetchConfigs();
    resetForm();
  };

  const handleEdit = (config) => {
    setEditId(config._id);
    setWagonType(config.wagonType);
    setParts(config.parts);
    setStages(config.stages);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this configuration?')) {
      await api.delete(`/wagons/${id}`);
      fetchConfigs();
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>{editId ? '✏️ Edit Wagon Type' : '➕ Add Wagon Type'}</h2>
      <input placeholder="Wagon Type" value={wagonType} onChange={(e) => setWagonType(e.target.value)} />

      <h3>Parts (Total Required)</h3>
      {parts.map((p, i) => (
        <div key={i} style={{ display: 'flex', gap: 10 }}>
          <select value={p.name} onChange={(e) => handlePartChange(i, 'name', e.target.value)}>
            <option value="">Select Part</option>
            {partsList.map(part => <option key={part} value={part}>{part}</option>)}
          </select>
          <input type="number" min="1" placeholder="Total Nos" value={p.total} onChange={(e) => handlePartChange(i, 'total', e.target.value)} />
        </div>
      ))}
      <button onClick={addPart}>➕ Add Part</button>

      <h3>Stages & Part Usage</h3>
      {stages.map((stage, sIndex) => (
        <div key={sIndex} style={{ border: '1px solid #ccc', marginBottom: 15, padding: 10 }}>
          <select value={stage.name} onChange={(e) => handleStageChange(sIndex, e.target.value)}>
            <option value="">Select Stage</option>
            {stagesList.map(stage => <option key={stage} value={stage}>{stage}</option>)}
          </select>
          {stage.partUsage.map((p, pIndex) => (
            <div key={pIndex} style={{ display: 'flex', gap: 10 }}>
              <select value={p.name} onChange={(e) => handleStagePartChange(sIndex, pIndex, 'name', e.target.value)}>
                <option value="">Select Part</option>
                {partsList.map(part => <option key={part} value={part}>{part}</option>)}
              </select>
              <input type="number" placeholder="Used Nos." value={p.used} onChange={(e) => handleStagePartChange(sIndex, pIndex, 'used', e.target.value)} />
            </div>
          ))}
          <button onClick={() => addStagePart(sIndex)}>➕ Add Part to Stage</button>
        </div>
      ))}
      <button onClick={addStage}>➕ Add Stage</button>

      <br />
      <button onClick={handleSubmit}>{editId ? '✅ Update' : '💾 Save Configuration'}</button>
      {editId && <button onClick={resetForm} style={{ marginLeft: '10px' }}>❌ Cancel Edit</button>}

      <h2 style={{ marginTop: 40 }}>📋 Saved Configurations</h2>
      <table border="1" cellPadding="6" cellSpacing="0">
        <thead>
          <tr>
            <th>Wagon Type</th>
            <th>Parts</th>
            <th>Stages</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {configs.map(config => (
            <tr key={config._id}>
              <td>{config.wagonType}</td>
              <td>
                {config.parts.map(p => `${p.name} (${p.total})`).join(', ')}
              </td>
              <td>
                {config.stages.map(s => `${s.name}: [${s.partUsage.map(p => `${p.name} (${p.used})`).join(', ')}]`).join(' | ')}
              </td>
              <td>
                <button onClick={() => handleEdit(config)}>✏️ Edit</button>{' '}
                <button onClick={() => handleDelete(config._id)}>🗑️ Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ManageWagonTypesScreen;
