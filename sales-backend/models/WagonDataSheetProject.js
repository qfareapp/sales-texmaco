const mongoose = require("mongoose");

const WagonDataSheetProjectSchema = new mongoose.Schema(
  {
    projectName: { type: String, required: true, trim: true },
    contractPoNumber: { type: String, required: true, trim: true },
    contractPoDate: { type: String, default: "", trim: true },
    deliveryPeriodUpto: { type: String, default: "", trim: true },
    totalQuantity: { type: String, default: "", trim: true },
    wagonTypeInPo: { type: String, default: "", trim: true },
    contractPlacedBy: { type: String, default: "", trim: true },
    wagonManufacturer: { type: String, default: "", trim: true },
    wagonTypeOffered: { type: String, default: "", trim: true },
    wagonsOfferedForInspection: { type: String, default: "", trim: true },
    inspectionOfferDate: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WagonDataSheetProject", WagonDataSheetProjectSchema);
