const mongoose = require('mongoose');

const AttachmentSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
  },
  { _id: true }
);

const IncidentReportSchema = new mongoose.Schema(
  {
    referenceNo: { type: String, required: true, unique: true, index: true },
    reportCategory: {
      type: String,
      enum: ['Learning Event', 'Incident'],
      required: true,
      index: true,
    },
    reportType: { type: String, required: true, index: true },
    reportedBy: {
      name: { type: String, required: true, trim: true },
      departmentContractor: { type: String, required: true, trim: true },
      empId: { type: String, required: true, trim: true, index: true },
      mobileNumber: { type: String, required: true, trim: true },
      department: { type: String, required: true, trim: true },
    },
    observation: { type: String, trim: true },
    responsibleDepartment: { type: String, trim: true },
    incidentDate: { type: Date },
    incidentTime: { type: String, trim: true },
    location: { type: String, required: true, trim: true },
    victimName: { type: String, trim: true },
    victimDepartment: { type: String, trim: true },
    description: { type: String, trim: true },
    attachments: [AttachmentSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('IncidentReport', IncidentReportSchema);
