require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const todoRoutes = require('./routes/todos');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: 'https://carpeldreams.me', // Vite default port
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/todoapp')
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/todos', todoRoutes);


app.get('/', (req, res) => {
  res.json({ 
    message: 'Todo API Server is running!',
    version: '1.0.0',
    endpoints: {
      todos: '/api/todos',
      stats: '/api/todos/stats/overview'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(port, () => {
  console.log(`Todo API server listening on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
