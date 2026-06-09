import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const documentTypeOptions = ["Policy", "Procedure", "Guideline", "Manual", "Form", "SOP", "Work Instruction"];
export const statusOptions = [
  "DRAFT",
  "UNDER REVIEW",
  "APPROVED",
];

export const adminStatusOptions = [
  "APPROVED",
  "SIGNATURE DONE",
  "REJECTED",
  "CHANGE SUGGESTED",
];
export const classificationOptions = ["CONTROLLED", "UNCONTROLLED"];

export const initialDocumentControlForm = {
  documentTitle: "",
  documentNumber: "",
  documentType: "Policy",
  departmentFunction: "",
  versionNumber: "1.0",
  status: "DRAFT",
  classification: "CONTROLLED",
  dateOfIssue: "",
  effectiveDate: "",
  reviewDate: "",
  expiryDate: "",
  documentOwner: "",
  ownerPosition: "Managing Director (MD)",
  preparedBy: "",
  reviewedBy: "",
  approvedBy: "Managing Director (MD)",
  approvalDate: "",
  appliesTo: "",
  distributionList: "",
  controlledCopyNo: "",
  revisionVersion: "1.0",
  revisionDate: "",
  revisionAuthor: "",
  revisionDescription: "Initial issue",
  revisionApprovedBy: "",
};

export const initialDocumentControlFilters = {
  q: "",
  status: "",
  department: "",
};

export const formatDocumentControlDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const buildDocumentControlPdf = (entry) => {
  const doc = new jsPDF();
  doc.setFontSize(15);
  doc.text("DOCUMENT CONTROL", 14, 18);
  doc.setFontSize(10);
  doc.text("Submission cover sheet for MD approval / signatory", 14, 24);

  autoTable(doc, {
    startY: 30,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 52, fontStyle: "bold", fillColor: [240, 249, 255] },
      1: { cellWidth: 128 },
    },
    body: [
      ["Document Title", entry.documentTitle || "-"],
      ["Document Number", entry.documentNumber || "-"],
      ["Document Type", entry.documentType || "-"],
      ["Department / Function", entry.departmentFunction || "-"],
      ["Version", entry.versionNumber || "-"],
      ["Status", entry.status || "-"],
      ["Classification", entry.classification || "-"],
      ["Date of Issue", entry.dateOfIssue || "-"],
      ["Effective Date", entry.effectiveDate || "-"],
      ["Review Date", entry.reviewDate || "-"],
      ["Expiry / Sunset Date", entry.expiryDate || "-"],
      ["Document Owner", entry.documentOwner || "-"],
      ["Owner Position", entry.ownerPosition || "-"],
      ["Prepared By", entry.preparedBy || "-"],
      ["Reviewed By", entry.reviewedBy || "-"],
      ["Approved By", entry.approvedBy || "-"],
      ["Approval Date", entry.approvalDate || "-"],
      ["Applies To", entry.appliesTo || "-"],
      ["Distribution List", entry.distributionList || "-"],
      ["Controlled Copy No.", entry.controlledCopyNo || "-"],
      ["Revision Version", entry.revisionVersion || "-"],
      ["Revision Date", entry.revisionDate || "-"],
      ["Revision Author", entry.revisionAuthor || "-"],
      ["Revision Description", entry.revisionDescription || "-"],
      ["Revision Approved By", entry.revisionApprovedBy || "-"],
      ["Submitted By", `${entry.submittedByUsername || "-"} (${entry.submittedByRole || "-"})`],
      ["Submitted At", formatDocumentControlDateTime(entry.submittedAt)],
    ],
  });

  const endY = doc.lastAutoTable?.finalY || 30;
  doc.setFontSize(8);
  doc.text(
    "Controlled document: Printed copies are uncontrolled. Attach this page as the first page before MD submission.",
    14,
    endY + 10,
    { maxWidth: 180 }
  );

  doc.save(`${entry.documentNumber || "document-control"}-${entry.versionNumber || "version"}.pdf`);
};
