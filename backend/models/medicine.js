const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  requiresFood: { type: Boolean, default: false },
  mustAvoid: { type: String, default: '' },
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.models.Medicine || mongoose.model('Medicine', medicineSchema);