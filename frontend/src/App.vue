<template>
  <div id="app">
    <header class="app-header">
        <div class="container">
        <div class="logo">
          <span class="logo-icon">🏥</span>
          <h1>Medicine Scheduler</h1>
        </div>
        <nav class="main-nav">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="['nav-button', { active: activeTab === tab.id }]"
          >
            {{ tab.label }}
          </button>
        </nav>
      </div>
    </header>

    <main class="app-main">
      <div class="container">
        <div class="main-layout">
          <div class="content-area">
            <TodaySchedule v-if="activeTab === 'today'" />
            <MedicineList v-if="activeTab === 'medicines'" />
            <ScheduleList v-if="activeTab === 'schedules'" />
          </div>

          <aside class="sidebar">
            <StatsWidget />
          </aside>
        </div>
      </div>
    </main>

  </div>
</template>

<script>
import MedicineList from './components/MedicineList.vue';
import ScheduleList from './components/ScheduleList.vue';
import TodaySchedule from './components/TodaySchedule.vue';
import StatsWidget from './components/StatsWidget.vue';

export default {
  name: 'App',
  components: {
    MedicineList,
    ScheduleList,
    TodaySchedule,
    StatsWidget
  },
  data() {
    return {
      activeTab: 'today', // Changed from 'medicines' to 'today'
      tabs: [
        { id: 'today', label: "Today's Doses" }, // Moved to first position
        { id: 'medicines', label: 'Medicines' },
        { id: 'schedules', label: 'Schedules' }
      ]
    };
  }
};
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f8fafc;
  line-height: 1.6;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
}

.app-header {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 1rem 0;
}

.app-header .container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-icon {
  font-size: 2rem;
}

.logo h1 {
  color: #6366f1;
  font-size: 1.5rem;
  font-weight: 700;
}

.main-nav {
  display: flex;
  gap: 0.5rem;
}

.nav-button {
  padding: 0.75rem 1.5rem;
  border: 2px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: #6b7280;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-button.active {
  background: #6366f1;
  color: white;
}

.nav-button:hover:not(.active) {
  background: #f3f4f6;
  color: #374151;
}

.app-main {
  padding: 2rem 0;
  min-height: calc(100vh - 120px);
}

.main-layout {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 2rem;
  align-items: start;
}

.content-area {
  min-height: 500px;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

@media (max-width: 1024px) {
  .main-layout {
    grid-template-columns: 1fr;
  }

  .sidebar {
    order: -1;
  }

  .stats-widget {
    width: 100%;
  }
}
</style>
