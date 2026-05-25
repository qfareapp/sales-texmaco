const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  projectId: String,
  part: String,
  quantity: Number,
  sapCode: String,
  description: String,
  unit: String
});

module.exports = mongoose.model('Inventory', inventorySchema);
