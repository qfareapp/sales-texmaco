// src/screens/maintenance/EquipmentMaintenanceScreen.jsx
import { useEffect, useState } from "react";
import api from "../../api.js";

const SLOT_LABELS = {
  "6_7": "6am–7am",
  "7_8": "7am–8am",
  "8_9": "8am–9am",
  "10_11": "10am–11am",
  "11_12": "11am–12pm",
  "12_1": "12pm–1pm",
};

const PRESET_REASONS = [
  "Power failure",
  "Mechanical fault",
  "Hydraulic leak",
  "Operator unavailable",
  "Material unavailable",
  "Preventive maintenance",
  "Emergency breakdown",
  "Software/PLC failure",
  "Safety lockout",
  "Others",
];

export default function EquipmentMaintenanceScreen() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [equipmentId, setEquipmentId] = useState("");
  const [equipmentList, setEquipmentList] = useState([]);
  const [slots, setSlots] = useState({
    "6_7": { status: "na", reason: "" },
    "7_8": { status: "na", reason: "" },
    "8_9": { status: "na", reason: "" },
    "10_11": { status: "na", reason: "" },
    "11_12": { status: "na", reason: "" },
    "12_1": { status: "na", reason: "" },
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
  (async () => {
    try {
      const res = await api.get("/maintenance/equipment-master/all");
      setEquipmentList(res.data?.data || []);
    } catch (err) {
      console.error("Error loading equipment list", err);
    }
  })();
}, []);


  const handleStatusChange = (slotKey, status) => {
    setSlots((prev) => ({
      ...prev,
      [slotKey]: {
        status,
        reason: status === "working" ? "" : prev[slotKey].reason,
      },
    }));
  };

  const handleReasonChange = (slotKey, reason) => {
    setSlots((prev) => ({
      ...prev,
      [slotKey]: { ...prev[slotKey], reason },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!equipmentId) return alert("Select equipment first");

    try {
      setSaving(true);
        console.log("Submitting slots:", JSON.stringify(slots, null, 2));
      await api.post("/maintenance/equipment", {
  date,
  equipmentName: equipmentId,
  slots,
});
      alert("Maintenance log saved successfully");
    } catch (err) {
      console.error(err);
      alert("Error saving log");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-fluid mt-3">
      <h4>Equipment Maintenance Log</h4>

      <form onSubmit={handleSubmit} className="mt-3">
        <div className="row mb-3">
          <div className="col-md-3">
            <label className="form-label">Date</label>
            <input
              type="date"
              className="form-control"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="col-md-5">
            <label className="form-label">Equipment</label>
            <select
  className="form-select"
  value={equipmentId}
  onChange={(e) => setEquipmentId(e.target.value)}
>
  <option value="">Select Equipment</option>
  {equipmentList.map((eq) => (
    <option key={eq._id} value={eq.equipmentName}>
      {eq.equipmentName}
    </option>
  ))}
</select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-bordered align-middle text-center">
            <thead>
              <tr>
                <th>Time Slot</th>
                <th>Working</th>
                <th>Not Working</th>
                <th>Reason for Not Working</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(SLOT_LABELS).map(([key, label]) => (
                <tr key={key}>
                  <td className="fw-semibold">{label}</td>

                  <td>
                    <input
                      type="radio"
                      name={`status-${key}`}
                      checked={slots[key].status === "working"}
                      onChange={() => handleStatusChange(key, "working")}
                    />
                  </td>

                  <td>
                    <input
                      type="radio"
                      name={`status-${key}`}
                      checked={slots[key].status === "notWorking"}
                      onChange={() => handleStatusChange(key, "notWorking")}
                    />
                  </td>

                  <td>
                    <select
                      className="form-select"
                      disabled={slots[key].status !== "notWorking"}
                      value={slots[key].reason || ""}
                      onChange={(e) => handleReasonChange(key, e.target.value)}
                    >
                      <option value="">Select Reason</option>
                      {PRESET_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="submit"
          className="btn btn-primary mt-2"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Maintenance Log"}
        </button>
      </form>
    </div>
  );
}
