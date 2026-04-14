// src/screens/PlanningDashboard.jsx
import React, { useEffect, useState } from "react";
import api from "../api";
import PlanningForm from "../components/PlanningForm";
import ProjectGantt from "../components/ProjectGantt";

export default function PlanningDashboard() {
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await api.get("/enquiries/orders"); // confirmed orders
        setProjects(res.data.orders || []);
        if (res.data.orders.length > 0) {
          setSelected(res.data.orders[0].projectId); // auto-select first
        }
      } catch (err) {
        console.error("Failed to load confirmed projects", err);
      }
    };
    fetchProjects();
  }, []);

  return (
    <div className="container mt-4">
      <h2>Project Planning</h2>

      <label>Select Project:</label>
      <select
        className="form-select w-auto d-inline-block ms-2"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        {projects.map((p) => (
          <option key={p.projectId} value={p.projectId}>
            {p.orderId} — {p.clientName} ({p.product})
          </option>
        ))}
      </select>

      {selected && (
        <div className="row mt-4">
          <div className="col-md-6">
            <PlanningForm projectId={selected} />
          </div>
          <div className="col-md-6">
            <ProjectGantt projectId={selected} />
          </div>
        </div>
      )}
    </div>
  );
}
