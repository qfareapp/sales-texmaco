// src/components/PlanningForm.jsx
import React, { useState } from "react";
import * as XLSX from "xlsx";
import api from "../api";

export default function PlanningForm({ projectId, onSaved }) {
  const [formData, setFormData] = useState({
    milestone: "",
    responsibility: "",
    planDate: "",
    actualDate: "",
    status: "Plan",
    lot: "Lot 1"
  });

  const [bulkData, setBulkData] = useState([]);

  // -------------------
  // Single entry handler
  // -------------------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/enquiries/${projectId}/milestones`, formData);
      alert("Milestone saved!");
      if (onSaved) onSaved();
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save milestone");
    }
  };

  // -------------------
  // Bulk upload handler
  // -------------------
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);

      // Expecting columns like: Milestone, Responsibility, Plan, Actual, Status, Lot
      setBulkData(json);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleBulkSave = async () => {
    try {
      await api.post(`/enquiries/${projectId}/milestones/bulk`, { milestones: bulkData });
      alert("Bulk milestones saved!");
      if (onSaved) onSaved();
    } catch (err) {
      console.error("Bulk save failed:", err);
      alert("Failed to save bulk data");
    }
  };

  return (
    <div className="planning-container">
      {/* Single entry form */}
      <form onSubmit={handleSubmit} className="planning-form">
        <h3>Add Milestone</h3>

        <label>Milestone / Activity</label>
        <input
          type="text"
          name="milestone"
          value={formData.milestone}
          onChange={handleChange}
          required
        />

        <label>Responsibility</label>
        <input
          type="text"
          name="responsibility"
          value={formData.responsibility}
          onChange={handleChange}
          required
        />

        <label>Planned Date</label>
        <input
          type="date"
          name="planDate"
          value={formData.planDate}
          onChange={handleChange}
          required
        />

        <label>Actual Date</label>
        <input
          type="date"
          name="actualDate"
          value={formData.actualDate}
          onChange={handleChange}
        />

        <label>Status</label>
        <select
          name="status"
          value={formData.status}
          onChange={handleChange}
        >
          <option value="Plan">Plan</option>
          <option value="WIP">WIP</option>
          <option value="Delay">Delay</option>
          <option value="Shifted">Shifted</option>
          <option value="Completed">Completed</option>
        </select>

        <label>Lot</label>
        <select
          name="lot"
          value={formData.lot}
          onChange={handleChange}
        >
          <option value="Lot 1">Lot 1</option>
          <option value="Lot 2">Lot 2</option>
          <option value="Lot 3">Lot 3</option>
        </select>

        <button type="submit">Save</button>
      </form>

      {/* Bulk upload section */}
      <div className="bulk-upload">
        <h3>Bulk Upload</h3>
        <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />

        {bulkData.length > 0 && (
          <>
            <h4>Preview ({bulkData.length} records)</h4>
            <table className="preview-table">
              <thead>
                <tr>
                  {Object.keys(bulkData[0]).map((key) => (
                    <th key={key}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bulkData.slice(0, 5).map((row, idx) => (
                  <tr key={idx}>
                    {Object.values(row).map((val, i) => (
                      <td key={i}>{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={handleBulkSave}>Save All</button>
          </>
        )}
      </div>
    </div>
  );
}
