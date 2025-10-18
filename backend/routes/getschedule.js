const express = require('express');
const router = express.Router();
const Schedule = require('../models/schedule');
const Medicine = require('../models/medicine');
const DoseLog = require('../models/DoseLog');

// GET all schedules
router.get('/', async (req, res) => {
  try {
    const schedules = await Schedule.find().populate('medicine').sort({ startDate: -1 });
    res.json({ success: true, data: schedules });
  } catch (error) {
    console.error('GET /schedules error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- STATIC ROUTES (must be before '/:id') ---

// Today doses (include taken info)
router.get('/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD

    const active = await Schedule.find({
      startDate: { $lte: today },
      endDate: { $gte: today },
      status: 'active'
    }).populate('medicine');

    const ids = active.map(s => s._id);
    const logs = await DoseLog.find({ schedule: { $in: ids }, date: todayStr });
    const takenMap = new Map(logs.map(l => [`${l.schedule}_${l.time}`, l]));

    const doses = [];
    active.forEach(s => {
      (s.dailyTimes || []).forEach(time => {
        const key = `${s._id}_${time}`;
        const log = takenMap.get(key);
        doses.push({
          scheduleId: s._id,
          medicine: s.medicine,
          time,
          dosageAmount: s.dosageAmount,
          unit: s.unit,
          requiresFood: !!s.medicine?.requiresFood,
          mustAvoid: s.medicine?.mustAvoid || '',
          taken: !!log?.taken,
          takenAt: log?.takenAt || null
        });
      });
    });
    doses.sort((a, b) => a.time.localeCompare(b.time));
    res.json({ success: true, data: doses });
  } catch (error) {
    console.error('GET /schedules/today error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Upcoming schedules starting within next N days (default 7)
router.get('/upcoming', async (req, res) => {
  try {
    const days = Number.parseInt(req.query.days, 10) || 7;
    const from = new Date(); from.setHours(0, 0, 0, 0);
    const to = new Date(from); to.setDate(to.getDate() + days);

    const upcoming = await Schedule.find({
      startDate: { $gt: from, $lte: to },
      status: 'active'
    }).populate('medicine').sort({ startDate: 1 });

    res.json({ success: true, data: upcoming });
  } catch (error) {
    console.error('GET /schedules/upcoming error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// By medicine
router.get('/medicine/:medicineId', async (req, res) => {
  try {
    const schedules = await Schedule.find({ medicine: req.params.medicineId })
      .populate('medicine').sort({ startDate: -1 });
    res.json({ success: true, data: schedules });
  } catch (error) {
    console.error('GET /schedules/medicine/:id error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- DYNAMIC ID ROUTE (keep after statics) ---
router.get('/:id', async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id).populate('medicine');
    if (!schedule) return res.status(404).json({ success: false, error: 'Schedule not found' });
    res.json({ success: true, data: schedule });
  } catch (error) {
    console.error('GET /schedules/:id error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create
router.post('/', async (req, res) => {
  try {
    const { medicine, dosageAmount, unit, frequencyPerDay, startDate, targetDays, dailyTimes, notes } = req.body;

    const med = await Medicine.findById(medicine);
    if (!med) return res.status(404).json({ success: false, error: 'Medicine not found' });

    if (!Array.isArray(dailyTimes) || dailyTimes.length !== Number(frequencyPerDay)) {
      return res.status(400).json({ success: false, error: 'Number of daily times must match frequency per day' });
    }

    const start = new Date(startDate);
    const end = new Date(start); end.setDate(start.getDate() + Number(targetDays) - 1);

    const schedule = await Schedule.create({
      medicine, dosageAmount, unit,
      frequencyPerDay, startDate: start, endDate: end,
      targetDays, dailyTimes, notes: notes || ''
    });

    await schedule.populate('medicine');
    res.status(201).json({ success: true, data: schedule, message: 'Schedule created successfully' });
  } catch (error) {
    console.error('POST /schedules error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Update (compute endDate safely if start/targetDays change)
router.put('/:id', async (req, res) => {
  try {
    const body = req.body;

    if (body.medicine) {
      const med = await Medicine.findById(body.medicine);
      if (!med) return res.status(404).json({ success: false, error: 'Medicine not found' });
    }

    if (body.dailyTimes && body.frequencyPerDay && body.dailyTimes.length !== Number(body.frequencyPerDay)) {
      return res.status(400).json({ success: false, error: 'Number of daily times must match frequency per day' });
    }

    const current = await Schedule.findById(req.params.id);
    if (!current) return res.status(404).json({ success: false, error: 'Schedule not found' });

    const start = body.startDate ? new Date(body.startDate) : current.startDate;
    const targetDays = body.targetDays ?? current.targetDays;
    const end = new Date(start); end.setDate(end.getDate() + Number(targetDays) - 1);

    const updateData = {
      medicine: body.medicine ?? current.medicine,
      dosageAmount: body.dosageAmount ?? current.dosageAmount,
      unit: body.unit ?? current.unit,
      frequencyPerDay: body.frequencyPerDay ?? current.frequencyPerDay,
      startDate: start,
      endDate: end,
      targetDays,
      dailyTimes: body.dailyTimes ?? current.dailyTimes,
      status: body.status ?? current.status,
      notes: body.notes ?? current.notes
    };

    const updated = await Schedule.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true }).populate('medicine');
    res.json({ success: true, data: updated, message: 'Schedule updated successfully' });
  } catch (error) {
    console.error('PUT /schedules/:id error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Mark a dose as taken for a schedule/time (date defaults to today)
router.post('/:id/doses/mark', async (req, res) => {
  try {
    const { time, date } = req.body;
    if (!time) return res.status(400).json({ success: false, error: 'time is required (HH:mm)' });
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
      return res.status(400).json({ success: false, error: 'Invalid time format' });
    }

    const schedule = await Schedule.findById(req.params.id);
    if (!schedule) return res.status(404).json({ success: false, error: 'Schedule not found' });

    const d = date ? new Date(date) : new Date();
    d.setHours(0, 0, 0, 0);
    const dateStr = d.toISOString().slice(0, 10);

    const log = await DoseLog.findOneAndUpdate(
      { schedule: schedule._id, date: dateStr, time },
      { taken: true, takenAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, data: log, message: 'Dose marked as taken' });
  } catch (error) {
    console.error('POST /schedules/:id/doses/mark error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Optional: unmark
router.post('/:id/doses/unmark', async (req, res) => {
  try {
    const { time, date } = req.body;
    if (!time) return res.status(400).json({ success: false, error: 'time is required' });

    const d = date ? new Date(date) : new Date();
    d.setHours(0, 0, 0, 0);
    const dateStr = d.toISOString().slice(0, 10);

    await DoseLog.deleteOne({ schedule: req.params.id, date: dateStr, time });
    res.json({ success: true, message: 'Dose unmarked' });
  } catch (error) {
    console.error('POST /schedules/:id/doses/unmark error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
}); 

// Delete
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Schedule.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Schedule not found' });
    res.json({ success: true, message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('DELETE /schedules/:id error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;