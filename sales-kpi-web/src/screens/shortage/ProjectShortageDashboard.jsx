import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../../api";
import { parseProjectShortageWorkbook } from "../../utils/projectShortageWorkbook";

const ALERT_COLORS = {
  red: "#d32f2f",
  yellow: "#ed6c02",
  green: "#2e7d32",
};

const PIE_COLORS = ["#d32f2f", "#ed6c02", "#2e7d32"];
const ACT1_SUMMARY_ORDER = [
  "LCCF Bogies",
  "CTRB 'E' type",
  "Wheel sets",
  "Back Stop",
  "Draft Gear",
  "Air brake equipment",
  "Air brake pipe",
];

function StatCard({ title, value, hint }) {
  return (
    <div className="col-md-4 col-xl-2 mb-3">
      <div className="card shadow-sm h-100">
        <div className="card-body">
          <div className="text-uppercase text-muted small fw-semibold mb-2">{title}</div>
          <div className="fs-3 fw-bold">{value}</div>
          <div className="text-muted small mt-1">{hint}</div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectShortageDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [selectedProjectCode, setSelectedProjectCode] = useState("");
  const [selectedProjectData, setSelectedProjectData] = useState({ project: null, materials: [], updates: [] });
  const [uploadState, setUploadState] = useState({ busy: false, message: "", error: "" });
  const [updateForm, setUpdateForm] = useState({
    materialId: "",
    availableQty: "",
    inTransitQty: "",
    remarks: "",
    updatedBy: "Planning Team",
  });

  const projectSummary = dashboard?.projectSummary || [];
  const criticalItems = dashboard?.criticalItems || [];
  const recentUpdates = dashboard?.recentUpdates || [];
  const summary = dashboard?.summary || {};
  const isAct1Module = selectedProjectData.project?.extra?.moduleType === "act1-readiness";

  const act1ManagementSummary = useMemo(() => {
    if (!isAct1Module) return [];

    const detailMap = new Map(
      selectedProjectData.materials.map((item) => [item.extra?.summaryGroup || item.itemName, item])
    );
    const summaryRows = selectedProjectData.project?.extra?.managementSummaryRows || [];

    return ACT1_SUMMARY_ORDER.map((groupName) => {
      const detail = detailMap.get(groupName);
      const summaryRow = summaryRows.find((row) => row.itemName === groupName);

      if (!detail && !summaryRow) return null;

      return {
        itemName: groupName,
        sapCode: detail?.extra?.sapCode || summaryRow?.mappedSapCode || "",
        requiredQty: detail?.requiredQty ?? summaryRow?.requiredQty ?? 0,
        availableQty: detail?.availableQty ?? summaryRow?.availableQty ?? 0,
        availableWs: detail?.availableWs ?? summaryRow?.availableWs ?? 0,
        shortageQty: detail?.shortageQty ?? Math.max((summaryRow?.requiredQty || 0) - (summaryRow?.availableQty || 0), 0),
        totalShortageWs: detail?.extra?.totalShortageWs ?? 0,
        rakeReadiness: detail?.extra?.rakeReadiness || [],
        monthRisk: summaryRow?.monthRisk || [],
        alertLevel: detail?.alertLevel || "green",
      };
    }).filter(Boolean);
  }, [isAct1Module, selectedProjectData]);

  const act1RakeColumns = useMemo(() => {
    const first = act1ManagementSummary.find((item) => item.rakeReadiness?.length);
    return first?.rakeReadiness || [];
  }, [act1ManagementSummary]);

  async function loadProjectDetails(projectCode) {
    if (!projectCode) return;
    const res = await api.get(`/project-shortages/projects/${encodeURIComponent(projectCode)}/materials`);
    setSelectedProjectData(res.data?.data || { project: null, materials: [], updates: [] });
  }

  async function loadDashboard(preferredProjectCode = "") {
    const res = await api.get("/project-shortages/dashboard");
    const data = res.data?.data || {};
    setDashboard(data);

    const nextProjectCode =
      preferredProjectCode ||
      selectedProjectCode ||
      data.projectSummary?.[0]?.projectCode ||
      "";

    if (nextProjectCode) {
      setSelectedProjectCode(nextProjectCode);
      await loadProjectDetails(nextProjectCode);
    }
  }

  useEffect(() => {
    loadDashboard().catch((err) => {
      console.error("Project shortage dashboard load error", err);
    });
  }, []);

  const chartData = useMemo(
    () =>
      projectSummary
        .slice()
        .sort((a, b) => b.shortageItems - a.shortageItems)
        .slice(0, 8)
        .map((project) => ({
          name: project.projectCode,
          shortages: project.shortageItems,
          critical: project.criticalItems,
        })),
    [projectSummary]
  );

  const alertMix = useMemo(() => {
    const counts = { red: 0, yellow: 0, green: 0 };
    criticalItems.forEach((item) => {
      const level = item.alertLevel || "green";
      counts[level] = (counts[level] || 0) + 1;
    });

    return [
      { name: "Critical", value: counts.red, color: PIE_COLORS[0] },
      { name: "Watch", value: counts.yellow, color: PIE_COLORS[1] },
      { name: "Safe", value: counts.green, color: PIE_COLORS[2] },
    ].filter((entry) => entry.value > 0);
  }, [criticalItems]);

  async function handleWorkbookUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadState({ busy: true, message: "Parsing workbook...", error: "" });

    try {
      const parsed = await parseProjectShortageWorkbook(file);
      setUploadState({
        busy: true,
        message: `Parsed ${parsed.projects.length} project sheets and ${parsed.materials.length} material rows. Importing...`,
        error: "",
      });

      await api.post("/project-shortages/import", {
        ...parsed,
        uploadedBy: "Project Planning",
      });

      setUploadState({
        busy: false,
        message: `Imported ${parsed.projects.length} projects from ${file.name}.`,
        error: "",
      });

      await loadDashboard(parsed.projects[0]?.projectCode || "");
    } catch (err) {
      console.error("Workbook import error", err);
      setUploadState({
        busy: false,
        message: "",
        error: err?.response?.data?.message || err.message || "Workbook import failed.",
      });
    } finally {
      event.target.value = "";
    }
  }

  async function handleDailyUpdate(event) {
    event.preventDefault();
    if (!updateForm.materialId) return;

    try {
      await api.post("/project-shortages/updates", {
        materialId: updateForm.materialId,
        availableQty: Number(updateForm.availableQty),
        inTransitQty: Number(updateForm.inTransitQty),
        remarks: updateForm.remarks,
        updatedBy: updateForm.updatedBy,
      });

      setUpdateForm((prev) => ({
        ...prev,
        remarks: "",
      }));

      await loadDashboard(selectedProjectCode);
      await loadProjectDetails(selectedProjectCode);
    } catch (err) {
      console.error("Daily shortage update failed", err);
      alert(err?.response?.data?.message || "Daily update could not be saved.");
    }
  }

  return (
    <div className="container-fluid mt-3">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <div className="text-uppercase text-muted small fw-semibold">Project Shortage Module</div>
          <h3 className="mb-1">Project Shortage Dashboard</h3>
          <div className="text-muted">
            Centralized project shortage tracking, workbook import, and daily update history.
          </div>
        </div>

        <div className="card shadow-sm" style={{ minWidth: 360 }}>
          <div className="card-body">
            <div className="fw-semibold mb-2">Bulk Excel Import</div>
            <input
              type="file"
              className="form-control"
              accept=".xlsx,.xls"
              onChange={handleWorkbookUpload}
              disabled={uploadState.busy}
            />
            <div className="small text-muted mt-2">
              Upload the shortage workbook from Planning or Stores. The importer reads project sheets and planning sheets.
            </div>
            {uploadState.message ? <div className="alert alert-success py-2 mt-3 mb-0">{uploadState.message}</div> : null}
            {uploadState.error ? <div className="alert alert-danger py-2 mt-3 mb-0">{uploadState.error}</div> : null}
          </div>
        </div>
      </div>

      <div className="row">
        <StatCard title="Total Projects" value={summary.totalProjects || 0} hint="Imported active shortage sheets" />
        <StatCard title="Total Items" value={summary.totalItems || 0} hint="Tracked shortage line items" />
        <StatCard title="Shortage Items" value={summary.shortageItems || 0} hint="Rows with net shortage" />
        <StatCard title="Critical" value={summary.criticalShortages || 0} hint="Red alert items" />
        <StatCard title="At Risk Qty" value={summary.materialValueAtRisk || 0} hint="Short quantity across all projects" />
        <StatCard title="Delayed Projects" value={summary.delayedProjects || 0} hint="Projects with critical shortages" />
      </div>

      <div className="row mt-2">
        <div className="col-lg-8 mb-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Project Health Overview</h5>
                <div className="small text-muted">Top projects by shortage item count</div>
              </div>
              <div style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="shortages" fill="#1976d2" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="critical" fill="#d32f2f" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4 mb-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Alert Mix</h5>
                <div className="small text-muted">Critical material distribution</div>
              </div>
              <div style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={alertMix} dataKey="value" nameKey="name" outerRadius={110} label>
                      {alertMix.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        {isAct1Module ? (
          <div className="col-12 mb-4">
            <div className="card shadow-sm border-0">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h5 className="mb-0">ACT1 Executive Summary</h5>
                    <div className="small text-muted">
                      Management layer derived from detailed material sheet `ACT1_267`
                    </div>
                  </div>
                  <div className="small text-muted text-end">
                    <div>{selectedProjectData.project?.extra?.summaryDate || "Latest summary import"}</div>
                    {(selectedProjectData.project?.extra?.poReferences || []).map((po) => (
                      <div key={po}>{po}</div>
                    ))}
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="table table-bordered align-middle">
                    <thead>
                      <tr>
                        <th>Component Group</th>
                        <th>SAP Code</th>
                        <th>Available</th>
                        <th>Available W/S</th>
                        <th>Total Shortage</th>
                        <th>Shortage W/S</th>
                        {act1RakeColumns.map((entry) => (
                          <th key={entry.label}>{entry.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {act1ManagementSummary.map((item) => (
                        <tr key={item.itemName}>
                          <td className="fw-semibold">{item.itemName}</td>
                          <td>{item.sapCode}</td>
                          <td>{item.availableQty}</td>
                          <td>{item.availableWs}</td>
                          <td>{item.shortageQty}</td>
                          <td>{item.totalShortageWs}</td>
                          {item.rakeReadiness.map((rake) => (
                            <td key={rake.label}>
                              <span
                                className="badge"
                                style={{
                                  backgroundColor: rake.status === "OK" ? ALERT_COLORS.green : ALERT_COLORS.red,
                                }}
                              >
                                {String(rake.shortageWs || rake.availableWs || "0")}
                              </span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="col-xl-7 mb-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Project-wise Status</h5>
                <div className="small text-muted">Click a project to view materials and updates</div>
              </div>
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Client</th>
                      <th>Total Items</th>
                      <th>Shortages</th>
                      <th>Critical</th>
                      <th>Completion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectSummary.map((project) => (
                      <tr
                        key={project.projectCode}
                        style={{ cursor: "pointer" }}
                        className={selectedProjectCode === project.projectCode ? "table-primary" : ""}
                        onClick={() => {
                          setSelectedProjectCode(project.projectCode);
                          loadProjectDetails(project.projectCode).catch((err) => console.error(err));
                        }}
                      >
                        <td>
                          <div className="fw-semibold">{project.projectCode}</div>
                          <div className="small text-muted">{project.projectName}</div>
                        </td>
                        <td>{project.client || "—"}</td>
                        <td>{project.totalItems}</td>
                        <td>{project.shortageItems}</td>
                        <td className="text-danger fw-semibold">{project.criticalItems}</td>
                        <td>{project.completionPct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-5 mb-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h5 className="mb-3">Critical Shortages</h5>
              <div className="table-responsive" style={{ maxHeight: 420 }}>
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Material</th>
                      <th>Shortage</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {criticalItems.map((item) => (
                      <tr key={item._id}>
                        <td>{item.projectCode}</td>
                        <td>{item.itemName}</td>
                        <td className="fw-semibold">{item.shortageQty}</td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: ALERT_COLORS[item.alertLevel] || "#6c757d",
                            }}
                          >
                            {(item.alertLevel || "green").toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!criticalItems.length ? (
                      <tr>
                        <td colSpan="4" className="text-center text-muted py-4">
                          Import a workbook to generate project shortages.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-xl-8 mb-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="mb-0">Project Material Detail</h5>
                  <div className="small text-muted">
                    {selectedProjectData.project?.projectName || selectedProjectCode || "Select a project"}
                  </div>
                </div>
                <div className="small text-muted">
                  {selectedProjectData.materials.length} tracked items
                </div>
              </div>

              <div className="table-responsive" style={{ maxHeight: 500 }}>
                <table className="table table-sm table-striped align-middle">
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th>SAP</th>
                      <th>Required</th>
                      <th>Available</th>
                      <th>Available W/S</th>
                      <th>In Transit</th>
                      <th>Shortage</th>
                      <th>Shortage W/S</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProjectData.materials.map((item) => (
                      <tr
                        key={item._id}
                        className={updateForm.materialId === item._id ? "table-warning" : ""}
                        onClick={() =>
                          setUpdateForm((prev) => ({
                            ...prev,
                            materialId: item._id,
                            availableQty: item.availableQty,
                            inTransitQty: item.inTransitQty,
                            remarks: item.remarks || "",
                          }))
                        }
                        style={{ cursor: "pointer" }}
                      >
                        <td>
                          <div className="fw-semibold">{item.itemName}</div>
                          <div className="small text-muted">{item.extra?.summaryGroup || item.materialCode}</div>
                        </td>
                        <td>{item.extra?.sapCode || item.materialCode}</td>
                        <td>{item.requiredQty}</td>
                        <td>{item.availableQty}</td>
                        <td>{item.availableWs || 0}</td>
                        <td>{item.inTransitQty}</td>
                        <td className="fw-semibold">{item.shortageQty}</td>
                        <td>{item.extra?.totalShortageWs ?? "—"}</td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: ALERT_COLORS[item.alertLevel] || "#6c757d",
                            }}
                          >
                            {(item.alertLevel || "green").toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!selectedProjectData.materials.length ? (
                      <tr>
                        <td colSpan="8" className="text-center text-muted py-4">
                          No materials loaded for this project yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-4 mb-4">
          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <h5 className="mb-3">Daily Update Form</h5>
              <form onSubmit={handleDailyUpdate}>
                <div className="mb-3">
                  <label className="form-label">Updated By</label>
                  <input
                    className="form-control"
                    value={updateForm.updatedBy}
                    onChange={(event) => setUpdateForm((prev) => ({ ...prev, updatedBy: event.target.value }))}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Available Qty</label>
                  <input
                    type="number"
                    className="form-control"
                    value={updateForm.availableQty}
                    onChange={(event) => setUpdateForm((prev) => ({ ...prev, availableQty: event.target.value }))}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">In Transit Qty</label>
                  <input
                    type="number"
                    className="form-control"
                    value={updateForm.inTransitQty}
                    onChange={(event) => setUpdateForm((prev) => ({ ...prev, inTransitQty: event.target.value }))}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Remarks</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={updateForm.remarks}
                    onChange={(event) => setUpdateForm((prev) => ({ ...prev, remarks: event.target.value }))}
                  />
                </div>
                <button className="btn btn-primary w-100" disabled={!updateForm.materialId}>
                  Save Daily Update
                </button>
              </form>
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="mb-3">Recent Update Log</h5>
              <div className="small text-muted mb-3">Latest activity across shortage items</div>
              <div style={{ maxHeight: 260, overflowY: "auto" }}>
                {(selectedProjectData.updates.length ? selectedProjectData.updates : recentUpdates).map((update) => (
                  <div key={update._id} className="border rounded p-2 mb-2">
                    <div className="fw-semibold">{update.itemName}</div>
                    <div className="small text-muted">
                      {update.projectCode} • {update.updatedBy}
                    </div>
                    <div className="small">
                      Available: {update.previousAvailableQty} → {update.newAvailableQty}
                    </div>
                    <div className="small">
                      In Transit: {update.previousInTransitQty} → {update.newInTransitQty}
                    </div>
                    <div className="small text-muted">
                      {update.remarks || "No remarks"}
                    </div>
                  </div>
                ))}
                {!recentUpdates.length && !selectedProjectData.updates.length ? (
                  <div className="text-muted small">No updates logged yet.</div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
