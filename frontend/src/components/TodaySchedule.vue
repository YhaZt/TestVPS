<template>
  <div class="today-schedule">
    <!-- Today's Doses Section -->
    <div class="todays-doses">
      <div class="schedule-header">
        <div class="header-content">
          <h2 class="schedule-title">
            📅 Today's Doses - {{ formatDate(new Date()) }}
          </h2>
          <button @click="refreshSchedule" class="refresh-btn">
            🔄 Refresh
          </button>
        </div>
      </div>

      <div class="dose-timeline">
        <div
          v-for="dose in todaysDoses"
          :key="`${dose.scheduleId}_${dose.time}`"
          :class="['dose-card', getDoseStatus(dose)]"
        >
          <div class="dose-header">
            <div class="dose-time">{{ formatTime(dose.time) }}</div>
            <div class="dose-status">
              <span v-if="dose.taken" class="status-badge taken">✓ Taken</span>
              <span v-else-if="isDoseReady(dose.time)" class="status-badge ready">🔔 Ready</span>
              <span v-else class="status-badge scheduled">📅 Scheduled</span>
            </div>
          </div>

          <div class="dose-content">
            <h4>{{ dose.medicine?.name || 'Unknown Medicine' }}</h4>
            <p class="dosage">💊 {{ dose.dosageAmount }} {{ dose.unit }}</p>

            <!-- Time until dose -->
            <div v-if="!dose.taken" class="time-info">
              <span v-if="isDoseReady(dose.time)" class="time-ready">⏰ Time to take!</span>
              <span v-else class="time-countdown">⏱️ {{ getTimeUntilDose(dose.time) }}</span>
            </div>

            <!-- Medicine info -->
            <div v-if="dose.medicine?.requiresFood || dose.medicine?.mustAvoid" class="medicine-alerts">
              <p v-if="dose.medicine?.requiresFood" class="food-alert">🍽️ Take with food</p>
              <p v-if="dose.medicine?.mustAvoid" class="avoid-alert">⚠️ Avoid: {{ dose.medicine.mustAvoid }}</p>
            </div>
          </div>

          <!-- Action button - only show if time is ready and not taken -->
          <div class="dose-actions">
            <button
              v-if="isDoseReady(dose.time) && !dose.taken"
              @click="markAsTaken(dose)"
              class="btn-take-dose"
              :disabled="markingDose"
            >
              {{ markingDose ? '⏳ Saving...' : '✓ Mark as Taken' }}
            </button>
            <div v-else-if="dose.taken" class="taken-info">
              <span class="taken-time">✓ Taken at {{ formatTime(dose.takenAt) }}</span>
              <button @click="unmarkDose(dose)" class="btn-unmark">↶ Undo</button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="todaysDoses.length === 0" class="no-doses">
        <p>📋 No doses scheduled for today</p>
        <p>Go to <strong>Schedules</strong> tab to create medicine schedules</p>
      </div>
    </div>
  </div>

  <section>
    <div v-if="nextDose" class="next-dose-card">
      <!-- show nextDose summary with a small Done button -->
    </div>

    <div class="card">
      <div class="card-title">Upcoming</div>
      <!-- render not-taken doses except nextDose, ascending -->
    </div>

    <details class="card">
      <summary class="card-title">Completed ({{ completed.length }})</summary>
      <!-- render taken doses -->
    </details>
  </section>
</template>

<script>
import { getTodaySchedules, markDoseAsTaken, unmarkDose } from '../services/api';

