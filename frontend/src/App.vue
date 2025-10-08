<template>
  <div id="app">
    <!-- Top Navigation Bar -->
    <nav class="navbar">
      <div class="nav-container">
        <div class="nav-brand">
          <h1>📝 TodoMaster</h1>
        </div>
        <div class="nav-actions">
          <button
            @click="showAddForm = !showAddForm"
            class="btn btn-primary nav-btn"
          >
            <PlusIcon class="icon mr-2" />
            New Task
          </button>
        </div>
      </div>
    </nav>

    <!-- Main Dashboard -->
    <div class="dashboard">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-section">
          <h3 class="sidebar-title">Quick Stats</h3>
          <TodoStats :stats="stats" />
        </div>

        <div class="sidebar-section">
          <h3 class="sidebar-title">Filters</h3>
          <TodoFilters
            :filters="filters"
            @update-filters="updateFilters"
            @clear-filters="clearFilters"
          />
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="main-content">
        <!-- Add Todo Form (appears as modal overlay) -->
        <Transition name="modal">
          <div v-if="showAddForm" class="modal-overlay" @click="showAddForm = false">
            <div class="modal-content" @click.stop>
              <div class="modal-header">
                <h2>Create New Task</h2>
                <button @click="showAddForm = false" class="btn-close">&times;</button>
              </div>
              <TodoForm
                @submit="handleAddTodo"
                @cancel="showAddForm = false"
              >
                <template #actions>
                  <div class="modal-actions">
                    <button type="button" class="btn-link modal-cancel" @click="showAddForm = false">Cancel</button>
                    <button type="submit" class="btn btn-gradient modal-submit">Add Todo</button>
                  </div>
                </template>
              </TodoForm>
            </div>
          </div>
        </Transition>

        <!-- Content Header -->
        <div class="content-header">
          <div class="content-title-section">
            <h2 class="content-title">Your Tasks</h2>
            <div class="auto-reload-info" v-if="lastUpdateTime">
              <span class="last-update">Last updated: {{ new Date(lastUpdateTime).toLocaleTimeString() }}</span>
              <button
                @click="toggleAutoReload"
                :class="['btn', 'btn-sm', autoReload ? 'btn-success' : 'btn-secondary']"
                :title="autoReload ? 'Disable auto-reload' : 'Enable auto-reload'"
              >
                <span class="auto-reload-indicator" :class="{ active: autoReload }">●</span>
                {{ autoReload ? 'Auto-reload ON' : 'Auto-reload OFF' }}
              </button>
            </div>
          </div>
          <div class="content-actions">
            <div class="view-toggle">
              <button
                class="btn btn-secondary"
                :class="{ active: viewMode === 'grid' }"
                @click="viewMode = 'grid'"
              >
                Grid View
              </button>
              <button
                class="btn btn-secondary"
                :class="{ active: viewMode === 'list' }"
                @click="viewMode = 'list'"
              >
                List View
              </button>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="loading-container">
          <div class="spinner"></div>
          <p>Loading your tasks...</p>
        </div>

        <!-- Todo List - Grid or List Layout -->
        <div v-else-if="todos.length > 0" class="todos-container">
          <TransitionGroup
            name="todo-list"
            tag="div"
            :class="viewMode === 'grid' ? 'todos-grid' : 'todos-list'"
          >
            <div
              v-for="todo in todos"
              :key="todo._id"
              :class="viewMode === 'grid' ? 'todo-card-wrapper' : 'todo-list-row'"
            >
              <TodoItem
                :todo="todo"
                :viewMode="viewMode"
                @toggle="toggleTodo"
                @update="handleUpdateTodo"
                @delete="deleteTodo"
              />
            </div>
          </TransitionGroup>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state">
          <div class="empty-icon">
            <DocumentTextIcon class="icon-xl" />
          </div>
          <h3>No tasks yet</h3>
          <p>{{ Object.keys(filters).some(key => filters[key] && filters[key] !== 'all')
               ? 'No tasks match your current filters.'
               : 'Create your first task to get started!' }}
          </p>
          <button
            @click="showAddForm = true"
            class="btn btn-primary empty-cta"
          >
            <PlusIcon class="icon mr-2" />
            {{ Object.keys(filters).some(key => filters[key] && filters[key] !== 'all')
               ? 'Clear Filters'
               : 'Create First Task' }}
          </button>
        </div>
      </main>
    </div>

    <!-- Toast Notifications -->
    <TodoToast
      v-if="notification.show"
      :message="notification.message"
      :type="notification.type"
      :duration="notification.duration || 4000"
      :show-progress="true"
      @close="notification.show = false"
    />
  </div>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue';
