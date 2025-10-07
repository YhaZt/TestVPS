<template>
  <div :class="viewMode === 'grid' ? 'todo-card' : 'todo-row'">
    <div :class="viewMode === 'grid' ? 'todo-content-grid' : 'todo-content-row'">
      <!-- Checkbox -->
      <button
        @click="$emit('toggle', todo._id)"
        class="todo-checkbox"
      >
        <CheckCircleIcon
          v-if="todo.completed"
          class="icon icon-checked"
        />
        <div
          v-else
          class="checkbox-empty"
        ></div>
      </button>

      <!-- Content -->
      <div class="todo-main-content">
        <div :class="viewMode === 'grid' ? 'todo-header-grid' : 'todo-header-row'">
          <div class="todo-text">
            <!-- Title and Description -->
            <h3 :class="['todo-title', { 'todo-completed': todo.completed }]">
              {{ todo.title }}
            </h3>
            <p
              v-if="todo.description"
              :class="['todo-description', { 'todo-completed': todo.completed }]"
            >
              {{ todo.description }}
            </p>

            <!-- Metadata -->
            <div :class="viewMode === 'grid' ? 'todo-meta-grid' : 'todo-meta-row'">
              <!-- Category -->
              <span class="todo-category">
                {{ todo.category }}
              </span>

              <!-- Priority -->
              <span :class="['priority-badge', `priority-${todo.priority}`]">
                {{ todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1) }}
              </span>

              <!-- Due Date -->
              <span v-if="todo.dueDate" class="todo-date">
                <CalendarIcon class="icon" />
                <span :class="{ 'todo-overdue': isOverdue }">
                  {{ formatDate(todo.dueDate) }}
                </span>
              </span>

              <!-- Created Date -->
              <span class="todo-date">
                <ClockIcon class="icon" />
                {{ formatRelativeTime(todo.createdAt) }}
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="todo-actions">
            <button
              @click="startEdit"
              class="action-btn edit-btn"
              title="Edit"
            >
              <PencilIcon class="icon" />
            </button>
            <button
              @click="$emit('delete', todo._id)"
              class="action-btn delete-btn"
              title="Delete"
            >
              <TrashIcon class="icon" />
            </button>
          </div>
        </div>

        <!-- Edit Form -->
        <div v-if="isEditing" class="todo-edit-form">
          <TodoForm
            :todo="todo"
            @submit="handleUpdate"
            @cancel="cancelEdit"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import {
  CheckCircleIcon,
  CalendarIcon,
  ClockIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/vue/24/outline';
import TodoForm from './TodoForm.vue';

export default {
  name: 'TodoItem',
  components: {
    CheckCircleIcon,
    CalendarIcon,
    ClockIcon,
    PencilIcon,
    TrashIcon,
    TodoForm,
  },
  props: {
    todo: {
      type: Object,
      required: true,
    },
    viewMode: {
      type: String,
      default: 'list',
    },
  },
  emits: ['toggle', 'update', 'delete'],
  setup(props, { emit }) {
    const isEditing = ref(false);

    const isOverdue = computed(() => {
      if (!props.todo.dueDate || props.todo.completed) return false;
      return new Date(props.todo.dueDate) < new Date();
    });

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const formatRelativeTime = (dateString) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now - date) / 1000);

      if (diffInSeconds < 60) return 'Just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
      if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;

      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const startEdit = () => {
      isEditing.value = true;
    };

    const cancelEdit = () => {
      isEditing.value = false;
    };

    const handleUpdate = (todoData) => {
      emit('update', props.todo._id, todoData);
      isEditing.value = false;
    };

    return {
      isEditing,
      isOverdue,
      formatDate,
      formatRelativeTime,
      startEdit,
      cancelEdit,
      handleUpdate,
    };
  },
};
</script>
