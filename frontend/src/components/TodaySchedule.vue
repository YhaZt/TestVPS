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
            >
              ✓ Mark as Taken
            </button>
            <div v-else-if="dose.taken" class="taken-info">
              <span class="taken-time">Taken at {{ formatTime(dose.takenAt) }}</span>
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
</template>

<script>
import { getSchedules, getMedicines } from '../services/api';

export default {
  name: 'TodaySchedule',
  data() {
    return {
      schedules: [],
      medicines: [],
      todaysDoses: [],
      currentTime: new Date(),
      timeUpdateInterval: null,
      takenDoses: {}
    };
  },
  mounted() {
    this.loadTakenDoses();
    this.fetchSchedules();
    this.fetchMedicines();
    this.startTimeUpdater();
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

    refreshSchedule() {
      this.fetchSchedules();
      this.generateTodaysDoses();
    },

    // Local Storage Methods
    loadTakenDoses() {
      try {
        const stored = localStorage.getItem('medicine_taken_doses');
        this.takenDoses = stored ? JSON.parse(stored) : {};
      } catch (error) {
        console.error('Error loading taken doses:', error);
        this.takenDoses = {};
      }
    },

    saveTakenDoses() {
      try {
        localStorage.setItem('medicine_taken_doses', JSON.stringify(this.takenDoses));
      } catch (error) {
        console.error('Error saving taken doses:', error);
      }
    },

    getDoseKey(scheduleId, time, date) {
      return `${scheduleId}_${time}_${date}`;
    },

    async fetchSchedules() {
      try {
        const response = await getSchedules();
        this.schedules = response;
        this.generateTodaysDoses();
      } catch (error) {
        console.error('Error fetching schedules:', error);
      }
    },

    async fetchMedicines() {
      try {
        const response = await getMedicines();
        this.medicines = response;
      } catch (error) {
        console.error('Error fetching medicines:', error);
      }
    },

    generateTodaysDoses() {
      const today = new Date().toISOString().split('T')[0];
      this.todaysDoses = [];

      this.schedules.forEach(schedule => {
        if (schedule.dailyTimes && this.isScheduleActiveToday(schedule, today)) {
          schedule.dailyTimes.forEach(time => {
            const taken = this.isDoseTaken(schedule._id, time, today);
            const takenAt = this.getDoseTakenTime(schedule._id, time, today);

            this.todaysDoses.push({
              scheduleId: schedule._id,
              time: time,
              medicine: schedule.medicine,
              dosageAmount: schedule.dosageAmount,
              unit: schedule.unit,
              taken: taken,
              takenAt: takenAt
            });
          });
        }
      });

      // Sort by time
      this.todaysDoses.sort((a, b) => a.time.localeCompare(b.time));
    },

    isScheduleActiveToday(schedule, today) {
      const startDate = new Date(schedule.startDate).toISOString().split('T')[0];
      const endDate = new Date(schedule.endDate).toISOString().split('T')[0];
      return today >= startDate && today <= endDate;
    },

    isDoseTaken(scheduleId, time, date) {
      const key = this.getDoseKey(scheduleId, time, date);
      return this.takenDoses[key]?.taken || false;
    },

    getDoseTakenTime(scheduleId, time, date) {
      const key = this.getDoseKey(scheduleId, time, date);
      return this.takenDoses[key]?.takenAt || null;
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
      try {
        const today = new Date().toISOString().split('T')[0];
        const takenAt = new Date().toISOString();

        // Save to local storage
        const key = this.getDoseKey(dose.scheduleId, dose.time, today);
        this.takenDoses[key] = {
          taken: true,
          takenAt: takenAt,
          scheduleId: dose.scheduleId,
          time: dose.time,
          date: today
        };
        this.saveTakenDoses();

        // Update local state
        dose.taken = true;
        dose.takenAt = takenAt;

        // TODO: Save to database
        // await saveDoseToDatabase(dose);

        alert(`✓ ${dose.medicine?.name} marked as taken!`);

        // Refresh the parent component stats
        this.$emit('dose-taken');

      } catch (error) {
        console.error('Error marking dose as taken:', error);
        alert('Error marking dose as taken');
      }
    },

    startTimeUpdater() {
      this.timeUpdateInterval = setInterval(() => {
        this.currentTime = new Date();
        // Force reactivity update
        this.$forceUpdate();
      }, 60000); // Update every minute
    }
  }
};
</script>

<style scoped>
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

.btn-take-dose:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.taken-info {
  text-align: center;
  color: #6b7280;
  font-style: italic;
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
