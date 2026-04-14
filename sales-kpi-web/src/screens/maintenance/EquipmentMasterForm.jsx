import { useState } from "react";
import api from "../../api";

export default function EquipmentMasterForm() {
  const [equipments, setEquipments] = useState([
    {
      equipmentName: "",
      parts: [
        { name: "", required: "", available: "" }
      ]
    }
  ]);

  const addEquipmentRow = () => {
    setEquipments([
      ...equipments,
      {
        equipmentName: "",
        parts: [{ name: "", required: "", available: "" }]
      }
    ]);
  };

  const addPartRow = (equipmentIndex) => {
    const updated = [...equipments];
    updated[equipmentIndex].parts.push({
      name: "",
      required: "",
      available: ""
    });
    setEquipments(updated);
  };

  const updateEquipmentField = (index, field, value) => {
    const updated = [...equipments];
    updated[index][field] = value;
    setEquipments(updated);
  };

  const updatePartField = (eqIdx, partIdx, field, value) => {
    const updated = [...equipments];
    updated[eqIdx].parts[partIdx][field] = value;
    setEquipments(updated);
  };

  // Auto-calc matching sets
  const calculateMatchingSets = (parts) => {
  if (!parts.length) return 0;

  const setCounts = parts.map((p) => {
    const required = parseFloat(p.required);
    const available = parseFloat(p.available);

    // Required must be > 0
    if (!required || required <= 0) return 0;

    // Available must be >= 0
    if (isNaN(available) || available < 0) return 0;

    return Math.floor(available / required);
  });

  return Math.min(...setCounts);
};


  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await api.post("/maintenance/equipment-master", {
        equipments: equipments.map((eq) => ({
          ...eq,
          matchingSets: calculateMatchingSets(eq.parts),
        }))
      });

      alert("Equipment Master Saved Successfully!");
    } catch (err) {
      console.error(err);
      alert("Error saving equipment master");
    }
  };

  return (
    <div className="container mt-4">
      <h3>Equipment Master – Auto Matching Sets</h3>

      <form onSubmit={handleSubmit}>
        {equipments.map((eq, eqIdx) => (
          <div key={eqIdx} className="card p-3 mt-4 shadow-sm">
            <h5 className="fw-bold">Equipment #{eqIdx + 1}</h5>

            <div className="row mt-2">
              <div className="col-md-6">
                <label className="form-label fw-semibold">Equipment Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={eq.equipmentName}
                  onChange={(e) =>
                    updateEquipmentField(eqIdx, "equipmentName", e.target.value)
                  }
                  placeholder="Enter Equipment Name"
                />
              </div>
            </div>

            {/* Auto Output */}
            <div className="alert alert-info mt-3">
              <strong>Matching Sets = </strong>
              {calculateMatchingSets(eq.parts)}
            </div>

            {/* Parts Table */}
            <div className="table-responsive mt-3">
              <table className="table table-bordered text-center align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Part Name</th>
                    <th>Required per Set</th>
                    <th>Available Quantity</th>
                    <th>Sets Possible</th>
                  </tr>
                </thead>

                <tbody>
                  {eq.parts.map((part, partIdx) => {
                    const sets =
                      part.required && part.available
                        ? Math.floor(part.available / part.required)
                        : 0;

                    return (
                      <tr key={partIdx}>
                        <td>
                          <input
                            type="text"
                            className="form-control"
                            value={part.name}
                            onChange={(e) =>
                              updatePartField(
                                eqIdx,
                                partIdx,
                                "name",
                                e.target.value
                              )
                            }
                            placeholder="Component name"
                          />
                        </td>

                        <td>
                          <input
                            type="number"
                            className="form-control"
                            value={part.required}
                            onChange={(e) =>
                              updatePartField(
                                eqIdx,
                                partIdx,
                                "required",
                                e.target.value
                              )
                            }
                            placeholder="Required per set"
                          />
                        </td>

                        <td>
                          <input
                            type="number"
                            className="form-control"
                            value={part.available}
                            onChange={(e) =>
                              updatePartField(
                                eqIdx,
                                partIdx,
                                "available",
                                e.target.value
                              )
                            }
                            placeholder="Available qty"
                          />
                        </td>

                        <td className="fw-bold">{sets}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => addPartRow(eqIdx)}
            >
              ➕ Add Component
            </button>
          </div>
        ))}

        {/* Add new equipment */}
        <button
          type="button"
          className="btn btn-warning mt-4"
          onClick={addEquipmentRow}
        >
          ➕ Add New Equipment
        </button>

        <br />

        <button type="submit" className="btn btn-primary mt-3">
          💾 Save All Equipments
        </button>
      </form>
    </div>
  );
}
