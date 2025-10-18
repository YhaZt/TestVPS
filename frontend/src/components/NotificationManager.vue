<template>
  <div class="notification-manager">
    <!-- PWA Install Prompt -->
    <div v-if="showInstallPrompt" class="install-banner">
      <div class="install-content">
        <span class="install-icon">📱</span>
        <div class="install-text">
          <strong>Install Medicine Scheduler</strong>
          <p>Add to your home screen for quick access</p>
        </div>
        <div class="install-actions">
          <button @click="installPWA" class="btn-install">Install</button>
          <button @click="dismissInstall" class="btn-dismiss">×</button>
        </div>
      </div>
    </div>

    <!-- Statistics Grid -->
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

    <!-- Notification Settings -->
    <div class="notification-settings">
      <h3>🔔 Notification Settings</h3>
      <div class="setting-item">
        <label class="toggle-label">
          <input
            type="checkbox"
            v-model="notificationsEnabled"
            @change="toggleNotifications"
          />
          <span class="toggle-slider"></span>
          Enable Medicine Reminders
        </label>
        <p class="setting-description">
          Get notified 15 minutes before your medicine time
        </p>
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
import { getTodaySchedules } from '@/services/api';

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
      checkInterval: null,
      notificationsEnabled: false,
      showInstallPrompt: false,
      installPromptEvent: null
    };
  },
  async mounted() {
    await this.initializeNotifications();
    this.checkInstallability();
    this.startNotificationCheck();
  },
  beforeUnmount() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  },
  methods: {
    async initializeNotifications() {
      // Check current notification permission
      if ('Notification' in window) {
        this.notificationsEnabled = Notification.permission === 'granted';

        // Request permission if default
        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          this.notificationsEnabled = permission === 'granted';
          console.log('Notification permission:', permission);
        }
      }
    },

    async toggleNotifications() {
      if (!('Notification' in window)) {
        alert('Notifications are not supported in this browser');
        this.notificationsEnabled = false;
        return;
      }

      if (this.notificationsEnabled && Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        this.notificationsEnabled = permission === 'granted';

        if (permission === 'denied') {
          alert('Please enable notifications in your browser settings to receive medicine reminders.');
        }
      }

      // Save setting to localStorage
      localStorage.setItem('notifications_enabled', this.notificationsEnabled);
    },

    checkInstallability() {
      // Listen for PWA install prompt
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        this.installPromptEvent = e;
        this.showInstallPrompt = true;
      });

      // Check if already installed
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        this.showInstallPrompt = false;
      }

      // Check if previously dismissed
      const dismissed = localStorage.getItem('install_prompt_dismissed');
      if (dismissed) {
        this.showInstallPrompt = false;
      }
    },

    async installPWA() {
      if (this.installPromptEvent) {
        this.installPromptEvent.prompt();
        const result = await this.installPromptEvent.userChoice;

        if (result.outcome === 'accepted') {
          console.log('PWA installed');
        }

        this.installPromptEvent = null;
        this.showInstallPrompt = false;
      }
    },

    dismissInstall() {
      this.showInstallPrompt = false;
      localStorage.setItem('install_prompt_dismissed', 'true');
    },

    startNotificationCheck() {
      // Check every 2 minutes for upcoming doses
      this.checkInterval = setInterval(() => {
        if (this.notificationsEnabled) {
          this.checkUpcomingDoses();
        }
      }, 2 * 60 * 1000);

      // Initial check
      if (this.notificationsEnabled) {
        this.checkUpcomingDoses();
      }
    },

    async checkUpcomingDoses() {
      try {
        const todaysDoses = await getTodaySchedules();
        const now = new Date();

        todaysDoses.forEach(dose => {
          if (!dose.time || dose.taken) return;

          const doseTime = this.parseDoseTime(dose.time);
          const timeDiff = doseTime - now;

          // Notify 15 minutes before and at dose time
          const shouldNotify = (
            (timeDiff > 14 * 60 * 1000 && timeDiff <= 15 * 60 * 1000) || // 15 min before
            (timeDiff > -1 * 60 * 1000 && timeDiff <= 1 * 60 * 1000)      // At dose time
          );

          if (shouldNotify) {
            this.showNotification(dose, timeDiff);
          }
        });
      } catch (error) {
        console.error('Error checking upcoming doses:', error);
      }
    },

    parseDoseTime(timeStr) {
      const today = new Date();
      const [hours, minutes] = timeStr.split(':').map(Number);
      return new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
    },

    showNotification(dose, timeDiff) {
      const notificationId = `${dose.scheduleId}_${dose.time}`;

      // Don't show duplicate notifications
      if (this.notifications.includes(notificationId)) return;

      this.notifications.push(notificationId);

      if ('Notification' in window && Notification.permission === 'granted') {
        const medicineName = dose.medicine?.name || 'your medicine';
        const isTimeNow = timeDiff <= 1 * 60 * 1000;

        const title = isTimeNow ? '💊 Time for Medicine!' : '⏰ Medicine Reminder';
        const body = isTimeNow
          ? `Take ${medicineName} now - ${dose.dosageAmount} ${dose.unit}`
          : `${medicineName} in 15 minutes - ${dose.dosageAmount} ${dose.unit}`;

        const notification = new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: notificationId,
          requireInteraction: true,
          badge: '/favicon.ico'
        });

        // Auto close after 10 seconds
        setTimeout(() => notification.close(), 10000);

        // Remove from notifications array after showing
        setTimeout(() => {
          const index = this.notifications.indexOf(notificationId);
          if (index > -1) {
            this.notifications.splice(index, 1);
          }
        }, 60000); // Remove after 1 minute
      }
    }
  }
};
</script>

<style scoped>
.notification-manager {
  space-y: 1.5rem;
}

.install-banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.install-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.install-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.install-text {
  flex: 1;
}

.install-text strong {
  display: block;
  font-size: 1.1rem;
  margin-bottom: 0.25rem;
}

.install-text p {
  margin: 0;
  opacity: 0.9;
  font-size: 0.9rem;
}

.install-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.btn-install {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-install:hover {
  background: rgba(255, 255, 255, 0.3);
}

.btn-dismiss {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
  opacity: 0.7;
}

.btn-dismiss:hover {
  opacity: 1;
}

.notification-settings {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-top: 1.5rem;
}

.notification-settings h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 1rem;
}

.setting-item {
  margin-bottom: 1rem;
}

.toggle-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-weight: 500;
  color: #374151;
}

.toggle-label input[type="checkbox"] {
  display: none;
}

.toggle-slider {
  position: relative;
  width: 44px;
  height: 24px;
  background: #e5e7eb;
  border-radius: 24px;
  margin-right: 0.75rem;
  transition: background 0.3s;
}

.toggle-slider:before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  transition: transform 0.3s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-label input:checked + .toggle-slider {
  background: #10b981;
}

.toggle-label input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

.setting-description {
  margin: 0.5rem 0 0 3.25rem;
  font-size: 0.875rem;
  color: #6b7280;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .install-content {
    flex-direction: column;
    text-align: center;
    gap: 0.75rem;
  }

  .install-actions {
    justify-content: center;
    width: 100%;
  }

  .btn-install {
    flex: 1;
  }
}
</style>
