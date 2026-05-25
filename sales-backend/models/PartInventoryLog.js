const mongoose = require('mongoose');

const PartInventoryLogSchema = new mongoose.Schema({
  date: { type: String, required: true },
  projectId: { type: String, required: true },
  wagonType: { type: String, required: true },
  part: { type: String, required: true },
  quantity: { type: Number, required: true },
  sapCode: String,
  description: String,
  unit: String
}, { timestamps: true });

module.exports = mongoose.model('PartInventoryLog', PartInventoryLogSchema);