export default {
  name: 'TodaySchedule',
  data() {
    return {
      todaysDoses: [],
      currentTime: new Date(),
      timeUpdateInterval: null,
      markingDose: false,
      lastRefresh: null
    };
  },
  mounted() {
    this.fetchTodaysDoses();
    this.startTimeUpdater();
    this.requestNotificationPermission();
  },
  beforeUnmount() {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }
  },
  methods: {
    formatDate(date) {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    },

    async refreshSchedule() {
      await this.fetchTodaysDoses();
      this.$emit('dose-taken'); // Refresh stats
    },

    async fetchTodaysDoses() {
      try {
        this.todaysDoses = await getTodaySchedules();
        this.lastRefresh = new Date();
        console.log('Fetched today\'s doses:', this.todaysDoses.length);
      } catch (error) {
        console.error('Error fetching today\'s doses:', error);
        this.showToast('Error loading doses', 'error');
      }
    },

    async requestNotificationPermission() {
      if ('Notification' in window) {
        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          console.log('Notification permission:', permission);
          if (permission === 'granted') {
            this.showToast('Notifications enabled! You\'ll get reminders for your medicines.', 'success');
          }
        }
      } else {
        console.log('Notifications not supported');
      }
    },

    isDoseReady(doseTime) {
      const now = new Date();
      const [hours, minutes] = doseTime.split(':').map(Number);
      const doseDateTime = new Date();
      doseDateTime.setHours(hours, minutes, 0, 0);
      return now >= doseDateTime;
    },

    getDoseStatus(dose) {
      if (dose.taken) return 'taken';
      if (this.isDoseReady(dose.time)) return 'ready';
      return 'scheduled';
    },

    getTimeUntilDose(doseTime) {
      const now = new Date();
      const [hours, minutes] = doseTime.split(':').map(Number);
      const doseDateTime = new Date();
      doseDateTime.setHours(hours, minutes, 0, 0);

      if (doseDateTime <= now) {
        return 'Now';
      }

      const diffMs = doseDateTime - now;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (diffHours > 0) {
        return `in ${diffHours}h ${diffMinutes}m`;
      } else {
        return `in ${diffMinutes}m`;
      }
    },

    formatTime(time) {
      if (!time) return '';

      // Handle ISO string format
      if (time.includes('T')) {
        return new Date(time).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }

      // Handle HH:MM format
      if (time.includes(':')) {
        const [hours, minutes] = time.split(':').map(Number);
        const displayHour = hours % 12 || 12;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        return `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
      }

      return time;
    },

    async markAsTaken(dose) {
      if (this.markingDose) return;

      this.markingDose = true;
      try {
        const today = new Date().toISOString().split('T')[0];

        // Save to database
        await markDoseAsTaken(dose.scheduleId, dose.time, today);

        // Update local state
        dose.taken = true;
        dose.takenAt = new Date().toISOString();

        this.showToast(`✓ ${dose.medicine?.name} marked as taken!`, 'success');
        this.$emit('dose-taken'); // Refresh stats

      } catch (error) {
        console.error('Error marking dose as taken:', error);
        this.showToast('Error saving dose. Please try again.', 'error');
      } finally {
        this.markingDose = false;
      }
    },

    async unmarkDose(dose) {
      try {
        const today = new Date().toISOString().split('T')[0];

        // Remove from database
        await unmarkDose(dose.scheduleId, dose.time, today);

        // Update local state
        dose.taken = false;
        dose.takenAt = null;

        this.showToast(`Dose unmarked for ${dose.medicine?.name}`, 'success');
        this.$emit('dose-taken'); // Refresh stats

      } catch (error) {
        console.error('Error unmarking dose:', error);
        this.showToast('Error unmarking dose. Please try again.', 'error');
      }
    },

    showToast(message, type = 'success') {
      // Simple toast implementation
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.textContent = message;
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        max-width: 400px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `;

      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => document.body.removeChild(toast), 300);
      }, 3000);
    },

    startTimeUpdater() {
      this.timeUpdateInterval = setInterval(() => {
        this.currentTime = new Date();

        // Auto-refresh doses every 5 minutes
        if (this.lastRefresh && (this.currentTime - this.lastRefresh) > 5 * 60 * 1000) {
          this.fetchTodaysDoses();
        }

        this.$forceUpdate();
      }, 60000); // Update every minute
    }
  },
  computed: {
    nextDose() {
      const pending = this.todaysDoses.filter(d => !d.taken).sort((a,b)=>a.time.localeCompare(b.time));
      const after = pending.find(d => this.isDoseReady(d.time));
      return after || pending[0] || null;
    },
    completed() {
      return this.todaysDoses.filter(d => d.taken).sort((a,b)=>a.time.localeCompare(b.time));
    }
  }
};
</script>

<style scoped>
/* ...existing styles... */

.btn-unmark {
  background: #f59e0b;
  color: white;
  border: none;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  cursor: pointer;
  margin-left: 0.5rem;
  transition: background 0.2s;
}

.btn-unmark:hover {
  background: #d97706;
}

.btn-take-dose:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
}

.taken-info {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  text-align: center;
  color: #6b7280;
  font-style: italic;
}

/* Toast animations */
.toast {
  animation: slideIn 0.3s ease;
  transition: all 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Existing styles remain the same... */
.todays-doses {
  margin-bottom: 2rem;
}

.schedule-header {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.schedule-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.refresh-btn {
  padding: 0.5rem 1rem;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background 0.2s;
}

.refresh-btn:hover {
  background: #5855eb;
}

.dose-timeline {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dose-card {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s ease;
}

.dose-card.ready {
  border-color: #f59e0b;
  background: #fffbeb;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
}

.dose-card.taken {
  border-color: #10b981;
  background: #f0fdf4;
  opacity: 0.8;
}

.dose-card.scheduled {
  border-color: #6b7280;
  background: #f9fafb;
}

.dose-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.dose-time {
  font-size: 1.25rem;
  font-weight: 700;
  color: #6366f1;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
}

.status-badge.taken {
  background: #dcfce7;
  color: #166534;
}

.status-badge.ready {
  background: #fef3c7;
  color: #92400e;
  animation: pulse 2s infinite;
}

.status-badge.scheduled {
  background: #f3f4f6;
  color: #6b7280;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.dose-content h4 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #1f2937;
}

.dosage {
  color: #6b7280;
  margin-bottom: 0.75rem;
}

.time-info {
  margin: 0.75rem 0;
}

.time-ready {
  color: #dc2626;
  font-weight: 600;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0.5; }
}

.time-countdown {
  color: #6b7280;
  font-weight: 500;
}

.medicine-alerts {
  margin: 0.75rem 0;
}

.food-alert {
  color: #f59e0b;
  font-size: 0.875rem;
  margin: 0.25rem 0;
}

.avoid-alert {
  color: #dc2626;
  font-size: 0.875rem;
  margin: 0.25rem 0;
}

.dose-actions {
  margin-top: 1rem;
}

.btn-take-dose {
  width: 100%;
  padding: 0.75rem;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-take-dose:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.no-doses {
  background: white;
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  color: #6b7280;
}

.no-doses p {
  margin-bottom: 0.5rem;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .schedule-header {
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .header-content {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .schedule-title {
    font-size: 1.1rem;
  }

  .refresh-btn {
    width: 100%;
    padding: 0.75rem;
  }

  .dose-card {
    padding: 1rem;
  }

  .dose-header {
    flex-direction: column;
    gap: 0.5rem;
    text-align: center;
  }
}
</style>
