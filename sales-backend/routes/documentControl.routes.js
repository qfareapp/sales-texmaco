const express = require("express");
const DocumentControlEntry = require("../models/DocumentControlEntry");

const router = express.Router();

const asText = (value) => String(value || "").trim();
const asUpperText = (value) => asText(value).toUpperCase();

router.get("/entries", async (req, res) => {
  try {
    const { q = "", status = "", department = "" } = req.query;
    const filters = {};

    if (status) filters.status = asUpperText(status);
    if (department) filters.departmentFunction = department;

    if (q) {
      const search = asText(q);
      filters.$or = [
        { documentTitle: { $regex: search, $options: "i" } },
        { documentNumber: { $regex: search, $options: "i" } },
        { departmentFunction: { $regex: search, $options: "i" } },
        { preparedBy: { $regex: search, $options: "i" } },
        { submittedByUsername: { $regex: search, $options: "i" } },
      ];
    }

    const entries = await DocumentControlEntry.find(filters).sort({ submittedAt: -1 }).lean();
    res.json({ success: true, data: entries });
  } catch (error) {
    console.error("Error fetching document control entries:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/entries", async (req, res) => {
  try {
    const payload = {
      documentTitle: asText(req.body.documentTitle),
      documentNumber: asUpperText(req.body.documentNumber),
      documentType: asText(req.body.documentType),
      departmentFunction: asText(req.body.departmentFunction),
      versionNumber: asText(req.body.versionNumber),
      status: asUpperText(req.body.status),
      classification: asUpperText(req.body.classification),
      dateOfIssue: asText(req.body.dateOfIssue),
      effectiveDate: asText(req.body.effectiveDate),
      reviewDate: asText(req.body.reviewDate),
      expiryDate: asText(req.body.expiryDate),
      documentOwner: asText(req.body.documentOwner),
      ownerPosition: asText(req.body.ownerPosition),
      preparedBy: asText(req.body.preparedBy),
      reviewedBy: asText(req.body.reviewedBy),
      approvedBy: asText(req.body.approvedBy),
      approvalDate: asText(req.body.approvalDate),
      appliesTo: asText(req.body.appliesTo),
      distributionList: asText(req.body.distributionList),
      controlledCopyNo: asText(req.body.controlledCopyNo),
      revisionVersion: asText(req.body.revisionVersion),
      revisionDate: asText(req.body.revisionDate),
      revisionAuthor: asText(req.body.revisionAuthor),
      revisionDescription: asText(req.body.revisionDescription),
      revisionApprovedBy: asText(req.body.revisionApprovedBy),
      submittedByUsername: asText(req.body.submittedByUsername),
      submittedByRole: asText(req.body.submittedByRole),
      submittedAt: req.body.submittedAt ? new Date(req.body.submittedAt) : new Date(),
    };

    const entry = await DocumentControlEntry.create(payload);
    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    console.error("Error creating document control entry:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.patch("/entries/:entryId/admin-status", async (req, res) => {
  try {
    const { entryId } = req.params;
    const nextStatus = asUpperText(req.body.adminStatus);

    if (!nextStatus) {
      return res.status(400).json({ success: false, message: "Admin status is required." });
    }

    const entry = await DocumentControlEntry.findByIdAndUpdate(
      entryId,
      { $set: { adminStatus: nextStatus } },
      { new: true, runValidators: true }
    );

    if (!entry) {
      return res.status(404).json({ success: false, message: "Document control entry not found." });
    }

    res.json({ success: true, data: entry });
  } catch (error) {
    console.error("Error updating document control admin status:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
