const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  dosageAmount: { type: Number, required: true, min: 0.1 },
  unit: { type: String, required: true, enum: ['ml','pcs','mg','g','tablets','capsules'] },
  frequencyPerDay: { type: Number, required: true, min: 1, max: 24 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  targetDays: { type: Number, required: true, min: 1 },
  dailyTimes: [{
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  }],
  status: { type: String, enum: ['active','completed','paused'], default: 'active' },
  notes: { type: String, default: '' }
}, { timestamps: true });

scheduleSchema.pre('save', function(next) {
  if (this.startDate && this.targetDays && !this.endDate) {
    const end = new Date(this.startDate);
    end.setDate(end.getDate() + this.targetDays - 1);
    this.endDate = end;
  }
  if (this.dailyTimes && this.frequencyPerDay && this.dailyTimes.length !== this.frequencyPerDay) {
    return next(new Error('Daily times count must match frequency per day'));
  }
  next();
});

module.exports = mongoose.models.Schedule || mongoose.model('Schedule', scheduleSchema);