// src/screens/maintenance/EquipmentMasterList.jsx
import { useEffect, useState } from "react";
import api from "../../api";

export default function EquipmentMasterList() {
  const [list, setList] = useState([]);

  // Popup state
  const [showModal, setShowModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [adjustments, setAdjustments] = useState({}); // track qty changes

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await api.get("/maintenance/equipment-master/all");
      setList(res.data?.data || []);
    } catch (err) {
      console.error("Error loading equipment master", err);
    }
  };

  // Color coding
  const getColorClass = (sets) => {
    if (sets <= 1) return "bg-danger text-white fw-bold"; // RED
    if (sets <= 4) return "bg-warning fw-bold"; // YELLOW
    return "bg-success text-white fw-bold"; // GREEN
  };

  // Open popup at equipment level
  const openModal = (equipment) => {
    setSelectedEquipment(equipment);
    const initialAdjustments = {};

    equipment.parts.forEach((p) => {
      initialAdjustments[p.name] = 0; // default adjustment
    });

    setAdjustments(initialAdjustments);
    setShowModal(true);
  };

  // Calculate matching sets
  const calculateMatchingSets = (parts) => {
    const counts = parts.map((p) => {
      const r = Number(p.required);
      const a = Number(p.available);
      if (!r || !a) return 0;
      return Math.floor(a / r);
    });
    return Math.min(...counts);
  };

  // Save all component updates
  const handleSaveUpdates = async () => {
    const updatedParts = selectedEquipment.parts.map((p) => ({
      ...p,
      available: Number(p.available) + Number(adjustments[p.name] || 0),
    }));

    const updatedEquipment = {
      ...selectedEquipment,
      parts: updatedParts,
      matchingSets: calculateMatchingSets(updatedParts),
    };

    try {
      await api.post("/maintenance/equipment-master", {
        equipments: [updatedEquipment],
      });

      alert("Stock updated successfully!");
      setShowModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Error updating stock");
    }
  };

  return (
    <div className="container mt-4">
      <h3>📦 Equipment Details & Component Stocks</h3>

      <div className="table-responsive mt-4">
        <table className="table table-bordered text-center align-middle">
          <thead className="table-light">
            <tr>
              <th>Equipment Name</th>
              <th>Overall Matching Sets</th>
              <th>Components</th>
              <th>Update Stock</th>
            </tr>
          </thead>

          <tbody>
            {list.map((eq) => (
              <tr key={eq._id}>
                <td className="fw-bold">{eq.equipmentName}</td>

                <td className="fw-bold text-primary">{eq.matchingSets}</td>

                <td className="text-start">
                  <ul className="list-unstyled">
                    {eq.parts.map((p, i) => {
                      const required = Number(p.required);
                      const available = Number(p.available);
                      const sets =
                        required > 0 ? Math.floor(available / required) : 0;

                      return (
                        <li
                          key={i}
                          className="mb-2 p-2 rounded border d-flex justify-content-between align-items-center"
                        >
                          <span>
                            <strong>{p.name}</strong> — Required: {required},
                            Available: {available}
                          </span>

                          <span className={`px-2 rounded ${getColorClass(sets)}`}>
                            {sets} set(s)
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </td>

                <td>
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => openModal(eq)}
                  >
                    Update Stock
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Popup Modal (Equipment Level) */}
      {showModal && selectedEquipment && (
        <div
          className="modal d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5>
                  Update Stock —{" "}
                  <strong>{selectedEquipment.equipmentName}</strong>
                </h5>
                <button
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>

              <div className="modal-body">
                <table className="table table-bordered text-center">
                  <thead>
                    <tr>
                      <th>Component</th>
                      <th>Required</th>
                      <th>Available</th>
                      <th>Adjust (+ / -)</th>
                    </tr>
                  </thead>

                  <tbody>
                    {selectedEquipment.parts.map((p, idx) => (
                      <tr key={idx}>
                        <td>{p.name}</td>
                        <td>{p.required}</td>
                        <td>{p.available}</td>
                        <td>
                          <input
                            type="number"
                            className="form-control"
                            value={adjustments[p.name]}
                            onChange={(e) =>
                              setAdjustments({
                                ...adjustments,
                                [p.name]: e.target.value,
                              })
                            }
                            placeholder="0"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleSaveUpdates}>
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
