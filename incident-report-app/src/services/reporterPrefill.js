export const REPORTER_FIELDS = [
  "reportedByName", "mobileNumber", "departmentContractor", "empId", "department", "contractorName",
];

export function inspectorReporterDefaults(profile, saved = {}, selectedType = "") {
  const reporterType = selectedType || saved?.departmentContractor || "";
  return {
    reportedByName: profile?.name || saved?.name || "",
    mobileNumber: saved?.mobileNumber || "",
    departmentContractor: reporterType,
    empId: reporterType === "Employee" ? saved?.empId || "" : "",
    department: reporterType === "Employee" ? saved?.department || "" : "",
    contractorName: reporterType === "Contractor" ? profile?.agency || saved?.contractorName || "" : "",
  };
}

export function applyReporterDefaults(form, defaults, editedFields) {
  const next = { ...form };
  for (const field of REPORTER_FIELDS) {
    if (!editedFields.has(field)) next[field] = defaults[field] || "";
  }
  return next;
}
