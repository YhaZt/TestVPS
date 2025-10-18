<template>
  <div class="schedule-list">
    <div class="header">
      <h2>📅 Active Schedules</h2>
      <button @click="showAddForm = true" class="btn-add">+ Create Schedule</button>
    </div>

    <!-- Today's Doses Section -->
    <div class="todays-doses">
      <h3>🕐 Today's Doses</h3>
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
              <span class="taken-time">Taken at {{ dose.takenAt ? formatTime(dose.takenAt) : 'Unknown' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Form -->
    <div v-if="showAddForm || editingSchedule" class="modal">
      <div class="modal-content">
        <h3>{{ editingSchedule ? 'Edit Schedule' : 'Create New Schedule' }}</h3>
        <form @submit.prevent="saveSchedule">

          <!-- Medicine Selection -->
          <div class="form-group">
            <label>Select Medicine *</label>
            <select v-model="form.medicine" required @change="onMedicineSelect">
              <option value="">Choose a medicine...</option>
              <option v-for="medicine in medicines" :key="medicine._id" :value="medicine._id">
                {{ medicine.name }}
              </option>
            </select>
          </div>

          <!-- Medicine Details Section -->
          <div v-if="selectedMedicine" class="medicine-details">
            <h4>🏷️ Medicine Information</h4>
            <p><strong>Name:</strong> {{ selectedMedicine.name }}</p>
            <p v-if="selectedMedicine.requiresFood" class="food-required">🍽️ Requires Food</p>
            <p v-if="selectedMedicine.mustAvoid" class="avoid-text"><strong>⚠️ Avoid:</strong> {{ selectedMedicine.mustAvoid }}</p>
            <p v-if="selectedMedicine.notes" class="notes"><strong>📝 Notes:</strong> {{ selectedMedicine.notes }}</p>
          </div>

          <!-- Dosage Information -->
          <div class="dosage-section">
            <h4>💊 Dosage Information</h4>

            <div class="form-row">
              <div class="form-group">
                <label>Dosage Amount *</label>
                <input v-model.number="form.dosageAmount" type="number" min="0.1" step="0.1" required />
              </div>
              <div class="form-group">
                <label>Unit *</label>
                <select v-model="form.unit" required>
                  <option value="ml">ml</option>
                  <option value="pcs">pcs</option>
                  <option value="mg">mg</option>
                  <option value="g">g</option>
                  <option value="tablets">tablets</option>
                  <option value="capsules">capsules</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label>Frequency Per Day *</label>
              <input v-model.number="form.frequencyPerDay" type="number" min="1" max="6" required />
            </div>
          </div>

          <!-- Schedule Information -->
          <div class="schedule-section">
            <h4>📅 Schedule Information</h4>

            <div class="form-row">
              <div class="form-group">
                <label>Start Date *</label>
                <input v-model="form.startDate" type="date" required @change="calculateEndDate" />
              </div>
              <div class="form-group">
                <label>Target Days *</label>
                <input v-model.number="form.targetDays" type="number" min="1" required @input="calculateEndDate" />
              </div>
            </div>

            <div class="form-group">
              <label>Expected End Date (Auto Calculated)</label>
              <input :value="calculatedEndDate" type="date" disabled class="calculated-field" />
            </div>

            <div class="form-group">
              <label>Daily Times * ({{ form.frequencyPerDay }} times needed)</label>
              <div v-for="(time, index) in form.dailyTimes" :key="index" class="time-input">
                <input v-model="form.dailyTimes[index]" type="time" required />
                <button type="button" @click="removeTime(index)" class="remove-btn">✕</button>
              </div>
              <button
                type="button"
                @click="addTime"
                class="btn-secondary"
                :disabled="form.dailyTimes.length >= form.frequencyPerDay"
              >
                + Add Time
              </button>
              <small class="help-text">
                {{ form.dailyTimes.length }}/{{ form.frequencyPerDay }} times added
              </small>
            </div>
          </div>

          <!-- Treatment Summary -->
          <div class="treatment-summary">
            <h4>📋 Treatment Summary</h4>
            <div class="summary-content">
              <p><strong>Medicine:</strong> {{ selectedMedicine?.name || 'Not selected' }}</p>
              <p><strong>Dosage:</strong> {{ form.dosageAmount }} {{ form.unit }}</p>
              <p><strong>Frequency:</strong> {{ form.frequencyPerDay }}x per day</p>
              <p><strong>Duration:</strong> {{ form.targetDays }} days</p>
              <p><strong>Total Doses:</strong> {{ form.targetDays * form.frequencyPerDay }} doses</p>
              <p><strong>Times:</strong> {{ form.dailyTimes.length ? form.dailyTimes.join(', ') : 'No times set' }}</p>
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-primary" :disabled="!isFormValid">Save Schedule</button>
            <button type="button" @click="cancelForm" class="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Schedule Cards -->
    <div class="schedule-grid">
      <div v-for="schedule in schedules" :key="schedule._id" class="schedule-card">
        <div class="card-header">
          <h3>{{ schedule.medicine?.name || 'Unknown Medicine' }}</h3>
          <div class="card-actions">
            <button @click="editSchedule(schedule)" class="btn-icon">✏️</button>
            <button @click="deleteScheduleConfirm(schedule._id)" class="btn-icon">🗑️</button>
          </div>
        </div>
        <div class="card-body">
          <p><strong>💊 Dosage:</strong> {{ schedule.dosageAmount }} {{ schedule.unit }}</p>
          <p><strong>🔄 Frequency:</strong> {{ schedule.frequencyPerDay }}x per day</p>
          <p><strong>📅 Duration:</strong> {{ schedule.targetDays }} days</p>
          <p><strong>🕐 Times:</strong> {{ schedule.dailyTimes?.join(', ') || 'No times set' }}</p>
          <p><strong>📆 Period:</strong> {{ formatDate(schedule.startDate) }} - {{ formatDate(schedule.endDate) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getSchedules, createSchedule, updateSchedule, deleteSchedule, getMedicines } from '../services/api';

export default {
  name: 'ScheduleList',
  data() {
    return {
      schedules: [],
      medicines: [],
      todaysDoses: [],
      showAddForm: false,
      editingSchedule: null,
      form: this.getEmptyForm(),
      calculatedEndDate: '',
      selectedMedicine: null,
      currentTime: new Date(),
      timeUpdateInterval: null,
      notificationPermission: 'default',
      takenDoses: {} // Store taken doses locally
    };
  },
  computed: {
    isFormValid() {
      return this.form.medicine &&
             this.form.dosageAmount > 0 &&
             this.form.unit &&
             this.form.frequencyPerDay > 0 &&
             this.form.startDate &&
             this.form.targetDays > 0 &&
             this.form.dailyTimes.length === this.form.frequencyPerDay;
    }
  },
  mounted() {
    this.loadTakenDoses();
    this.fetchSchedules();
    this.fetchMedicines();
    this.requestNotificationPermission();
    this.startTimeUpdater();
    this.setupNotificationScheduler();
  },
  beforeUnmount() {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }
  },
  methods: {
    getEmptyForm() {
      return {
        medicine: '',
        dosageAmount: 1,
        unit: 'pcs',
        frequencyPerDay: 1,
        startDate: new Date().toISOString().split('T')[0],
        targetDays: 7,
        endDate: '',
        dailyTimes: ['09:00']
      };
    },

    // Local Storage Methods for Dose Tracking
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

    markDoseAsTaken(scheduleId, time, date, takenAt) {
      const key = this.getDoseKey(scheduleId, time, date);
      this.takenDoses[key] = {
        taken: true,
        takenAt: takenAt || new Date().toISOString(),
        scheduleId,
        time,
        date
      };
      this.saveTakenDoses();
    },

    isDoseTaken(scheduleId, time, date) {
      const key = this.getDoseKey(scheduleId, time, date);
      return this.takenDoses[key]?.taken || false;
    },

    getDoseTakenTime(scheduleId, time, date) {
      const key = this.getDoseKey(scheduleId, time, date);
      return this.takenDoses[key]?.takenAt || null;
    },

    async fetchSchedules() {
      try {
        const response = await getSchedules();
        this.schedules = response;
        this.generateTodaysDoses();
      } catch (error) {
        alert('Error fetching schedules: ' + error.message);
      }
    },

    async fetchMedicines() {
      try {
        const response = await getMedicines();
        this.medicines = response;
      } catch (error) {
        alert('Error fetching medicines: ' + error.message);
      }
    },

    onMedicineSelect() {
      this.selectedMedicine = this.medicines.find(m => m._id === this.form.medicine);
    },

    calculateEndDate() {
      if (this.form.startDate && this.form.targetDays) {
        const startDate = new Date(this.form.startDate);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + this.form.targetDays - 1);

        this.calculatedEndDate = endDate.toISOString().split('T')[0];
        this.form.endDate = this.calculatedEndDate;
      }
    },

    addTime() {
      if (this.form.dailyTimes.length < this.form.frequencyPerDay) {
        this.form.dailyTimes.push('09:00');
      }
    },

    removeTime(index) {
      this.form.dailyTimes.splice(index, 1);
    },

    editSchedule(schedule) {
      this.editingSchedule = schedule;
      this.form = {
        ...schedule,
        medicine: schedule.medicine._id || schedule.medicine
      };
      this.onMedicineSelect();
      this.calculateEndDate();
    },

    async saveSchedule() {
      try {
        const scheduleData = {
          ...this.form,
          durationInDays: this.form.targetDays
        };

        if (this.editingSchedule) {
          await updateSchedule(this.editingSchedule._id, scheduleData);
        } else {
          await createSchedule(scheduleData);
        }

        this.cancelForm();
        this.fetchSchedules();
        alert('Schedule saved successfully!');
      } catch (error) {
        alert('Error saving schedule: ' + error.message);
      }
    },

    async deleteScheduleConfirm(id) {
      if (confirm('Are you sure you want to delete this schedule?')) {
        try {
          await deleteSchedule(id);
          this.fetchSchedules();
        } catch (error) {
          alert('Error deleting schedule: ' + error.message);
        }
      }
    },

    cancelForm() {
      this.showAddForm = false;
      this.editingSchedule = null;
      this.form = this.getEmptyForm();
      this.calculatedEndDate = '';
      this.selectedMedicine = null;
    },

    formatDate(date) {
      return new Date(date).toLocaleDateString();
    },

    generateTodaysDoses() {
      const today = new Date().toISOString().split('T')[0];
      this.todaysDoses = [];

      this.schedules.forEach(schedule => {
        if (schedule.dailyTimes && this.isScheduleActiveToday(schedule, today)) {
          schedule.dailyTimes.forEach(time => {
            this.todaysDoses.push({
              scheduleId: schedule._id,
              time: time,
              medicine: schedule.medicine,
              dosageAmount: schedule.dosageAmount,
              unit: schedule.unit,
              taken: this.isDoseTaken(schedule._id, time, today),
              takenAt: this.getDoseTakenTime(schedule._id, time, today)
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
      if (time.includes(':')) {
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
      }
      return new Date(time).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    },

    async markAsTaken(dose) {
      try {
        this.playNotificationSound();

        const today = new Date().toISOString().split('T')[0];
        const takenAt = new Date().toISOString();

        // Mark dose as taken in local storage
        this.markDoseAsTaken(dose.scheduleId, dose.time, today, takenAt);

        // Update local state immediately
        dose.taken = true;
        dose.takenAt = takenAt;

        // Show success notification
        this.showNotification('Dose Taken', `${dose.medicine?.name} marked as taken`, 'success');

        // Update stats by regenerating doses
        this.generateTodaysDoses();

      } catch (error) {
        console.error('Error marking dose as taken:', error);
        alert('Error marking dose as taken');
      }
    },

    startTimeUpdater() {
      this.timeUpdateInterval = setInterval(() => {
        this.currentTime = new Date();
        this.checkForDueNotifications();
      }, 60000); // Update every minute
    },

    async requestNotificationPermission() {
      if ('Notification' in window) {
        this.notificationPermission = await Notification.requestPermission();
      }
    },

    setupNotificationScheduler() {
      // Check for upcoming doses every minute
      setInterval(() => {
        this.checkForUpcomingDoses();
      }, 60000);
    },

    checkForDueNotifications() {
      // Check if any doses became ready and need notifications
      this.todaysDoses.forEach(dose => {
        if (!dose.taken && this.isDoseReady(dose.time)) {
          const now = new Date();
          const [hours, minutes] = dose.time.split(':').map(Number);
          const doseDateTime = new Date();
          doseDateTime.setHours(hours, minutes, 0, 0);

          // Check if it's within 1 minute of dose time
          const timeDiff = Math.abs(now - doseDateTime);
          if (timeDiff < 60000) { // Within 1 minute
            this.sendDoseNotification(dose);
          }
        }
      });
    },

    checkForUpcomingDoses() {
      this.checkForDueNotifications();
    },

    sendDoseNotification(dose) {
      // Play sound
      this.playNotificationSound();

      // Show browser notification
      if (this.notificationPermission === 'granted') {
        const notification = new Notification('💊 Time for your medicine!', {
          body: `${dose.medicine?.name} - ${dose.dosageAmount} ${dose.unit}`,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: `dose-${dose.scheduleId}-${dose.time}`,
          requireInteraction: true
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }

      // Show in-app notification
      this.showNotification(
        '💊 Medicine Time!',
        `Time to take ${dose.medicine?.name}`,
        'warning'
      );
    },

    playNotificationSound() {
      try {
        // Create a more pleasant notification sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      } catch (error) {
        console.log('Could not play notification sound:', error);
      }
    },

    showNotification(title, message, type = 'info') {
      // Simple console log for now - you can implement toast notifications
      console.log(`${type.toUpperCase()}: ${title} - ${message}`);

      // Show different types of notifications
      if (type === 'warning') {
        // More prominent notification for medicine time
        if (confirm(`${title}\n${message}\n\nWould you like to mark it as taken?`)) {
          // Find the dose and mark it
          const dose = this.todaysDoses.find(d =>
            d.medicine?.name === message.split('Time to take ')[1] &&
            !d.taken &&
            this.isDoseReady(d.time)
          );
          if (dose) {
            this.markAsTaken(dose);
          }
        }
      } else if (type === 'success') {
        // Success notification can be less intrusive
        setTimeout(() => {
          console.log('Success notification cleared');
        }, 3000);
      }
    }
  },

  watch: {
    'form.frequencyPerDay'() {
      // Adjust daily times array when frequency changes
      while (this.form.dailyTimes.length > this.form.frequencyPerDay) {
        this.form.dailyTimes.pop();
      }
      while (this.form.dailyTimes.length < this.form.frequencyPerDay) {
        this.form.dailyTimes.push('09:00');
      }
    },

    // Watch for schedule changes to regenerate doses
    schedules: {
      handler() {
        this.generateTodaysDoses();
      },
      deep: true
    }
  }
};
</script>

<style scoped>
.schedule-list {
  background: white;
  border-radius: 12px;
  padding: 2rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.btn-add {
  padding: 0.75rem 1.5rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.schedule-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.schedule-card {
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 1.5rem;
  transition: transform 0.2s;
}

.schedule-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 20px rgba(0,0,0,0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #f0f0f0;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-icon {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.25rem;
}

.card-body p {
  margin: 0.5rem 0;
}

.medicine-info {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
}

.food-required {
  color: #ff8c00;
  font-weight: 600;
}

.avoid-text {
  color: #dc3545;
}

.notes {
  color: #666;
  font-style: italic;
}

/* Modal Styles */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  max-width: 700px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #333;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
}

.calculated-field {
  background: #f8f9fa !important;
  color: #6c757d;
  cursor: not-allowed;
}

/* Medicine Details */
.medicine-details {
  background: #e3f2fd;
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
  border-left: 4px solid #2196f3;
}

.medicine-details h4 {
  margin-bottom: 0.5rem;
  color: #1976d2;
}

/* Dosage Section */
.dosage-section {
  background: #fff3e0;
  padding: 1.5rem;
  border-radius: 8px;
  margin: 1.5rem 0;
  border-left: 4px solid #ff9800;
}

.dosage-section h4 {
  margin-bottom: 1rem;
  color: #f57c00;
}

/* Schedule Section */
.schedule-section {
  background: #f3e5f5;
  padding: 1.5rem;
  border-radius: 8px;
  margin: 1.5rem 0;
  border-left: 4px solid #9c27b0;
}

.schedule-section h4 {
  margin-bottom: 1rem;
  color: #7b1fa2;
}

/* Treatment Summary */
.treatment-summary {
  background: #e8f5e9;
  padding: 1.5rem;
  border-radius: 8px;
  margin: 1.5rem 0;
  border-left: 4px solid #4caf50;
}

.treatment-summary h4 {
  margin-bottom: 1rem;
  color: #2e7d32;
}

.summary-content p {
  margin: 0.5rem 0;
  color: #1b5e20;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.time-input {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.time-input input {
  flex: 1;
}

.remove-btn {
  background: #ff4444;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
}

.help-text {
  color: #666;
  font-size: 0.85rem;
  margin-top: 0.5rem;
  display: block;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.btn-primary {
  flex: 1;
  padding: 0.75rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 0.75rem 1.5rem;
  background: #f0f0f0;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.btn-secondary:disabled {
  background: #e0e0e0;
  cursor: not-allowed;
}

/* Today's Doses Section */
.todays-doses {
  margin-bottom: 2rem;
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

/* Mobile responsive */
@media (max-width: 768px) {
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
