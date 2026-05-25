const mongoose = require("mongoose");

const shortageMaterialSchema = new mongoose.Schema(
  {
    projectCode: { type: String, required: true, uppercase: true, trim: true, index: true },
    materialCode: { type: String, required: true, trim: true },
    itemName: { type: String, required: true, trim: true },
    qtyPerWagon: { type: Number, default: 0 },
    unit: { type: String, trim: true },
    requiredQty: { type: Number, default: 0 },
    availableQty: { type: Number, default: 0 },
    availableWs: { type: Number, default: 0 },
    inTransitQty: { type: Number, default: 0 },
    shortageQty: { type: Number, default: 0 },
    alertLevel: { type: String, enum: ["green", "yellow", "red"], default: "green" },
    remarks: { type: String, trim: true },
    sourceSheet: { type: String, trim: true },
    importedBy: { type: String, trim: true },
    lastUpdatedAt: { type: Date },
    extra: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

shortageMaterialSchema.index({ projectCode: 1, materialCode: 1 }, { unique: true });

module.exports = mongoose.model("ShortageMaterial", shortageMaterialSchema);
