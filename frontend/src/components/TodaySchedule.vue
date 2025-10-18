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

    <!-- Doses will be managed by ScheduleList component -->
    <div class="info-message">
      <p>Today's doses are now managed in the Schedules tab for better organization.</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TodaySchedule',
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
      // Emit event to parent to refresh
      this.$emit('refresh');
    }
  }
};
</script>

<style scoped>
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

.info-message {
  background: #f0f9ff;
  border: 1px solid #0ea5e9;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
  color: #0c4a6e;
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
</style>
