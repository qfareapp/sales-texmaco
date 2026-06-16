const mongoose = require("mongoose");

const makeSerialSchema = new mongoose.Schema(
  {
    make: { type: String, default: "", trim: true },
    serialNumbers: {
      type: [{ type: String, trim: true }],
      default: [],
      validate: {
        validator: (value) => Array.isArray(value) && value.length <= 8,
        message: "A component can have at most 8 serial numbers.",
      },
    },
  },
  { _id: false }
);

const linkedWheelDataSchema = new mongoose.Schema(
  {
    rowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WagonDataSheetRow",
      default: null,
    },
    wheelDataKey: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const submissionBySchema = new mongoose.Schema(
  {
    username: { type: String, default: "", trim: true },
    role: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const WagonDataSheetRowSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WagonDataSheetProject",
      default: null,
      index: true,
    },
    slNo: { type: String, default: "", trim: true },
    texNo: { type: String, default: "", trim: true },
    wagonNo: { type: String, default: "", trim: true },
    wagonConfiguration: { type: String, default: "", trim: true },
    wheelDataKey: { type: String, required: true, trim: true },
    firstZone: {
      bogie: { type: makeSerialSchema, default: () => ({}) },
      bogie1SerialNumber: { type: String, default: "", trim: true },
      bogie2SerialNumber: { type: String, default: "", trim: true },
      bogie1WheelDataRows: { type: [linkedWheelDataSchema], default: [] },
      bogie2WheelDataRows: { type: [linkedWheelDataSchema], default: [] },
      coupler: { type: makeSerialSchema, default: () => ({}) },
      draftGear: { type: makeSerialSchema, default: () => ({}) },
      dv: { type: makeSerialSchema, default: () => ({}) },
      bc: { type: makeSerialSchema, default: () => ({}) },
      ar: { type: makeSerialSchema, default: () => ({}) },
      sabMake: { type: String, default: "", trim: true },
      atlMake: { type: String, default: "", trim: true },
      crfMake: { type: String, default: "", trim: true },
      submittedBy: { type: submissionBySchema, default: () => ({}) },
      submittedAt: { type: Date, default: null },
    },
    secondZone: {
      axle: { type: makeSerialSchema, default: () => ({}) },
      wheel: { type: makeSerialSchema, default: () => ({}) },
      bearing: { type: makeSerialSchema, default: () => ({}) },
      submittedBy: { type: submissionBySchema, default: () => ({}) },
      submittedAt: { type: Date, default: null },
    },
    finalAssembly: {
      tareWeight: { type: String, default: "", trim: true },
      txrFitDate: { type: String, default: "", trim: true },
      manufactureDate: { type: String, default: "", trim: true },
      rfidNo1: { type: String, default: "", trim: true },
      rfidNo2: { type: String, default: "", trim: true },
      dmNo: { type: String, default: "", trim: true },
      dmDate: { type: String, default: "", trim: true },
      rohDate: { type: String, default: "", trim: true },
      returnOrPohDate: { type: String, default: "", trim: true },
      submittedBy: { type: submissionBySchema, default: () => ({}) },
      submittedAt: { type: Date, default: null },
    },
    wheelDataUsage: {
      linkedProjectRowId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "WagonDataSheetRow",
        default: null,
      },
      linkedProjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "WagonDataSheetProject",
        default: null,
      },
      linkedBogiePosition: { type: String, default: "", trim: true },
      linkedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

WagonDataSheetRowSchema.index({ projectId: 1, wheelDataKey: 1 }, { unique: true });

module.exports = mongoose.model("WagonDataSheetRow", WagonDataSheetRowSchema);
