const express = require('express');
const router = express.Router();
const Todo = require('../models/Todo');

// Get all todos
router.get('/', async (req, res) => {
  try {
    const { category, completed, priority, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Build filter object
    let filter = {};
    if (category && category !== 'all') {
      filter.category = category;
    }
    if (completed !== undefined) {
      filter.completed = completed === 'true';
    }
    if (priority && priority !== 'all') {
      filter.priority = priority;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const todos = await Todo.find(filter).sort(sort);
    res.json(todos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a specific todo
router.get('/:id', async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);
    if (!todo) {
      return res.status(404).json({ message: 'Todo not found' });
    }
    res.json(todo);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new todo
router.post('/', async (req, res) => {
  try {
    const todo = new Todo(req.body);
    const savedTodo = await todo.save();
    res.status(201).json(savedTodo);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a todo
router.put('/:id', async (req, res) => {
  try {
    const todo = await Todo.findByIdAndUpdate(
      req.params.id, 
      { ...req.body, updatedAt: Date.now() }, 
      { new: true, runValidators: true }
    );
    if (!todo) {
      return res.status(404).json({ message: 'Todo not found' });
    }
    res.json(todo);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Toggle todo completion
router.patch('/:id/toggle', async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);
    if (!todo) {
      return res.status(404).json({ message: 'Todo not found' });
    }
    
    todo.completed = !todo.completed;
    todo.updatedAt = Date.now();
    const updatedTodo = await todo.save();
    
    res.json(updatedTodo);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a todo
router.delete('/:id', async (req, res) => {
  try {
    const todo = await Todo.findByIdAndDelete(req.params.id);
    if (!todo) {
      return res.status(404).json({ message: 'Todo not found' });
    }
    res.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get todo statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const total = await Todo.countDocuments();
    const completed = await Todo.countDocuments({ completed: true });
    const pending = await Todo.countDocuments({ completed: false });
    const overdue = await Todo.countDocuments({ 
      completed: false, 
      dueDate: { $lt: new Date() } 
    });
    
    const priorityStats = await Todo.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);
    
    const categoryStats = await Todo.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    res.json({
      total,
      completed,
      pending,
      overdue,
      byPriority: priorityStats,
      byCategory: categoryStats
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;