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
import { getUpcomingDoses } from '@/services/api';

export default {
  name: 'NotificationManager',
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
  data() {
    return {
      notifications: [],
      checkInterval: null
    };
  },
  async mounted() {
    await this.requestNotificationPermission();
    this.startNotificationCheck();
  },
  beforeUnmount() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  },
  methods: {
    async requestNotificationPermission() {
      if ('Notification' in window && Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
      }
    },
    startNotificationCheck() {
      // Check every 5 minutes
      this.checkInterval = setInterval(() => {
        this.checkUpcomingDoses();
      }, 5 * 60 * 1000);

      // Initial check
      this.checkUpcomingDoses();
    },
    async checkUpcomingDoses() {
      try {
        const upcoming = await getUpcomingDoses(1); // Next 24 hours
        const upcomingList = Array.isArray(upcoming) ? upcoming : [];

        upcomingList.forEach(dose => {
          if (!dose.time) return;

          const now = new Date();
          const doseTime = this.parseDoseTime(dose);
          const timeDiff = doseTime - now;

          // Notify 15 minutes before
          if (timeDiff > 0 && timeDiff <= 15 * 60 * 1000 && !dose.taken) {
            this.showNotification(dose);
          }
        });
      } catch (e) {
        console.error('Error checking upcoming doses:', e);
      }
    },
    parseDoseTime(dose) {
      if (!dose.time) return new Date();
      const today = new Date();
      const [hours, minutes] = dose.time.split(':');
      return new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(hours), parseInt(minutes));
    },
    showNotification(dose) {
      const notificationId = `${dose.scheduleId}_${dose.time}`;

      // Don't show duplicate notifications
      if (this.notifications.includes(notificationId)) return;

      this.notifications.push(notificationId);

      if ('Notification' in window && Notification.permission === 'granted') {
        const medicineName = dose.medicine?.name || 'your medicine';
        new Notification('💊 Medicine Reminder', {
          body: `Time to take ${medicineName} - ${dose.dosageAmount} ${dose.unit}`,
          icon: '/favicon.ico',
          tag: notificationId,
          requireInteraction: true
        });
      }
    }
  }
};
</script>
