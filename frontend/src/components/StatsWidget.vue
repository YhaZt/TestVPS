<template>
  <div class="stats-widget">
    <h3 class="stats-title">📊 Today's Overview</h3>
    <div class="stats-grid">
      <div class="stat-card total">
        <div class="stat-number">{{ stats.total }}</div>
        <div class="stat-label">Total Tasks</div>
      </div>

      <div class="stat-card completed">
        <div class="stat-number">{{ stats.completed }}</div>
        <div class="stat-label">Completed</div>
      </div>

      <div class="stat-card pending">
        <div class="stat-number">{{ stats.pending }}</div>
        <div class="stat-label">Pending</div>
      </div>

      <div class="stat-card overdue">
        <div class="stat-number">{{ stats.overdue }}</div>
        <div class="stat-label">Overdue</div>
      </div>
    </div>
  </div>
</template>

<script>
import { getSchedules } from '../services/api';

export default {
  name: 'StatsWidget',
  data() {
    return {
      schedules: [],
      takenDoses: {}
    };
  },
  computed: {
    stats() {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();

      let total = 0;
      let completed = 0;
      let pending = 0;
      let overdue = 0;

      this.schedules.forEach(schedule => {
        if (schedule.dailyTimes && this.isScheduleActiveToday(schedule, today)) {
          schedule.dailyTimes.forEach(time => {
            total++;

            const taken = this.isDoseTaken(schedule._id, time, today);
            if (taken) {
              completed++;
            } else {
              const [hours, minutes] = time.split(':').map(Number);
              const doseDateTime = new Date();
              doseDateTime.setHours(hours, minutes, 0, 0);

              if (now > doseDateTime) {
                overdue++;
              } else {
                pending++;
              }
            }
          });
        }
      });

      return { total, completed, pending, overdue };
    }
  },
  mounted() {
    this.loadTakenDoses();
    this.fetchSchedules();
  },
  methods: {
    loadTakenDoses() {
      try {
        const stored = localStorage.getItem('medicine_taken_doses');
        this.takenDoses = stored ? JSON.parse(stored) : {};
      } catch {
        this.takenDoses = {};
      }
    },

    async fetchSchedules() {
      try {
        const response = await getSchedules();
        this.schedules = response;
      } catch (error) {
        console.error('Error fetching schedules for stats:', error);
      }
    },

    isScheduleActiveToday(schedule, today) {
      const startDate = new Date(schedule.startDate).toISOString().split('T')[0];
      const endDate = new Date(schedule.endDate).toISOString().split('T')[0];
      return today >= startDate && today <= endDate;
    },

    isDoseTaken(scheduleId, time, date) {
      const key = `${scheduleId}_${time}_${date}`;
      return this.takenDoses[key]?.taken || false;
    },

    refresh() {
      this.loadTakenDoses();
      this.fetchSchedules();
    }
  }
};
</script>

<style scoped>
.stats-widget {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stats-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 1rem;
  text-align: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.stat-card {
  text-align: center;
  padding: 1rem;
  border-radius: 8px;
  background: #f9fafb;
  border-left: 4px solid;
}

.stat-card.total {
  border-left-color: #6366f1;
}

.stat-card.completed {
  border-left-color: #10b981;
}

.stat-card.pending {
  border-left-color: #f59e0b;
}

.stat-card.overdue {
  border-left-color: #ef4444;
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Mobile Layout */
@media (max-width: 768px) {
  .stats-widget {
    padding: 1rem;
    margin-bottom: 0;
  }

  .stats-title {
    font-size: 0.9rem;
    margin-bottom: 0.75rem;
  }

  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
  }

  .stat-card {
    padding: 0.75rem 0.5rem;
  }

  .stat-number {
    font-size: 1.25rem;
  }

  .stat-label {
    font-size: 0.65rem;
  }
}

/* Desktop Layout */
@media (min-width: 1024px) {
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .stat-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    text-align: left;
    padding: 1rem;
  }

  .stat-number {
    font-size: 2rem;
    margin-bottom: 0;
  }
}
</style>
