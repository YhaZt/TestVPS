const express = require('express');
const router = express.Router();
const Medicine = require('../models/medicine');
const Schedule = require('../models/schedule');

// GET all
router.get('/', async (req, res) => {
  try {
    const medicines = await Medicine.find().sort({ name: 1 });
    res.json({ success: true, data: medicines });
  } catch (error) {
    console.error('GET /medicines error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET one
router.get('/:id', async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) return res.status(404).json({ success: false, error: 'Medicine not found' });
    res.json({ success: true, data: medicine });
  } catch (error) {
    console.error('GET /medicines/:id error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST create
router.post('/', async (req, res) => {
  try {
    const { name, requiresFood, mustAvoid, notes } = req.body;

    const exist = await Medicine.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });
    if (exist) return res.status(400).json({ success: false, error: 'Medicine with this name already exists' });

    const medicine = await Medicine.create({
      name,
      requiresFood: !!requiresFood,
      mustAvoid: mustAvoid || '',
      notes: notes || ''
    });

    console.log('Medicine created:', medicine._id, medicine.name);
    res.status(201).json({ success: true, data: medicine, message: 'Medicine created successfully' });
  } catch (error) {
    console.error('POST /medicines error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT update
router.put('/:id', async (req, res) => {
  try {
    const { name, requiresFood, mustAvoid, notes } = req.body;

    if (name) {
      const exist = await Medicine.findOne({
        name: { $regex: `^${name}$`, $options: 'i' },
        _id: { $ne: req.params.id }
      });
      if (exist) return res.status(400).json({ success: false, error: 'Another medicine with this name already exists' });
    }

    const medicine = await Medicine.findByIdAndUpdate(
      req.params.id,
      { name, requiresFood: !!requiresFood, mustAvoid, notes },
      { new: true, runValidators: true }
    );

    if (!medicine) return res.status(404).json({ success: false, error: 'Medicine not found' });
    res.json({ success: true, data: medicine, message: 'Medicine updated successfully' });
  } catch (error) {
    console.error('PUT /medicines/:id error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE (blocked if referenced by schedules)
router.delete('/:id', async (req, res) => {
  try {
    const count = await Schedule.countDocuments({ medicine: req.params.id });
    if (count > 0) {
      return res.status(400).json({ success: false, error: `Cannot delete medicine. Used in ${count} schedule(s).` });
    }
    const deleted = await Medicine.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Medicine not found' });
    res.json({ success: true, message: 'Medicine deleted successfully' });
  } catch (error) {
    console.error('DELETE /medicines/:id error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;