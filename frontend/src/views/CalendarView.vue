<template>
  <div class="calendar-page">
    <header class="calendar-header">
      <button class="nav-btn" @click="prevMonth">‹</button>
      <h2>{{ monthTitle }}</h2>
      <button class="nav-btn" @click="nextMonth">›</button>
    </header>

    <div class="calendar-grid">
      <div class="weekday" v-for="d in weekdays" :key="d">{{ d }}</div>
      <button
        v-for="day in monthDays"
        :key="day.key"
        class="day-cell"
        :class="{
          'other-month': !day.inMonth,
          today: day.isToday,
          selected: isSameDate(day.date, selectedDate)
        }"
        @click="selectDate(day.date)"
      >
        <div class="date-num">{{ day.date.getDate() }}</div>
        <div class="dots">
          <span
            v-for="n in (getDayCounts(day.date).total || 0)"
            :key="n"
            class="dot"
            :class="{ done: n <= (getDayCounts(day.date).done || 0) }"
          />
        </div>
      </button>
    </div>

    <!-- Selected day schedule -->
    <section class="day-details">
      <h3>{{ formatLongDate(selectedDate) }}</h3>

      <!-- Next dose pinned on top -->
      <div v-if="nextDose" class="next-dose-card">
        <div class="row">
          <div>
            <div class="pill">{{ nextDose.medicine?.name || 'Medicine' }}</div>
            <div class="line">
              <strong>{{ formatTime(nextDose.time) }}</strong>
              <span> • {{ nextDose.dosageAmount }} {{ nextDose.unit }}</span>
            </div>
          </div>
          <button class="btn small" @click="markAsTaken(nextDose)" v-if="!nextDose.taken">
            ✓ Mark done
          </button>
        </div>
      </div>

      <!-- Upcoming (not taken) -->
      <div class="card">
        <div class="card-title">Upcoming</div>
        <div v-if="upcomingDoses.length === 0" class="empty">No upcoming doses</div>
        <ul class="list">
          <li v-for="dose in upcomingDoses" :key="doseKeyForList(dose)" class="row">
            <div>
              <div class="pill">{{ dose.medicine?.name || 'Medicine' }}</div>
              <div class="muted">{{ formatTime(dose.time) }} • {{ dose.dosageAmount }} {{ dose.unit }}</div>
            </div>
            <button class="btn small" @click="markAsTaken(dose)">✓ Done</button>
          </li>
        </ul>
      </div>

      <!-- Completed minimized below -->
      <details class="card" :open="false">
        <summary class="card-title">Completed ({{ completedDoses.length }})</summary>
        <ul class="list compact">
          <li v-for="dose in completedDoses" :key="doseKeyForList(dose)" class="row">
            <div>
              <div class="pill done">✓ {{ dose.medicine?.name || 'Medicine' }}</div>
              <div class="muted">{{ formatTime(dose.time) }} • taken at {{ formatTime(dose.takenAt) }}</div>
            </div>
            <button class="btn small ghost" @click="undoTaken(dose)">↶ Undo</button>
          </li>
        </ul>
      </details>
    </section>
  </div>
</template>

<script>
import { getSchedules } from '@/services/api';

