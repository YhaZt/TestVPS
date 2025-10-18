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

        <!-- Show medicine times for this day -->
        <div class="day-schedule">
          <div
            v-for="dose in getDayDoses(day.date).slice(0, 3)"
            :key="`${dose.scheduleId}_${dose.time}`"
            class="dose-time-pill"
            :class="{ taken: dose.taken }"
            @click.stop="openDoseModal(dose, day.date)"
          >
            {{ formatTimeShort(dose.time) }}
          </div>
          <div
            v-if="getDayDoses(day.date).length > 3"
            class="more-indicator"
            @click.stop="selectDate(day.date)"
          >
            +{{ getDayDoses(day.date).length - 3 }}
          </div>
        </div>
      </button>
    </div>

    <!-- Selected day schedule -->
    <section class="day-details">
      <h3>📅 {{ formatLongDate(selectedDate) }}</h3>

      <!-- Next dose pinned on top -->
      <div v-if="nextDose" class="next-dose-card">
        <div class="card-header">
          <span class="next-badge">🔥 Next Dose</span>
        </div>
        <div class="dose-row">
          <div class="dose-info">
            <div class="medicine-name">{{ nextDose.medicine?.name || 'Medicine' }}</div>
            <div class="dose-details">
              <strong>{{ formatTime(nextDose.time) }}</strong>
              <span> • {{ nextDose.dosageAmount }} {{ nextDose.unit }}</span>
            </div>
          </div>
          <button
            class="btn-primary"
            @click="markAsTaken(nextDose)"
            v-if="!nextDose.taken"
            :disabled="isMarking"
          >
            {{ isMarking ? '⏳' : '✓ Mark Done' }}
          </button>
        </div>
      </div>

      <!-- Upcoming (not taken) -->
      <div class="schedule-card">
        <div class="card-title">⏰ Upcoming ({{ upcomingDoses.length }})</div>
        <div v-if="upcomingDoses.length === 0" class="empty-state">
          <span>🎉 All doses completed for today!</span>
        </div>
        <div class="dose-list">
          <div v-for="dose in upcomingDoses" :key="doseKeyForList(dose)" class="dose-row clickable" @click="openDoseModal(dose, selectedDate)">
            <div class="dose-info">
              <div class="medicine-name">{{ dose.medicine?.name || 'Medicine' }}</div>
              <div class="dose-details">
                {{ formatTime(dose.time) }} • {{ dose.dosageAmount }} {{ dose.unit }}
              </div>
            </div>
            <button
              class="btn-secondary"
              @click.stop="markAsTaken(dose)"
              :disabled="isMarking"
            >
              {{ isMarking ? '⏳' : '✓ Done' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Completed minimized below -->
      <details class="schedule-card completed-section">
        <summary class="card-title">
          ✅ Completed ({{ completedDoses.length }})
        </summary>
        <div class="dose-list compact">
          <div v-for="dose in completedDoses" :key="doseKeyForList(dose)" class="dose-row completed clickable" @click="openDoseModal(dose, selectedDate)">
            <div class="dose-info">
              <div class="medicine-name completed">✓ {{ dose.medicine?.name || 'Medicine' }}</div>
              <div class="dose-details">
                {{ formatTime(dose.time) }} • taken at {{ formatTime(dose.takenAt) }}
              </div>
            </div>
            <button
              class="btn-undo"
              @click.stop="undoTaken(dose)"
              :disabled="isMarking"
            >
              ↶ Undo
            </button>
          </div>
        </div>
      </details>
    </section>

    <!-- Dose Detail Modal -->
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>💊 {{ selectedDose?.medicine?.name || 'Medicine Details' }}</h3>
          <button class="modal-close" @click="closeModal">×</button>
        </div>

        <div class="modal-body" v-if="selectedDose">
          <div class="detail-section">
            <h4>📅 Schedule Information</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">Time:</span>
                <span class="value">{{ formatTime(selectedDose.time) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Dosage:</span>
                <span class="value">{{ selectedDose.dosageAmount }} {{ selectedDose.unit }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Date:</span>
                <span class="value">{{ formatLongDate(modalDate) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Status:</span>
                <span class="value" :class="{ taken: selectedDose.taken }">
                  {{ selectedDose.taken ? '✅ Taken' : '⏰ Pending' }}
                </span>
              </div>
            </div>
          </div>

          <div v-if="selectedDose.taken" class="detail-section">
            <h4>✅ Completion Details</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">Taken at:</span>
                <span class="value">{{ formatTime(selectedDose.takenAt) }}</span>
              </div>
            </div>
          </div>

          <div v-if="selectedDose.medicine" class="detail-section">
            <h4>💊 Medicine Information</h4>
            <div class="detail-grid">
              <div class="detail-item" v-if="selectedDose.medicine.description">
                <span class="label">Description:</span>
                <span class="value">{{ selectedDose.medicine.description }}</span>
              </div>
              <div class="detail-item" v-if="selectedDose.medicine.requiresFood">
                <span class="label">Instructions:</span>
                <span class="value food-requirement">🍽️ Take with food</span>
              </div>
              <div class="detail-item" v-if="selectedDose.medicine.mustAvoid">
                <span class="label">Avoid:</span>
                <span class="value warning">⚠️ {{ selectedDose.medicine.mustAvoid }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button v-if="!selectedDose?.taken" class="btn-modal-primary" @click="markAsTakenFromModal">
            ✓ Mark as Taken
          </button>
          <button v-else class="btn-modal-secondary" @click="undoTakenFromModal">
            ↶ Undo Taken
          </button>
          <button class="btn-modal-cancel" @click="closeModal">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getSchedules } from '../services/api';

export default {
  name: 'CalendarView',
  emits: ['dose-taken'],
  data() {
    const today = new Date();
    return {
      schedules: [],
      currentMonth: new Date(today.getFullYear(), today.getMonth(), 1),
      selectedDate: today,
      dayDoses: [],
      takenDoses: {},
      isMarking: false,
      showModal: false,
      selectedDose: null,
      modalDate: null
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

      const afterNow = sorted.find(d => this.timeToDate(d.time, this.selectedDate) >= now);
      return afterNow || sorted[0];
    },
    upcomingDoses() {
      const list = this.dayDoses.filter(d => !d.taken)
        .sort((a, b) => a.time.localeCompare(b.time));

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
    // Month navigation
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

    // Modal methods
    openDoseModal(dose, date) {
      this.selectedDose = { ...dose };
      this.modalDate = new Date(date);
      this.showModal = true;
    },
    closeModal() {
      this.showModal = false;
      this.selectedDose = null;
      this.modalDate = null;
    },
    async markAsTakenFromModal() {
      if (this.selectedDose) {
        await this.markAsTaken(this.selectedDose);
        this.closeModal();
      }
    },
    async undoTakenFromModal() {
      if (this.selectedDose) {
        await this.undoTaken(this.selectedDose);
        this.closeModal();
      }
    },

    // Get doses for a specific day (for calendar grid)
    getDayDoses(dateObj) {
      const isoDate = this.toISODate(dateObj);
      const list = [];

      this.schedules.forEach(s => {
        if (!s?.dailyTimes || !this.isActiveOnDate(s, dateObj)) return;

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

      return list.sort((a, b) => a.time.localeCompare(b.time));
    },

    // Data management
    async fetchSchedules() {
      try {
        this.schedules = await getSchedules();
      } catch (e) {
        console.error('Failed to load schedules', e);
      }
    },
    rebuildDayDoses() {
      this.dayDoses = this.getDayDoses(this.selectedDate);
    },

    // Dose management
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
        console.error('Error saving to localStorage:', e);
      }
    },
    async markAsTaken(dose) {
      if (this.isMarking) return;

      this.isMarking = true;
      try {
        const key = this.doseKey(dose.scheduleId, dose.time, dose.date);
        const nowIso = new Date().toISOString();

        this.takenDoses[key] = {
          taken: true,
          takenAt: nowIso,
          scheduleId: dose.scheduleId,
          time: dose.time,
          date: dose.date
        };

        this.saveTakenDosesLocal();
        this.rebuildDayDoses();
        this.$emit('dose-taken');

        this.showToast(`✓ ${dose.medicine?.name} marked as taken!`);
      } catch (error) {
        console.error('Error marking dose:', error);
        this.showToast('Error marking dose', 'error');
      } finally {
        this.isMarking = false;
      }
    },
    async undoTaken(dose) {
      if (this.isMarking) return;

      this.isMarking = true;
      try {
        const key = this.doseKey(dose.scheduleId, dose.time, dose.date);

        delete this.takenDoses[key];

        this.saveTakenDosesLocal();
        this.rebuildDayDoses();
        this.$emit('dose-taken');

        this.showToast(`Dose unmarked for ${dose.medicine?.name}`);
      } catch (error) {
        console.error('Error undoing dose:', error);
        this.showToast('Error undoing dose', 'error');
      } finally {
        this.isMarking = false;
      }
    },

    // Helper methods
    isActiveOnDate(schedule, dateObj) {
      const iso = this.toISODate(dateObj);
      const start = schedule.startDate ? this.toISODate(new Date(schedule.startDate)) : null;
      const end = schedule.endDate ? this.toISODate(new Date(schedule.endDate)) : null;

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
      return a.getFullYear() === b.getFullYear() &&
             a.getMonth() === b.getMonth() &&
             a.getDate() === b.getDate();
    },
    formatLongDate(d) {
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    },
    formatTime(time) {
      if (!time) return '';

      if (time.includes('T')) {
        return new Date(time).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }

      const [h, m] = time.split(':').map(Number);
      const hr = h % 12 || 12;
      const ampm = h >= 12 ? 'PM' : 'AM';
      return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
    },
    formatTimeShort(time) {
      if (!time) return '';

      const [h] = time.split(':').map(Number);
      const hr = h % 12 || 12;
      const ampm = h >= 12 ? 'PM' : 'AM';
      return `${hr}${ampm}`;
    },
    doseKey(scheduleId, time, date) {
      return `${scheduleId}_${time}_${date}`;
    },
    doseKeyForList(d) {
      return `${d.scheduleId}_${d.time}_${d.date}`;
    },
    showToast(message, type = 'success') {
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
        animation: slideIn 0.3s ease;
      `;

      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => document.body.removeChild(toast), 300);
      }, 3000);
    }
  }
};
</script>

<style scoped>
/* ... keep existing styles and add these new ones ... */

.day-schedule {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 4px;
}

.dose-time-pill {
  background: #6366f1;
  color: white;
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 10px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.dose-time-pill:hover {
  background: #5855eb;
  transform: scale(1.05);
}

.dose-time-pill.taken {
  background: #10b981;
}

.more-indicator {
  background: #f59e0b;
  color: white;
  font-size: 9px;
  padding: 1px 3px;
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
}

.clickable {
  cursor: pointer;
  transition: background 0.2s;
}

.clickable:hover {
  background: #f1f5f9;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  padding: 0.25rem;
  line-height: 1;
}

.modal-close:hover {
  color: #374151;
}

.modal-body {
  padding: 1.5rem;
}

.detail-section {
  margin-bottom: 1.5rem;
}

.detail-section h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.75rem;
}

.detail-grid {
  display: grid;
  gap: 0.75rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: #f9fafb;
  border-radius: 6px;
}

.label {
  font-weight: 500;
  color: #6b7280;
}

.value {
  font-weight: 600;
  color: #1f2937;
}

.value.taken {
  color: #10b981;
}

.value.food-requirement {
  color: #f59e0b;
}

.value.warning {
  color: #dc2626;
}

.modal-footer {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
  border-radius: 0 0 12px 12px;
}

.btn-modal-primary {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-modal-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.btn-modal-secondary {
  background: #f59e0b;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-modal-secondary:hover {
  background: #d97706;
}

.btn-modal-cancel {
  background: #6b7280;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-modal-cancel:hover {
  background: #555b6e;
}

/* Mobile modal */
@media (max-width: 768px) {
  .modal-content {
    max-width: 100%;
    margin: 0;
    border-radius: 12px 12px 0 0;
    max-height: 95vh;
  }

  .modal-footer {
    flex-direction: column;
  }

  .btn-modal-primary,
  .btn-modal-secondary,
  .btn-modal-cancel {
    width: 100%;
  }
}

/* ... rest of existing styles ... */
.calendar-page {
  display: grid;
  gap: 1.5rem;
  max-width: 1000px;
  margin: 0 auto;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  background: white;
  padding: 1rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.calendar-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
  min-width: 200px;
  text-align: center;
}

.nav-btn {
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  font-size: 1.25rem;
  font-weight: 700;
  color: #6366f1;
  transition: all 0.2s;
}

.nav-btn:hover {
  background: #f8fafc;
  border-color: #6366f1;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  background: white;
  padding: 1rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.weekday {
  text-align: center;
  font-weight: 600;
  color: #6b7280;
  padding: 8px 0;
  font-size: 0.875rem;
}

.day-cell {
  min-height: 80px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 8px;
  text-align: left;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: all 0.2s;
}

.day-cell:hover {
  border-color: #6366f1;
  background: #f8fafc;
}

.other-month {
  opacity: 0.4;
  background: #f3f4f6;
}

.today {
  border: 2px solid #10b981;
  background: #f0fdf4;
}

.selected {
  border: 2px solid #6366f1;
  background: #eef2ff;
}

.date-num {
  font-weight: 700;
  color: #374151;
  font-size: 0.875rem;
  margin-bottom: 4px;
}

.day-details {
  display: grid;
  gap: 1rem;
}

.day-details h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
  text-align: center;
}

.next-dose-card {
  border: 2px solid #10b981;
  background: linear-gradient(135deg, #f0fdf4, #dcfce7);
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
}

.card-header {
  margin-bottom: 0.75rem;
}

.next-badge {
  background: #10b981;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.schedule-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.completed-section {
  border-color: #d1d5db;
}

.completed-section[open] {
  background: #f9fafb;
}

.card-title {
  font-weight: 700;
  color: #374151;
  margin-bottom: 0.75rem;
  font-size: 1rem;
  cursor: pointer;
}

.empty-state {
  text-align: center;
  color: #6b7280;
  font-style: italic;
  padding: 1rem;
}

.dose-list {
  display: grid;
  gap: 0.75rem;
}

.dose-list.compact {
  gap: 0.5rem;
}

.dose-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 8px;
  transition: all 0.2s;
}

.dose-row:hover {
  background: #f1f5f9;
}

.dose-row.completed {
  opacity: 0.8;
  background: #f0fdf4;
}

.dose-info {
  flex: 1;
  min-width: 0;
}

.medicine-name {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.25rem;
}

.medicine-name.completed {
  color: #166534;
}

.dose-details {
  color: #6b7280;
  font-size: 0.875rem;
}

.btn-primary {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.btn-secondary {
  background: #6366f1;
  color: white;
  border: none;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;
  white-space: nowrap;
}

.btn-secondary:hover:not(:disabled) {
  background: #5855eb;
}

.btn-undo {
  background: #f59e0b;
  color: white;
  border: none;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-undo:hover:not(:disabled) {
  background: #d97706;
}

.btn-primary:disabled,
.btn-secondary:disabled,
.btn-undo:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .calendar-page {
    gap: 1rem;
  }

  .calendar-header {
    padding: 0.75rem;
    gap: 1rem;
  }

  .calendar-header h2 {
    font-size: 1.25rem;
    min-width: auto;
  }

  .calendar-grid {
    padding: 0.75rem;
    gap: 4px;
  }

  .day-cell {
    min-height: 70px;
    padding: 6px;
  }

  .dose-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.75rem;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
    justify-self: stretch;
  }

  .schedule-card {
    padding: 0.75rem;
  }
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
</style>
