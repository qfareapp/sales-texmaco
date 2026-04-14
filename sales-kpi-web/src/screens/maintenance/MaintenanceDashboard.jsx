// src/screens/maintenance/MaintenanceDashboard.jsx
import { useEffect, useState } from "react";
import api from "../../api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";

const COLORS = ["#0088FE", "#FF8042", "#00C49F", "#FFBB28", "#AA336A", "#AAFF00"];

export default function MaintenanceDashboard() {
  const [summary, setSummary] = useState([]);
  const [failureReasons, setFailureReasons] = useState([]);
  const [downtimeTrend, setDowntimeTrend] = useState([]);
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [showPopup, setShowPopup] = useState(false);
const [popupData, setPopupData] = useState(null);
const [lowStock, setLowStock] = useState([]);

  useEffect(() => {
  (async () => {
    await loadDashboardData();   // existing dashboard data

    // 🔔 fetch low stock components
    try {
      const res = await api.get("/inventory/components/low-stock");
      console.log("LOW STOCK RESPONSE:", res.data); 
      setLowStock(res.data?.data || []);
    } catch (err) {
      console.error("Low stock load error", err);
    }
  })();
}, [from, to]);


  const loadDashboardData = async () => {
    try {
      // 1) Summary uptime
      const res1 = await api.get("/maintenance/equipment/summary", {
        params: { from, to },
      });
      setSummary(res1.data.data || []);

      // 2) Failure reasons distribution
      const res2 = await api.get("/maintenance/equipment", {
        params: { from, to },
      });
      const allLogs = res2.data.data || [];

      const reasonCount = {};
      allLogs.forEach((log) => {
        Object.values(log.slots).forEach((s) => {
          if (s.status === "notWorking" && s.reason) {
            reasonCount[s.reason] = (reasonCount[s.reason] || 0) + 1;
          }
        });
      });

      setFailureReasons(
        Object.entries(reasonCount).map(([reason, count]) => ({
          name: reason,
          value: count,
        }))
      );

      // 3) Downtime trend by date
      const trendMap = {};
      allLogs.forEach((log) => {
        const dateKey = new Date(log.date).toISOString().slice(0, 10);

        if (!trendMap[dateKey]) trendMap[dateKey] = 0;

        Object.values(log.slots).forEach((s) => {
          if (s.status === "notWorking") trendMap[dateKey]++;
        });
      });

      const formattedTrend = Object.entries(trendMap).map(([date, hours]) => ({
        date,
        hours,
      }));

      setDowntimeTrend(formattedTrend);
    } catch (err) {
      console.error("Dashboard load error", err);
    }
  };
  const openEquipmentPopup = async (equipmentId) => {
  try {
    const res = await api.get("/maintenance/equipment/analytics", {
      params: { equipmentName: equipmentId, from, to },
    });

    setPopupData(res.data.data);
    setShowPopup(true);
  } catch (err) {
    console.error("Popup load error", err);
  }
};

  return (
    <div className="container-fluid mt-3">

      <h3 className="mb-3">🧰 Maintenance Dashboard</h3>
      {/* Button to Equipment Details Page */}
<div className="d-flex justify-content-end mb-3">
  <a
    href="/maintenance/equipment-master-list"
    className="btn btn-outline-primary fw-semibold"
  >
    📦 View All Equipments & Components
  </a>
</div>

      {/* Filters */}
      <div className="card p-3 shadow-sm mb-4">
        <div className="row">
          <div className="col-md-3">
            <label className="form-label">From Date</label>
            <input
              type="date"
              className="form-control"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label">To Date</label>
            <input
              type="date"
              className="form-control"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>
      </div>
{/* 🔔 LOW STOCK SCROLLING TICKER — ADD HERE */}
{lowStock.length > 0 && (
  <div className="low-stock-ticker mb-3">
    <div className="ticker-content">
      {lowStock.map((item, i) => (
        <span key={i} className="ticker-item">
          ⚠️ {item.componentName || item.name} — {item.available} units left
        </span>
      ))}
    </div>
  </div>
)}

      {/* KPI Cards */}
      <div className="row">
        <div className="col-md-3">
          <div className="card shadow-sm p-3 text-center">
            <h6>Total Equipments</h6>
            <h3>{summary.length}</h3>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm p-3 text-center">
            <h6>Avg Uptime (%)</h6>
            <h3>
              {summary.length
                ? (summary.reduce((a, b) => a + b.uptime, 0) / summary.length).toFixed(1)
                : 0}
            </h3>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm p-3 text-center">
            <h6>Frequent Breakdown</h6>
            <h5 className="text-danger">
              {summary.length
                ? [...summary].sort((a, b) => a.uptime - b.uptime)[0]._id
                : "—"}
            </h5>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm p-3 text-center">
            <h6>Top Reason</h6>
            <h5 className="text-primary">
              {failureReasons.length
  ? [...failureReasons].sort((a, b) => b.value - a.value)[0].name
  : "—"}
            </h5>
          </div>
        </div>
      </div>

      {/* Availability Table */}
      <div className="card mt-4 p-3 shadow-sm">
        <h5>Equipment Availability</h5>
        <div className="table-responsive mt-3">
          <table className="table table-bordered text-center">
            <thead>
              <tr>
                <th>Equipment</th>
                <th>Uptime %</th>
                <th>Working Slots</th>
                <th>Downtime Slots</th>
              </tr>
            </thead>
            <tbody>
  {summary.map((item) => (
    <tr key={item._id}>
 <td
    className="text-primary fw-semibold"
    style={{ cursor: "pointer", textDecoration: "underline" }}
    onClick={() => openEquipmentPopup(item._id)}
  >
    {item._id}
  </td>

  <td>{item.uptime.toFixed(1)}%</td>
  <td>{item.working}</td>
  <td className="text-danger fw-bold">{item.notWorking}</td>
</tr>
  ))}
</tbody>

          </table>
        </div>
      </div>

      {/* Downtime Trend */}
      <div className="card mt-4 p-3 shadow-sm">
        <h5>Downtime Trend (Hours by Date)</h5>
        <BarChart
          width={600}
          height={300}
          data={downtimeTrend}
          margin={{ top: 20, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="hours" fill="#FF6B6B" />
        </BarChart>
      </div>

      {/* Failure Reason Pie Chart */}
      <div className="card mt-4 p-3 shadow-sm">
        <h5>Failure Reasons Distribution</h5>
        <PieChart width={500} height={300}>
          <Pie
  data={[...failureReasons]}
            cx={200}
            cy={150}
            labelLine={false}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
          >
            {failureReasons.map((entry, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </div>
      {showPopup && popupData && (
  <div
    className="popup-overlay d-flex justify-content-center align-items-center"
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.4)",
      zIndex: 2000,
    }}
  >
    <div
      className="card p-4"
      style={{ width: "700px", maxHeight: "90vh", overflowY: "auto" }}
    >
      <div className="d-flex justify-content-between">
        <h4>📊 Equipment Analytics – {popupData.equipmentId}</h4>
        <button className="btn btn-danger btn-sm" onClick={() => setShowPopup(false)}>
          Close
        </button>
      </div>

      <hr />

      <h6>Total Operational Hours: {popupData.totalOperationalHours}</h6>
      <h6>Total Downtime Hours: {popupData.totalDowntimeHours}</h6>
      <h6>Top Downtime Reason: 
        <span className="text-danger fw-bold ms-1">{popupData.topReason || "—"}</span>
      </h6>

      <hr />

      {/* Downtime Trend Chart */}
      <h5>Downtime Trend</h5>
      <BarChart width={600} height={250} data={popupData.downtimeTrend}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="hours" fill="#FF6B6B" />
      </BarChart>

      <hr />

      {/* Breakdown Reasons */}
      <h5>Breakdown Reasons Distribution</h5>
      <PieChart width={400} height={300}>
        <Pie
          data={popupData.breakdownReasons}
          dataKey="value"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label
        >
          {popupData.breakdownReasons.map((entry, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </div>
  </div>
)}

    </div>
  );
}
