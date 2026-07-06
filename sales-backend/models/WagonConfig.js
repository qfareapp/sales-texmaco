const mongoose = require('mongoose');

const WagonConfigSchema = new mongoose.Schema({
  wagonType: { type: String, required: true, unique: true },
  parts: [
    {
      name: String,
      total: Number
    }
  ],
  stages: [
    {
      name: String,
      partUsage: [
        {
          name: String,
          used: Number
        }
      ]
    }
  ],
  inspectionStageRules: [
    {
      key: String,
      allowSkip: { type: Boolean, default: false },
      isOptional: { type: Boolean, default: false }
    }
  ],
  pdiStageRules: [
    {
      key: String,
      allowSkip: { type: Boolean, default: false },
      isOptional: { type: Boolean, default: false }
    }
  ],
  dmItems: [
    {
      sapCode: String,
      sectionGroup: String,
      description: String,
      qtyPerWagon: Number,
      uom: String,
      requiredNos: Number
    }
  ],
  nonDmItems: [
    {
      sapCode: String,
      sectionGroup: String,
      description: String,
      qtyPerWagon: Number,
      uom: String,
      requiredNos: Number
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('WagonConfig', WagonConfigSchema);
