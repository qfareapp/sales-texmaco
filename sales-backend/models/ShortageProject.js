const mongoose = require("mongoose");

const planningMonthSchema = new mongoose.Schema(
  {
    month: { type: String, trim: true },
    plannedQty: { type: Number, default: 0 },
  },
  { _id: false }
);

const shortageProjectSchema = new mongoose.Schema(
  {
    projectCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    projectName: { type: String, trim: true },
    client: { type: String, trim: true },
    wagonType: { type: String, trim: true },
    totalOrderQty: { type: Number, default: 0 },
    activeStatus: { type: String, default: "Active", trim: true },
    sourceSheets: [{ type: String, trim: true }],
    planningMonths: [planningMonthSchema],
    lastImportedAt: { type: Date },
    extra: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ShortageProject", shortageProjectSchema);