export default {
  name: 'CalendarView',
  data() {
    const today = new Date();
    return {
      schedules: [],
      currentMonth: new Date(today.getFullYear(), today.getMonth(), 1),
      selectedDate: today,
      dayDoses: [],
      takenDoses: {} // localStorage fallback
    };
  },
  computed: {
    monthTitle() {
      return this.currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    },
    weekdays() {
      return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    },
    monthDays() {
      const start = new Date(this.currentMonth);
      const firstDow = start.getDay();
      const days = [];
      // Start from the Sunday before (or same day if Sunday)
      const gridStart = new Date(start);
      gridStart.setDate(1 - firstDow);

      for (let i = 0; i < 42; i++) {
        const d = new Date(gridStart);
        d.setDate(gridStart.getDate() + i);
        days.push({
          date: d,
          key: d.toDateString(),
          inMonth: d.getMonth() === this.currentMonth.getMonth(),
          isToday: this.isSameDate(d, new Date())
        });
      }
      return days;
    },
    nextDose() {
      const now = new Date();
      const isToday = this.isSameDate(this.selectedDate, now);
      const pool = this.dayDoses.filter(d => !d.taken);
      if (pool.length === 0) return null;
      const sorted = pool.slice().sort((a, b) => a.time.localeCompare(b.time));
      if (!isToday) return sorted[0];
      // if today, pick the first not-past or the earliest
      const afterNow = sorted.find(d => this.timeToDate(d.time, this.selectedDate) >= now);
      return afterNow || sorted[0];
    },
    upcomingDoses() {
      const list = this.dayDoses.filter(d => !d.taken)
        .sort((a, b) => a.time.localeCompare(b.time));
      // Keep nextDose at top by filtering it out here if present
      if (this.nextDose) {
        return list.filter(d => !(d.scheduleId === this.nextDose.scheduleId && d.time === this.nextDose.time));
      }
      return list;
    },
    completedDoses() {
      return this.dayDoses.filter(d => d.taken)
        .sort((a, b) => a.time.localeCompare(b.time));
    }
  },
  async mounted() {
    this.loadTakenDosesLocal();
    await this.fetchSchedules();
    this.rebuildDayDoses();
  },
  watch: {
    selectedDate() {
      this.rebuildDayDoses();
    },
    schedules() {
      this.rebuildDayDoses();
    }
  },
  methods: {
    // Month nav
    prevMonth() {
      const m = new Date(this.currentMonth);
      m.setMonth(m.getMonth() - 1);
      this.currentMonth = m;
    },
    nextMonth() {
      const m = new Date(this.currentMonth);
      m.setMonth(m.getMonth() + 1);
      this.currentMonth = m;
    },
    selectDate(d) {
      this.selectedDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    },

    // Data
    async fetchSchedules() {
      try {
        this.schedules = await getSchedules();
      } catch (e) {
        console.error('Failed to load schedules', e);
      }
    },
    rebuildDayDoses() {
      const isoDate = this.toISODate(this.selectedDate);
      const list = [];
      this.schedules.forEach(s => {
        if (!s?.dailyTimes || !this.isActiveOnDate(s, this.selectedDate)) return;
        s.dailyTimes.forEach(t => {
          const key = this.doseKey(s._id, t, isoDate);
          const taken = !!this.takenDoses[key]?.taken;
          list.push({
            scheduleId: s._id,
            medicine: s.medicine,
            dosageAmount: s.dosageAmount,
            unit: s.unit,
            time: t,
            date: isoDate,
            taken,
            takenAt: this.takenDoses[key]?.takenAt || null
          });
        });
      });
      this.dayDoses = list.sort((a, b) => a.time.localeCompare(b.time));
    },

    // Status storage (localStorage fallback; wire to backend doses API when available)
    loadTakenDosesLocal() {
      try {
        const stored = localStorage.getItem('medicine_taken_doses');
        this.takenDoses = stored ? JSON.parse(stored) : {};
      } catch {
        this.takenDoses = {};
      }
    },
    saveTakenDosesLocal() {
      try {
        localStorage.setItem('medicine_taken_doses', JSON.stringify(this.takenDoses));
      } catch (e) {
        console.warn('Failed to save taken doses to localStorage', e);
      }
    },
    async markAsTaken(dose) {
      const key = this.doseKey(dose.scheduleId, dose.time, dose.date);
      const nowIso = new Date().toISOString();
      // TODO: Replace with backend call when /api/doses is available
      this.takenDoses[key] = { taken: true, takenAt: nowIso, scheduleId: dose.scheduleId, time: dose.time, date: dose.date };
      this.saveTakenDosesLocal();
      this.rebuildDayDoses();
    },
    async undoTaken(dose) {
      const key = this.doseKey(dose.scheduleId, dose.time, dose.date);
      // TODO: Replace with backend call when /api/doses is available
      delete this.takenDoses[key];
      this.saveTakenDosesLocal();
      this.rebuildDayDoses();
    },

    // Helpers
    getDayCounts(dateObj) {
      const iso = this.toISODate(dateObj);
      let total = 0;
      let done = 0;
      this.schedules.forEach(s => {
        if (!s?.dailyTimes || !this.isActiveOnDate(s, dateObj)) return;
        total += s.dailyTimes.length;
        s.dailyTimes.forEach(t => {
          const key = this.doseKey(s._id, t, iso);
          if (this.takenDoses[key]?.taken) done++;
        });
      });
      return { total, done };
    },
    isActiveOnDate(schedule, dateObj) {
      const iso = this.toISODate(dateObj);
      const start = this.toISODate(new Date(schedule.startDate));
      const end = this.toISODate(new Date(schedule.endDate));
      const inRange = (!start || iso >= start) && (!end || iso <= end);
      if (!inRange) return false;
      if (Array.isArray(schedule.daysOfWeek) && schedule.daysOfWeek.length > 0) {
        return schedule.daysOfWeek.includes(dateObj.getDay());
      }
      return true;
    },
    toISODate(d) {
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().split('T')[0];
    },
    timeToDate(time, baseDate) {
      const [h, m] = time.split(':').map(Number);
      return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), h, m, 0, 0);
    },
    isSameDate(a, b) {
      return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    },
    formatLongDate(d) {
      return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    },
    formatTime(time) {
      if (!time) return '';
      if (time.includes('T')) return new Date(time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const [h, m] = time.split(':').map(Number);
      const hr = h % 12 || 12;
      const ampm = h >= 12 ? 'PM' : 'AM';
      return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
    },
    doseKey(scheduleId, time, date) {
      return `${scheduleId}_${time}_${date}`;
    },
    doseKeyForList(d) {
      return `${d.scheduleId}_${d.time}_${d.date}`;
    }
  }
};
</script>

