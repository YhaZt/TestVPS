<template>
  <Transition
    enter-active-class="transition ease-out duration-300"
    enter-from-class="opacity-0 transform translate-x-full"
    enter-to-class="opacity-100 transform translate-x-0"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="opacity-100 transform translate-x-0"
    leave-to-class="opacity-0 transform translate-x-full"
  >
    <div class="fixed top-4 right-4 z-50 max-w-sm w-full">
      <div
        :class="[
          'rounded-lg shadow-lg p-4 flex items-center space-x-3 border-l-4 relative overflow-hidden',
          'bg-white text-gray-900 shadow-xl',
          type === 'success' ? 'border-green-500' :
          type === 'error' ? 'border-red-500' :
          type === 'warning' ? 'border-yellow-500' :
          type === 'info' ? 'border-blue-500' : 'border-gray-500'
        ]"
        @mouseenter="pauseAutoClose"
        @mouseleave="resumeAutoClose"
      >
        <!-- Icon with colored background -->
        <div
          :class="[
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
            type === 'success' ? 'bg-green-100 text-green-600' :
            type === 'error' ? 'bg-red-100 text-red-600' :
            type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
            type === 'info' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
          ]"
        >
          <CheckCircleIcon v-if="type === 'success'" class="w-5 h-5" />
          <ExclamationTriangleIcon v-else-if="type === 'warning'" class="w-5 h-5" />
          <XCircleIcon v-else-if="type === 'error'" class="w-5 h-5" />
          <InformationCircleIcon v-else class="w-5 h-5" />
        </div>

        <!-- Message -->
        <div class="flex-1 text-sm font-medium">
          {{ message }}
        </div>

        <!-- Close Button -->
        <button
          @click="$emit('close')"
          class="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded"
        >
          <XMarkIcon class="w-4 h-4" />
        </button>

        <!-- Progress bar -->
        <div
          v-if="showProgress && duration > 0"
          class="absolute bottom-0 left-0 h-1 transition-all duration-100 ease-linear"
          :class="[
            type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
            type === 'warning' ? 'bg-yellow-500' :
            type === 'info' ? 'bg-blue-500' : 'bg-gray-500'
          ]"
          :style="{ width: progressWidth + '%' }"
        ></div>
      </div>
    </div>
  </Transition>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
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
    duration: {
      type: Number,
      default: 4000,
    },
    showProgress: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const progressWidth = ref(100);
    let progressInterval = null;
    let autoCloseTimeout = null;
    let isPaused = ref(false);
    let remainingTime = ref(props.duration);

    const startProgress = () => {
      if (props.duration <= 0) return;

      const interval = 50; // Update every 50ms
      const decrement = (100 / props.duration) * interval;

      progressInterval = setInterval(() => {
        if (!isPaused.value) {
          progressWidth.value -= decrement;
          remainingTime.value -= interval;

          if (progressWidth.value <= 0 || remainingTime.value <= 0) {
            clearInterval(progressInterval);
            emit('close');
          }
        }
      }, interval);
    };

    const pauseAutoClose = () => {
      isPaused.value = true;
    };

    const resumeAutoClose = () => {
      isPaused.value = false;
    };

    const cleanup = () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      if (autoCloseTimeout) {
        clearTimeout(autoCloseTimeout);
      }
    };

    onMounted(() => {
      startProgress();
    });

    onUnmounted(() => {
      cleanup();
    });

    return {
      progressWidth,
      pauseAutoClose,
      resumeAutoClose,
    };
  },
};
</script>
