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
          <router-link to="/calendar" class="nav-link">Calendar</router-link>
        </nav>
      </div>
    </header>

    <main class="app-main">
      <div class="container">
        <!-- Mobile Stats Widget (horizontal) - only show on today tab -->
        <div v-if="activeTab === 'today'" class="mobile-stats-wrapper">
          <StatsWidget ref="mobileStats" />
        </div>

        <div class="main-layout">
          <div class="content-area">
            <TodaySchedule
              v-if="activeTab === 'today'"
              @dose-taken="refreshStats"
            />
            <MedicineList v-if="activeTab === 'medicines'" />
            <ScheduleList v-if="activeTab === 'schedules'" @schedule-updated="refreshStats" />
          </div>

          <!-- Desktop Stats Widget (sidebar) -->
          <aside class="desktop-sidebar">
            <StatsWidget ref="desktopStats" />
          </aside>
        </div>
      </div>
      <router-view />
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
      activeTab: 'today',
      tabs: [
        { id: 'today', label: "Today's Doses" },
        { id: 'medicines', label: 'Medicines' },
        { id: 'schedules', label: 'Schedules' }
      ]
    };
  },
  methods: {
    refreshStats() {
      // Refresh both mobile and desktop stats
      if (this.$refs.mobileStats) {
        this.$refs.mobileStats.refresh();
      }
      if (this.$refs.desktopStats) {
        this.$refs.desktopStats.refresh();
      }
    }
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
  padding: 0 1rem;
}

.app-header {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 100;
}

.app-header .container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.logo-icon {
  font-size: 1.5rem;
}

.logo h1 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
}

.main-nav {
  display: flex;
  gap: 0.5rem;
}

.nav-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.5rem;
  background: #f3f4f6;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;
  font-weight: 500;
}

.nav-button:hover {
  background: #e5e7eb;
}

.nav-button.active {
  background: #6366f1;
  color: white;
}

.app-main {
  padding: 1rem 0;
  min-height: calc(100vh - 80px);
}

/* Mobile Stats Widget */
.mobile-stats-wrapper {
  display: block;
  margin-bottom: 1.5rem;
}

/* Desktop Sidebar */
.desktop-sidebar {
  display: none;
}

.main-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}

.content-area {
  min-height: 400px;
}

/* Desktop Layout */
@media (min-width: 1024px) {
  .container {
    padding: 0 2rem;
  }

  .mobile-stats-wrapper {
    display: none;
  }

  .desktop-sidebar {
    display: block;
  }

  .main-layout {
    grid-template-columns: 1fr 300px;
  }
}

/* Mobile Navigation */
@media (max-width: 768px) {
  .app-header .container {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }

  .logo {
    align-self: center;
  }

  .main-nav {
    width: 100%;
    justify-content: center;
  }

  .nav-button {
    flex: 1;
    text-align: center;
    padding: 0.75rem 0.5rem;
    font-size: 0.8rem;
  }

  .logo h1 {
    font-size: 1.1rem;
  }

  .logo-icon {
    font-size: 1.3rem;
  }
}

.nav-link {
  margin-right: 12px;
  text-decoration: none;
  color: #374151;
}
.nav-link.router-link-active {
  color: #6366f1;
  font-weight: 600;
}
</style>