<style scoped>
.calendar-page { display: grid; gap: 1rem; }
.calendar-header { display: flex; align-items: center; justify-content: center; gap: 1rem; }
.nav-btn { border: 1px solid #e5e7eb; background: white; border-radius: 8px; padding: 0.25rem 0.6rem; cursor: pointer; }
.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.weekday { text-align: center; font-weight: 600; color: #6b7280; padding: 6px 0; }
.day-cell { min-height: 64px; background: white; border: 1px solid #e5e7eb; border-radius: 10px; padding: 6px; text-align: left; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; cursor: pointer; }
.day-cell:hover { border-color: #c7cdd7; }
.other-month { opacity: 0.5; }
.today { outline: 2px solid #6366f1; }
.selected { border-color: #6366f1; background: #eef2ff; }
.date-num { font-weight: 700; color: #374151; }
.dots { display: flex; gap: 3px; flex-wrap: wrap; }
.dot { width: 6px; height: 6px; background: #cbd5e1; border-radius: 999px; }
.dot.done { background: #10b981; }
.day-details { display: grid; gap: 0.75rem; }
.next-dose-card { border: 2px solid #10b981; background: #f0fdf4; border-radius: 12px; padding: 12px; }
.card { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; }
.card-title { font-weight: 700; color: #374151; margin-bottom: 8px; }
.list { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
.list.compact .muted { font-size: 12px; }
.row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.pill { font-weight: 600; color: #111827; }
.pill.done { color: #166534; }
.muted { color: #6b7280; }
.btn.small { padding: 6px 10px; border: none; border-radius: 8px; background: #10b981; color: white; cursor: pointer; }
.btn.small.ghost { background: #f3f4f6; color: #374151; }
@media (max-width: 768px) {
  .day-cell { min-height: 56px; }
}
</style>
