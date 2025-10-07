<template>
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
    <div class="card">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <DocumentTextIcon class="h-8 w-8 text-blue-600" />
        </div>
        <div class="ml-4">
          <div class="text-2xl font-bold text-gray-900">{{ stats.total || 0 }}</div>
          <div class="text-sm text-gray-600">Total Tasks</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <CheckCircleIcon class="h-8 w-8 text-green-600" />
        </div>
        <div class="ml-4">
          <div class="text-2xl font-bold text-gray-900">{{ stats.completed || 0 }}</div>
          <div class="text-sm text-gray-600">Completed</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <ClockIcon class="h-8 w-8 text-yellow-600" />
        </div>
        <div class="ml-4">
          <div class="text-2xl font-bold text-gray-900">{{ stats.pending || 0 }}</div>
          <div class="text-sm text-gray-600">Pending</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <ExclamationTriangleIcon class="h-8 w-8 text-red-600" />
        </div>
        <div class="ml-4">
          <div class="text-2xl font-bold text-gray-900">{{ stats.overdue || 0 }}</div>
          <div class="text-sm text-gray-600">Overdue</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/vue/24/outline';

export default {
  name: 'TodoStats',
  components: {
    DocumentTextIcon,
    CheckCircleIcon,
    ClockIcon,
    ExclamationTriangleIcon,
  },
  props: {
    stats: {
      type: Object,
      default: () => ({}),
    },
  },
};
</script>
