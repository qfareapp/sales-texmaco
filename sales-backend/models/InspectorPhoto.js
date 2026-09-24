const mongoose = require("mongoose");

module.exports = mongoose.model("InspectorPhoto", new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  photo: { type: String, required: true },
}, { timestamps: true }));
