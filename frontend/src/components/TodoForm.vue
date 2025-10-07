<template>
  <div class="form-container">
    <h3 class="form-title">
      {{ editMode ? 'Edit Todo' : 'Add New Todo' }}
    </h3>

    <form @submit.prevent="handleSubmit" class="form-content">
      <!-- Title -->
      <div class="form-group">
        <label class="form-label">
          Title <span class="required">*</span>
        </label>
        <input
          v-model="form.title"
          type="text"
          placeholder="Enter todo title..."
          class="input-field"
          required
        />
      </div>

      <!-- Description -->
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea
          v-model="form.description"
          placeholder="Enter description (optional)..."
          rows="3"
          class="input-field textarea-field"
        ></textarea>
      </div>

      <!-- Category and Priority -->
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Category</label>
          <select v-model="form.category" class="select-field">
            <option value="general">General</option>
            <option value="work">Work</option>
            <option value="personal">Personal</option>
            <option value="shopping">Shopping</option>
            <option value="health">Health</option>
            <option value="education">Education</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Priority</label>
          <select v-model="form.priority" class="select-field">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <!-- Due Date -->
      <div class="form-group">
        <label class="form-label">Due Date (Optional)</label>
        <input
          v-model="form.dueDate"
          type="datetime-local"
          class="input-field"
        />
      </div>

      <!-- Actions -->
      <slot name="actions">
        <div class="form-actions">
          <button
            type="button" class="btn-link modal-cancel"
            @click="handleCancel"
          >
            Cancel
          </button>
          <button
            ype="submit" class="btn btn-gradient modal-submit"
            :disabled="!form.title.trim()"
          >
            {{ editMode ? 'Update Todo' : 'Add Todo' }}
          </button>
        </div>
      </slot>
    </form>
  </div>
</template>

<script>
import { reactive, watch } from 'vue';

export default {
  name: 'TodoForm',
  props: {
    todo: {
      type: Object,
      default: null,
    },
  },
  emits: ['submit', 'cancel'],
  setup(props, { emit }) {
    const editMode = !!props.todo;

    const defaultForm = {
      title: '',
      description: '',
      category: 'general',
      priority: 'medium',
      dueDate: '',
    };

    const form = reactive(editMode ? { ...props.todo } : { ...defaultForm });

    // Format the dueDate for datetime-local input
    if (editMode && form.dueDate) {
      const date = new Date(form.dueDate);
      form.dueDate = date.toISOString().slice(0, 16);
    }

    const handleSubmit = () => {
      const todoData = { ...form };

      // Convert empty string to null for dueDate
      if (!todoData.dueDate) {
        todoData.dueDate = null;
      } else {
        todoData.dueDate = new Date(todoData.dueDate).toISOString();
      }

      emit('submit', todoData);

      if (!editMode) {
        // Reset form for add mode
        Object.assign(form, defaultForm);
      }
    };

    const handleCancel = () => {
      emit('cancel');
    };

    return {
      form,
      editMode,
      handleSubmit,
      handleCancel,
    };
  },
};
</script>
