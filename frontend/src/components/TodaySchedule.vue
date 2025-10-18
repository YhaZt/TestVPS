<template>
  <div class="today-schedule">
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

    <div v-if="loading" class="loading">Loading...</div>

    <div v-else-if="todayDoses.length === 0" class="empty-state">
      <p>🎉 No medicines scheduled for today!</p>
    </div>

    <div v-else class="doses-timeline">
      <div v-for="dose in sortedDoses" :key="`${dose.scheduleId}_${dose.time}`"
           :class="['dose-card', getDoseStatus(dose), { 'minimized': dose.taken }]">

        <!-- Minimized view for taken doses -->
        <div v-if="dose.taken" class="minimized-dose" @click="toggleMinimize(dose)">
          <div class="minimized-content">
            <span class="time">{{ formatDoseTime(dose.time) }}</span>
            <span class="medicine-name">{{ dose.medicine?.name || 'Unknown Medicine' }}</span>
            <span class="taken-badge">✓ Taken</span>
            <span class="expand-icon">▼</span>
          </div>

          <!-- Expanded details (shown when clicked) -->
          <div v-if="expandedDoses.includes(`${dose.scheduleId}_${dose.time}`)" class="expanded-details">
            <div class="dose-details">
              <p><strong>Dosage:</strong> {{ dose.dosageAmount }} {{ dose.unit }}</p>
              <p v-if="dose.requiresFood"><strong>⚠️ Food:</strong> Take with meal</p>
              <p v-if="dose.mustAvoid" class="warning"><strong>🚫 Avoid:</strong> {{ dose.mustAvoid }}</p>
              <p v-if="dose.medicine?.notes" class="notes">{{ dose.medicine.notes }}</p>
            </div>
            <div class="taken-info">
              Taken at {{ formatTime(dose.takenAt) }}
            </div>
          </div>
        </div>

        <!-- Full view for not-taken doses -->
        <div v-else>
          <div class="dose-time">
            <span class="time">{{ formatDoseTime(dose.time) }}</span>
            <span :class="['status-badge', getDoseStatus(dose)]">
              {{ getDoseStatusText(dose) }}
            </span>
          </div>

          <div class="dose-content">
            <h3>{{ dose.medicine?.name || 'Unknown Medicine' }}</h3>
            <div class="dose-details">
              <p><strong>Dosage:</strong> {{ dose.dosageAmount }} {{ dose.unit }}</p>
              <p v-if="dose.requiresFood">
                <strong>⚠️ Food:</strong> Take with meal
              </p>
              <p v-if="dose.mustAvoid" class="warning">
                <strong>🚫 Avoid:</strong> {{ dose.mustAvoid }}
              </p>
              <p v-if="dose.medicine?.notes" class="notes">
                {{ dose.medicine.notes }}
              </p>
            </div>

            <!-- Single button - fixed duplicate issue -->
            <button @click="markAsTaken(dose)"
                    :class="['btn-take', { 'btn-late': isPastDose(dose) }]">
              {{ isPastDose(dose) ? '⏰ Mark as Taken (Late)' : '✓ Mark as Taken' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Upcoming Doses Preview -->
    <div v-if="upcomingDoses.length > 0" class="upcoming-section">
      <h3>⏰ Next Doses</h3>
      <div class="upcoming-list">
        <div v-for="dose in upcomingDoses.slice(0, 3)" :key="`${dose.scheduleId}_${dose.time}`" class="upcoming-item">
          <span class="upcoming-time">{{ formatDoseTime(dose.time) }}</span>
          <span>{{ dose.medicine?.name || 'Unknown' }}</span>
          <span class="time-until">in {{ getTimeUntil(dose) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getTodaySchedules, markDoseAsTaken } from '@/services/api';

export default {
  name: 'TodaySchedule',
  data() {
    return {
      todayDoses: [],
      loading: false,
      error: null,
      expandedDoses: [], // Track which minimized doses are expanded
      currentDate: new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    };
  },
  computed: {
    sortedDoses() {
      const arr = Array.isArray(this.todayDoses) ? this.todayDoses : [];
      return arr.slice().sort((a, b) => {
        // Sort taken doses to bottom, then by time
        if (a.taken && !b.taken) return 1;
        if (!a.taken && b.taken) return -1;
        return (a.time || '').localeCompare(b.time || '');
      });
    },
    upcomingDoses() {
      const now = new Date();
      return this.sortedDoses.filter(dose => {
        if (!dose.time) return false;
        const doseTime = this.parseDoseTime(dose);
        return !dose.taken && doseTime > now;
      });
    }
  },
  mounted() {
    this.fetchTodaySchedules();
    // Refresh every minute
    this.refreshInterval = setInterval(() => {
      this.fetchTodaySchedules();
    }, 60000);
  },
  beforeUnmount() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  },
  methods: {
    async fetchTodaySchedules() {
      this.loading = true;
      this.error = null;
      try {
        const doses = await getTodaySchedules();
        this.todayDoses = Array.isArray(doses) ? doses : [];
        console.log('Today doses loaded:', this.todayDoses);
      } catch (e) {
        console.error('Error fetching today schedules:', e);
        this.error = 'Failed to load today doses';
        this.todayDoses = [];
      } finally {
        this.loading = false;
      }
    },
    async refreshSchedules() {
      await this.fetchTodaySchedules();
    },
    async markAsTaken(dose) {
      try {
        await markDoseAsTaken(dose.scheduleId, dose.time);
        await this.fetchTodaySchedules();
      } catch (e) {
        console.error('Mark taken failed:', e);
        alert('Failed to mark dose as taken');
      }
    },
    parseDoseTime(dose) {
      if (!dose.time) return new Date();
      const today = new Date();
      const [hours, minutes] = dose.time.split(':');
      return new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(hours), parseInt(minutes));
    },
    isPastDose(dose) {
      if (!dose.time) return false;
      return this.parseDoseTime(dose) < new Date();
    },
    getDoseStatus(dose) {
      if (dose.taken) return 'taken';
      if (this.isPastDose(dose)) return 'missed';
      const timeUntil = this.parseDoseTime(dose) - new Date();
      if (timeUntil <= 15 * 60 * 1000) return 'upcoming';
      return 'scheduled';
    },
    getDoseStatusText(dose) {
      if (dose.taken) return '✓ Taken';
      if (this.isPastDose(dose)) return '✗ Missed';
      const timeUntil = this.parseDoseTime(dose) - new Date();
      if (timeUntil <= 15 * 60 * 1000) return '⏰ Due Soon';
      return '📅 Scheduled';
    },
    formatTime(date) {
      return new Date(date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true // Add this to show AM/PM
      });
    },
    // Add new method to format dose times
    formatDoseTime(timeString) {
      if (!timeString) return '';
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    },
    getTimeUntil(dose) {
      if (!dose.time) return '—';
      const diff = this.parseDoseTime(dose) - new Date();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);

      if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
      }
      return `${minutes}m`;
    },
    toggleMinimize(dose) {
      const key = `${dose.scheduleId}_${dose.time}`;
      const index = this.expandedDoses.indexOf(key);
      if (index > -1) {
        this.expandedDoses.splice(index, 1);
      } else {
        this.expandedDoses.push(key);
      }
    },
    formatDate(date) {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    },
    refreshSchedule() {
      this.refreshSchedules();
    }
  }
};
</script>

