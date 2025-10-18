<template>
  <div class="stats-widget">
    <h3 class="stats-title">📊 Today's Overview</h3>
    <div class="stats-grid">
      <div class="stat-card total">
        <div class="stat-number">{{ totalTasks }}</div>
        <div class="stat-label">Total Tasks</div>
      </div>

      <div class="stat-card completed">
        <div class="stat-number">{{ completedTasks }}</div>
        <div class="stat-label">Completed</div>
      </div>

      <div class="stat-card pending">
        <div class="stat-number">{{ pendingTasks }}</div>
        <div class="stat-label">Pending</div>
      </div>

      <div class="stat-card overdue">
        <div class="stat-number">{{ overdueTasks }}</div>
        <div class="stat-label">Overdue</div>
      </div>
    </div>
  </div>
</template>

<script>
import { getTodaySchedules } from '@/services/api';

export default {
  name: 'StatsWidget',
  data() {
    return {
      todayDoses: []
    };
  },
  computed: {
    totalTasks() {
      return this.todayDoses.length;
    },
    completedTasks() {
      return this.todayDoses.filter(dose => dose.taken).length;
    },
    pendingTasks() {
      const now = new Date();
      return this.todayDoses.filter(dose => {
        if (dose.taken) return false;
        const doseTime = this.parseDoseTime(dose);
        return doseTime > now;
      }).length;
    },
    overdueTasks() {
      const now = new Date();
      return this.todayDoses.filter(dose => {
        if (dose.taken) return false;
        const doseTime = this.parseDoseTime(dose);
        return doseTime <= now;
      }).length;
    }
  },
  async mounted() {
    await this.loadStats();
    // Refresh every 30 seconds
    this.interval = setInterval(() => {
      this.loadStats();
    }, 30000);
  },
  beforeUnmount() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  },
  methods: {
    async loadStats() {
      try {
        const doses = await getTodaySchedules();
        this.todayDoses = Array.isArray(doses) ? doses : [];
      } catch (e) {
        console.error('Failed to load stats:', e);
      }
    },
    parseDoseTime(dose) {
      if (!dose.time) return new Date();
      const today = new Date();
      const [hours, minutes] = dose.time.split(':');
      return new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(hours), parseInt(minutes));
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
