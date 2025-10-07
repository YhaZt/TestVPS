<template>
  <div class="card">
    <h3 class="text-lg font-medium text-gray-900 mb-4">Filters & Sorting</h3>

    <div class="">
      <!-- Category Filter -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <select
          v-model="localFilters.category"
          @change="updateFilters"
          class="input-field"
        >
          <option value="all">All Categories</option>
          <option value="work">Work</option>
          <option value="personal">Personal</option>
          <option value="shopping">Shopping</option>
          <option value="health">Health</option>
          <option value="education">Education</option>
          <option value="general">General</option>
        </select>
      </div>

      <!-- Status Filter -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
        <select
          v-model="localFilters.completed"
          @change="updateFilters"
          class="input-field"
        >
          <option value="">All Status</option>
          <option value="false">Pending</option>
          <option value="true">Completed</option>
        </select>
      </div>

      <!-- Priority Filter -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Priority</label>
        <select
          v-model="localFilters.priority"
          @change="updateFilters"
          class="input-field"
        >
          <option value="all">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <!-- Sort Options -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
        <div class="flex space-x-2">
          <select
            v-model="localFilters.sortBy"
            @change="updateFilters"
            class="input-field flex-1"
          >
            <option value="createdAt">Created</option>
            <option value="updatedAt">Updated</option>
            <option value="dueDate">Due Date</option>
            <option value="title">Title</option>
            <option value="priority">Priority</option>
          </select>
          <button
            @click="toggleSortOrder"
            class="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            :title="localFilters.sortOrder === 'asc' ? 'Ascending' : 'Descending'"
          >
            <ArrowUpIcon v-if="localFilters.sortOrder === 'asc'" class="w-4 h-4" />
            <ArrowDownIcon v-else class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Clear Filters Button -->
    <div class="mt-4 pt-4 border-t border-gray-200">
      <button
        @click="clearAllFilters"
        class="btn-secondary text-sm"
      >
        <XMarkIcon class="w-4 h-4 mr-1" />
        Clear All Filters
      </button>
    </div>
  </div>
</template>

<script>
import { ref, reactive, watch } from 'vue';
import { ArrowUpIcon, ArrowDownIcon, XMarkIcon } from '@heroicons/vue/24/outline';

export default {
  name: 'TodoFilters',
  components: {
    ArrowUpIcon,
    ArrowDownIcon,
    XMarkIcon,
  },
  props: {
    filters: {
      type: Object,
      required: true,
    },
  },
  emits: ['update-filters', 'clear-filters'],
  setup(props, { emit }) {
    const localFilters = reactive({ ...props.filters });

    // Watch for external filter changes
    watch(() => props.filters, (newFilters) => {
      Object.assign(localFilters, newFilters);
    }, { deep: true });

    const updateFilters = () => {
      emit('update-filters', { ...localFilters });
    };

    const toggleSortOrder = () => {
      localFilters.sortOrder = localFilters.sortOrder === 'asc' ? 'desc' : 'asc';
      updateFilters();
    };

    const clearAllFilters = () => {
      emit('clear-filters');
    };

    return {
      localFilters,
      updateFilters,
      toggleSortOrder,
      clearAllFilters,
    };
  },
};
</script>
