<template>
  <div class="schedule-list">
    <div class="header">
      <h2>📅 Active Schedules</h2>
      <button @click="showAddForm = true" class="btn-add">+ Create Schedule</button>
    </div>

    <!-- Schedule Management Section -->
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
      showAddForm: false,
      editingSchedule: null,
      form: this.getEmptyForm(),
      calculatedEndDate: '',
      selectedMedicine: null
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
    this.fetchSchedules();
    this.fetchMedicines();
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

    async fetchSchedules() {
      try {
        const response = await getSchedules();
        this.schedules = response;
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
</style>
