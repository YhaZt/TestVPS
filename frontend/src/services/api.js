import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const todoAPI = {
  // Get all todos with optional filters
  getTodos: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    return api.get(`/todos?${params.toString()}`);
  },

  // Get a specific todo
  getTodo: (id) => api.get(`/todos/${id}`),

  // Create a new todo
  createTodo: (todoData) => api.post('/todos', todoData),

  // Update a todo
  updateTodo: (id, todoData) => api.put(`/todos/${id}`, todoData),

  // Toggle todo completion
  toggleTodo: (id) => api.patch(`/todos/${id}/toggle`),

  // Delete a todo
  deleteTodo: (id) => api.delete(`/todos/${id}`),

  // Get statistics
  getStats: () => api.get('/todos/stats/overview'),
};

export default api;
