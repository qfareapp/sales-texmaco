const mongoose = require('mongoose');

const StageMasterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('StageMaster', StageMasterSchema);