<style scoped>
.btn-take {
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1.1rem;
  margin-top: 1rem;
}

.btn-take.btn-late {
  background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
}

.btn-take:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.btn-take.btn-late:hover {
  box-shadow: 0 5px 15px rgba(255, 152, 0, 0.4);
}
.today-schedule {
  background: white;
  border-radius: 12px;
  padding: 2rem;
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
}

.loading {
  text-align: center;
  padding: 3rem;
  font-size: 1.2rem;
  color: #666;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  font-size: 1.5rem;
  color: #667eea;
}

.doses-timeline {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.dose-card {
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s;
}

.dose-card.upcoming {
  border-color: #ff9800;
  background: #fff3e0;
  animation: pulse 2s infinite;
}

.dose-card.taken {
  border-color: #4caf50;
  background: #e8f5e9;
  opacity: 0.7;
}

.dose-card.missed {
  border-color: #f44336;
  background: #ffebee;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

.dose-time {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(0,0,0,0.1);
}

.time {
  font-size: 1.5rem;
  font-weight: bold;
  color: #667eea;
}

.status-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
}

.status-badge.scheduled {
  background: #e3f2fd;
  color: #1976d2;
}

.status-badge.upcoming {
  background: #ff9800;
  color: white;
}

.status-badge.taken {
  background: #4caf50;
  color: white;
}

.status-badge.missed {
  background: #f44336;
  color: white;
}

.dose-content h3 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #333;
}

.dose-details {
  margin: 1rem 0;
}

.dose-details p {
  margin: 0.5rem 0;
  color: #555;
}

.warning {
  color: #d32f2f;
  font-weight: 600;
}

.notes {
  color: #666;
  font-style: italic;
  margin-top: 1rem;
}

.taken-info {
  margin-top: 1rem;
  padding: 1rem;
  background: #e8f5e9;
  border-radius: 8px;
  color: #2e7d32;
  font-weight: 600;
}

.upcoming-section {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 2px solid #e0e0e0;
}

.upcoming-section h3 {
  margin-bottom: 1rem;
  color: #667eea;
}

.upcoming-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.upcoming-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 8px;
}

.upcoming-time {
  font-weight: 600;
  color: #667eea;
}

.time-until {
  color: #ff9800;
  font-weight: 600;
}

.dose-card.minimized {
  padding: 1rem;
  background: #f8f9fa;
  border-color: #e9ecef;
  opacity: 0.8;
}

.minimized-dose {
  cursor: pointer;
  transition: all 0.2s;
}

.minimized-dose:hover {
  background: #e9ecef;
  border-radius: 6px;
}

.minimized-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.minimized-content .time {
  font-weight: bold;
  color: #6c757d;
  min-width: 60px;
}

.medicine-name {
  flex: 1;
  color: #495057;
}

.taken-badge {
  background: #28a745;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
}

.expand-icon {
  color: #6c757d;
  font-size: 0.875rem;
  transition: transform 0.2s;
}

.minimized-dose .expanded-details {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #dee2e6;
}

.minimized-dose .expanded-details .expand-icon {
  transform: rotate(180deg);
}
</style>
