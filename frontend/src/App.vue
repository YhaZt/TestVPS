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
          <h2 class="content-title">Your Tasks</h2>
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
      @close="notification.show = false"
    />
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed } from 'vue';
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
      type: 'success'
    });

    const showNotification = (message, type = 'success') => {
      notification.message = message;
      notification.type = type;
      notification.show = true;
      setTimeout(() => {
        notification.show = false;
      }, 3000);
    };

    const loadTodos = async () => {
      try {
        loading.value = true;
        const response = await todoAPI.getTodos(filters);
        todos.value = response.data;
      } catch (error) {
        showNotification('Failed to load todos', 'error');
        console.error('Error loading todos:', error);
      } finally {
        loading.value = false;
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

    const handleAddTodo = async (todoData) => {
      try {
        const response = await todoAPI.createTodo(todoData);
        todos.value.unshift(response.data);
        showAddForm.value = false;
        showNotification('Todo added successfully!');
        loadStats();
      } catch (error) {
        showNotification('Failed to add todo', 'error');
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
        showNotification('Todo updated successfully!');
        loadStats();
      } catch (error) {
        showNotification('Failed to update todo', 'error');
        console.error('Error updating todo:', error);
      }
    };

    const toggleTodo = async (id) => {
      try {
        const response = await todoAPI.toggleTodo(id);
        const index = todos.value.findIndex(todo => todo._id === id);
        if (index !== -1) {
          todos.value[index] = response.data;
        }
        loadStats();
      } catch (error) {
        showNotification('Failed to toggle todo', 'error');
        console.error('Error toggling todo:', error);
      }
    };

    const deleteTodo = async (id) => {
      if (!confirm('Are you sure you want to delete this todo?')) return;

      try {
        await todoAPI.deleteTodo(id);
        todos.value = todos.value.filter(todo => todo._id !== id);
        showNotification('Todo deleted successfully!');
        loadStats();
      } catch (error) {
        showNotification('Failed to delete todo', 'error');
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
    });

    return {
      todos,
      stats,
      loading,
      showAddForm,
      viewMode,
      filters,
      notification,
      handleAddTodo,
      handleUpdateTodo,
      toggleTodo,
      deleteTodo,
      updateFilters,
      clearFilters,
    };
  },
};
</script>
