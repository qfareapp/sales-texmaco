const mongoose = require("mongoose");

const InspectorAccountSchema = new mongoose.Schema(
  {
    slNo: { type: Number, default: 0, index: true },
    name: { type: String, required: true, trim: true },
    jobRole: { type: String, default: "", trim: true },
    bay: { type: String, default: "", trim: true },
    agency: { type: String, default: "", trim: true },
    username: { type: String, required: true, trim: true, unique: true, index: true },
    passwordHash: { type: String, default: "" },
    passwordSalt: { type: String, default: "" },
    mustChangePassword: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

InspectorAccountSchema.index({ name: 1, agency: 1 }, { unique: true });

module.exports = mongoose.model("InspectorAccount", InspectorAccountSchema);