import { todoAPI } from './services/api.js';
import { PlusIcon, DocumentTextIcon } from '@heroicons/vue/24/outline';

import TodoStats from './components/TodoStats.vue';
import TodoFilters from './components/TodoFilters.vue';
import TodoForm from './components/TodoForm.vue';
import TodoItem from './components/TodoItem.vue';
import TodoToast from './components/TodoToast.vue';

export default {
  name: 'App',
  components: {
    TodoStats,
    TodoFilters,
    TodoForm,
    TodoItem,
    TodoToast,
    PlusIcon,
    DocumentTextIcon,
  },
  setup() {
    const todos = ref([]);
    const stats = ref({});
    const loading = ref(false);
    const showAddForm = ref(false);
    const viewMode = ref('list'); // Default to list view

    const filters = reactive({
      category: 'all',
      completed: '',
      priority: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });

    const notification = reactive({
      show: false,
      message: '',
      type: 'success',
      duration: 4000
    });

    // Auto-reload state
    const autoReload = ref(true);
    const reloadInterval = ref(null);
    const lastUpdateTime = ref(null);

    const showNotification = (message, type = 'success') => {
      notification.message = message;
      notification.type = type;
      notification.duration = 4000;
      notification.show = true;
      setTimeout(() => {
        notification.show = false;
      }, 4000);
    };

    // Enhanced toast with different positions and styles
    const showToast = (message, type = 'success', duration = 4000) => {
      notification.message = message;
      notification.type = type;
      notification.duration = duration;
      notification.show = true;
      setTimeout(() => {
        notification.show = false;
      }, duration);
    };

    const loadTodos = async (silent = false) => {
      try {
        if (!silent) {
          loading.value = true;
        }
        const response = await todoAPI.getTodos(filters);
        const newTodos = response.data;

        // Check if data has changed
        if (JSON.stringify(todos.value) !== JSON.stringify(newTodos)) {
          todos.value = newTodos;
          lastUpdateTime.value = new Date();

          if (silent && todos.value.length > 0) {
            showToast('Tasks updated automatically!', 'info', 2000);
          }
        }
      } catch (error) {
        if (!silent) {
          showToast('Failed to load tasks', 'error');
        }
        console.error('Error loading todos:', error);
      } finally {
        if (!silent) {
          loading.value = false;
        }
      }
    };

    const loadStats = async () => {
      try {
        const response = await todoAPI.getStats();
        stats.value = response.data;
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    };

    // Auto-reload functionality
    const startAutoReload = () => {
      if (reloadInterval.value) return;

      reloadInterval.value = setInterval(() => {
        if (autoReload.value && !showAddForm.value) {
          loadTodos(true); // Silent reload
          loadStats();
        }
      }, 10000); // Check every 10 seconds
    };

    const stopAutoReload = () => {
      if (reloadInterval.value) {
        clearInterval(reloadInterval.value);
        reloadInterval.value = null;
      }
    };

    const toggleAutoReload = () => {
      autoReload.value = !autoReload.value;
      if (autoReload.value) {
        startAutoReload();
        showToast('Auto-reload enabled', 'success', 2000);
      } else {
        stopAutoReload();
        showToast('Auto-reload disabled', 'info', 2000);
      }
    };

    const handleAddTodo = async (todoData) => {
      try {
        const response = await todoAPI.createTodo(todoData);
        todos.value.unshift(response.data);
        showAddForm.value = false;
        showToast('Task added successfully! 🎉', 'success');
        loadStats();
        lastUpdateTime.value = new Date();
      } catch (error) {
        showToast('Failed to add task', 'error');
        console.error('Error adding todo:', error);
      }
    };

    const handleUpdateTodo = async (id, todoData) => {
      try {
        const response = await todoAPI.updateTodo(id, todoData);
        const index = todos.value.findIndex(todo => todo._id === id);
        if (index !== -1) {
          todos.value[index] = response.data;
        }
        showToast('Task updated successfully! ✨', 'success');
        loadStats();
        lastUpdateTime.value = new Date();
      } catch (error) {
        showToast('Failed to update task', 'error');
        console.error('Error updating todo:', error);
      }
    };

    const toggleTodo = async (id) => {
      try {
        const response = await todoAPI.toggleTodo(id);
        const index = todos.value.findIndex(todo => todo._id === id);
        if (index !== -1) {
          const wasCompleted = todos.value[index].completed;
          todos.value[index] = response.data;

          if (!wasCompleted && response.data.completed) {
            showToast('Task completed! 🎉', 'success', 2000);
          } else if (wasCompleted && !response.data.completed) {
            showToast('Task reopened', 'info', 2000);
          }
        }
        loadStats();
        lastUpdateTime.value = new Date();
      } catch (error) {
        showToast('Failed to toggle task', 'error');
        console.error('Error toggling todo:', error);
      }
    };

    const deleteTodo = async (id) => {
      if (!confirm('Are you sure you want to delete this task?')) return;

      try {
        await todoAPI.deleteTodo(id);
        todos.value = todos.value.filter(todo => todo._id !== id);
        showToast('Task deleted successfully! 🗑️', 'success');
        loadStats();
        lastUpdateTime.value = new Date();
      } catch (error) {
        showToast('Failed to delete task', 'error');
        console.error('Error deleting todo:', error);
      }
    };

    const updateFilters = (newFilters) => {
      Object.assign(filters, newFilters);
      loadTodos();
    };

    const clearFilters = () => {
      Object.assign(filters, {
        category: 'all',
        completed: '',
        priority: 'all',
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      loadTodos();
    };

    onMounted(() => {
      loadTodos();
      loadStats();
      startAutoReload();
    });

    // Cleanup on unmount
    onUnmounted(() => {
      stopAutoReload();
    });

    return {
      todos,
      stats,
      loading,
      showAddForm,
      viewMode,
      filters,
      notification,
      autoReload,
      lastUpdateTime,
      handleAddTodo,
      handleUpdateTodo,
      toggleTodo,
      deleteTodo,
      updateFilters,
      clearFilters,
      toggleAutoReload,
      showToast,
    };
  },
};
</script>

<style scoped>
/* Auto-reload specific styles */
.content-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  gap: 1rem;
}

.content-title-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.content-title {
  font-size: 1.875rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.auto-reload-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.875rem;
}

.last-update {
  color: #6b7280;
  font-size: 0.75rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;
}

.btn-sm {
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  border-radius: 0.375rem;
}

.btn-secondary {
  background-color: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background-color: #e5e7eb;
}

.btn-secondary.active {
  background-color: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.btn-success {
  background-color: #10b981;
  color: white;
  border: 1px solid #10b981;
}

.btn-success:hover {
  background-color: #059669;
  border-color: #059669;
}

.auto-reload-indicator {
  display: inline-block;
  margin-right: 0.5rem;
  color: #6b7280;
  transition: color 0.3s ease;
}

.auto-reload-indicator.active {
  color: #10b981;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.content-actions {
  display: flex;
  gap: 1rem;
}

.view-toggle {
  display: flex;
  gap: 0.5rem;
}

/* Enhanced toast styles */
.toast-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 1000;
  pointer-events: none;
}

.toast {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  padding: 1rem 1.5rem;
  margin-bottom: 0.5rem;
  border-left: 4px solid;
  pointer-events: auto;
  transition: all 0.3s ease;
  max-width: 400px;
}

.toast.success {
  border-left-color: #10b981;
}

.toast.error {
  border-left-color: #ef4444;
}

.toast.info {
  border-left-color: #3b82f6;
}

.toast.warning {
  border-left-color: #f59e0b;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .content-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .content-title-section {
    align-items: flex-start;
  }

  .auto-reload-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .content-actions {
    justify-content: flex-start;
  }
}
</style>
