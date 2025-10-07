<template>
  <Transition
    enter-active-class="transition ease-out duration-300"
    enter-from-class="opacity-0 transform translate-y-2"
    enter-to-class="opacity-100 transform translate-y-0"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="opacity-100 transform translate-y-0"
    leave-to-class="opacity-0 transform translate-y-2"
  >
    <div class="fixed bottom-4 right-4 z-50">
      <div
        :class="[
          'max-w-sm w-full rounded-lg shadow-lg p-4 flex items-center space-x-3',
          type === 'success' ? 'bg-green-600 text-white' :
          type === 'error' ? 'bg-red-600 text-white' :
          type === 'warning' ? 'bg-yellow-600 text-white' :
          'bg-blue-600 text-white'
        ]"
      >
        <!-- Icon -->
        <div class="flex-shrink-0">
          <CheckCircleIcon v-if="type === 'success'" class="w-6 h-6" />
          <ExclamationTriangleIcon v-else-if="type === 'warning'" class="w-6 h-6" />
          <XCircleIcon v-else-if="type === 'error'" class="w-6 h-6" />
          <InformationCircleIcon v-else class="w-6 h-6" />
        </div>

        <!-- Message -->
        <div class="flex-1 text-sm font-medium">
          {{ message }}
        </div>

        <!-- Close Button -->
        <button
          @click="$emit('close')"
          class="flex-shrink-0 text-white hover:text-gray-200 transition-colors"
        >
          <XMarkIcon class="w-5 h-5" />
        </button>
      </div>
    </div>
  </Transition>
</template>

<script>
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/vue/24/outline';

export default {
  name: 'TodoToast',
  components: {
    CheckCircleIcon,
    ExclamationTriangleIcon,
    XCircleIcon,
    InformationCircleIcon,
    XMarkIcon,
  },
  props: {
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      default: 'info',
      validator: (value) => ['success', 'error', 'warning', 'info'].includes(value),
    },
  },
  emits: ['close'],
};
</script>
