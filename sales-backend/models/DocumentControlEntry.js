const mongoose = require("mongoose");

const DocumentControlEntrySchema = new mongoose.Schema(
  {
    documentTitle: { type: String, required: true, trim: true },
    documentNumber: { type: String, required: true, trim: true, index: true },
    documentType: { type: String, default: "", trim: true },
    departmentFunction: { type: String, default: "", trim: true, index: true },
    versionNumber: { type: String, default: "1.0", trim: true },
    status: { type: String, default: "DRAFT", trim: true, index: true },
    adminStatus: { type: String, default: "", trim: true, index: true },
    classification: { type: String, default: "CONTROLLED", trim: true },
    dateOfIssue: { type: String, default: "", trim: true },
    effectiveDate: { type: String, default: "", trim: true },
    reviewDate: { type: String, default: "", trim: true },
    expiryDate: { type: String, default: "", trim: true },
    documentOwner: { type: String, default: "", trim: true },
    ownerPosition: { type: String, default: "Managing Director (MD)", trim: true },
    preparedBy: { type: String, default: "", trim: true },
    reviewedBy: { type: String, default: "", trim: true },
    approvedBy: { type: String, default: "", trim: true },
    approvalDate: { type: String, default: "", trim: true },
    appliesTo: { type: String, default: "", trim: true },
    distributionList: { type: String, default: "", trim: true },
    controlledCopyNo: { type: String, default: "", trim: true },
    revisionVersion: { type: String, default: "1.0", trim: true },
    revisionDate: { type: String, default: "", trim: true },
    revisionAuthor: { type: String, default: "", trim: true },
    revisionDescription: { type: String, default: "Initial issue", trim: true },
    revisionApprovedBy: { type: String, default: "", trim: true },
    submittedByUsername: { type: String, default: "", trim: true, index: true },
    submittedByRole: { type: String, default: "", trim: true },
    submittedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DocumentControlEntry", DocumentControlEntrySchema);
