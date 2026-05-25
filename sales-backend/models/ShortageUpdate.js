const mongoose = require("mongoose");

const shortageUpdateSchema = new mongoose.Schema(
  {
    projectCode: { type: String, required: true, uppercase: true, trim: true, index: true },
    materialId: { type: mongoose.Schema.Types.ObjectId, ref: "ShortageMaterial", required: true },
    materialCode: { type: String, trim: true },
    itemName: { type: String, trim: true },
    previousAvailableQty: { type: Number, default: 0 },
    newAvailableQty: { type: Number, default: 0 },
    previousInTransitQty: { type: Number, default: 0 },
    newInTransitQty: { type: Number, default: 0 },
    previousShortageQty: { type: Number, default: 0 },
    shortageAfterUpdate: { type: Number, default: 0 },
    updatedBy: { type: String, trim: true, default: "System" },
    remarks: { type: String, trim: true },
    updateDate: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ShortageUpdate", shortageUpdateSchema);
