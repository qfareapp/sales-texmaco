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

const WagonDataSheetRowSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WagonDataSheetProject",
      required: true,
      index: true,
    },
    slNo: { type: String, default: "", trim: true },
    texNo: { type: String, default: "", trim: true },
    wagonNo: { type: String, default: "", trim: true },
    wheelDataKey: { type: String, required: true, trim: true },
    firstZone: {
      bogie: { type: makeSerialSchema, default: () => ({}) },
      coupler: { type: makeSerialSchema, default: () => ({}) },
      draftGear: { type: makeSerialSchema, default: () => ({}) },
      dv: { type: makeSerialSchema, default: () => ({}) },
      bc: { type: makeSerialSchema, default: () => ({}) },
      ar: { type: makeSerialSchema, default: () => ({}) },
      sabMake: { type: String, default: "", trim: true },
      atlMake: { type: String, default: "", trim: true },
      crfMake: { type: String, default: "", trim: true },
      submittedAt: { type: Date, default: Date.now },
    },
    secondZone: {
      axle: { type: makeSerialSchema, default: () => ({}) },
      wheel: { type: makeSerialSchema, default: () => ({}) },
      bearing: { type: makeSerialSchema, default: () => ({}) },
      submittedAt: { type: Date, default: null },
    },
    finalAssembly: {
      tareWeight: { type: String, default: "", trim: true },
      txrFitDate: { type: String, default: "", trim: true },
      manufactureDate: { type: String, default: "", trim: true },
      rfidNo: { type: String, default: "", trim: true },
      dmNoAndDate: { type: String, default: "", trim: true },
      rohDate: { type: String, default: "", trim: true },
      returnOrPohDate: { type: String, default: "", trim: true },
      submittedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

WagonDataSheetRowSchema.index({ projectId: 1, wheelDataKey: 1 }, { unique: true });

module.exports = mongoose.model("WagonDataSheetRow", WagonDataSheetRowSchema);
