const mongoose = require("mongoose");

const WagonDataSheetDraftSchema = new mongoose.Schema(
  {
    formType: { type: String, enum: ["dm-line", "dm-final"], required: true },
    username: { type: String, required: true, trim: true, index: true },
    role: { type: String, default: "", trim: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WagonDataSheetDraft", WagonDataSheetDraftSchema);
