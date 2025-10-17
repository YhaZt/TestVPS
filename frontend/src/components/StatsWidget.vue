<template>
  <div class="stats-widget">
    <h3>📊 Today's Overview</h3>

    <div class="stat-card">
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
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  width: 280px;
  position: sticky;
  top: 2rem;
}

.stats-widget h3 {
  margin: 0 0 1.5rem 0;
  color: #1f2937;
  font-size: 1.1rem;
  font-weight: 600;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 8px;
  background: #f8fafc;
  border-left: 4px solid #6b7280;
}

.stat-card.completed {
  background: #f0f9ff;
  border-left-color: #10b981;
}

.stat-card.pending {
  background: #fffbeb;
  border-left-color: #f59e0b;
}

.stat-card.overdue {
  background: #fef2f2;
  border-left-color: #ef4444;
}

.stat-number {
  font-size: 2rem;
  font-weight: bold;
  color: #1f2937;
  line-height: 1;
}

.stat-card.completed .stat-number {
  color: #10b981;
}

.stat-card.pending .stat-number {
  color: #f59e0b;
}

.stat-card.overdue .stat-number {
  color: #ef4444;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.25rem;
  font-weight: 500;
}
</style>
