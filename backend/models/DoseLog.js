const mongoose = require('mongoose');

const doseLogSchema = new mongoose.Schema({
  schedule: { type: mongoose.Schema.Types.ObjectId, ref: 'Schedule', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  time: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  taken: { type: Boolean, default: true },
  takenAt: { type: Date, default: Date.now }
}, { timestamps: true });

doseLogSchema.index({ schedule: 1, date: 1, time: 1 }, { unique: true });

module.exports = mongoose.models.DoseLog || mongoose.model('DoseLog', doseLogSchema);