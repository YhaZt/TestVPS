<template>
  <div class="medicine-list">
    <div class="header">
      <h2>Medicines</h2>
      <button @click="showAddForm = true" class="btn-add">+ Add Medicine</button>
    </div>

    <!-- Add/Edit Form -->
    <div v-if="showAddForm || editingMedicine" class="modal">
      <div class="modal-content">
        <h3>{{ editingMedicine ? 'Edit Medicine' : 'Add New Medicine' }}</h3>
        <form @submit.prevent="saveMedicine">
          <div class="form-group">
            <label>Medicine Name *</label>
            <input v-model="form.name" required />
          </div>

          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input v-model="form.requiresFood" type="checkbox" />
              <span>Requires Food</span>
            </label>
          </div>

          <div class="form-group">
            <label>Must Avoid</label>
            <textarea v-model="form.mustAvoid" rows="2" placeholder="Foods, drinks, or activities to avoid with this medicine"></textarea>
          </div>

          <div class="form-group">
            <label>Notes</label>
            <textarea v-model="form.notes" rows="3" placeholder="Additional instructions or information"></textarea>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-primary">Save Medicine</button>
            <button type="button" @click="cancelForm" class="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Medicine Cards -->
    <div class="medicine-grid">
      <div v-for="medicine in medicines" :key="medicine._id" class="medicine-card">
        <div class="card-header">
          <h3>{{ medicine.name }}</h3>
          <div class="card-actions">
            <button @click="editMedicine(medicine)" class="btn-icon">✏️</button>
            <button @click="deleteMedicineConfirm(medicine._id)" class="btn-icon">🗑️</button>
          </div>
        </div>
        <div class="card-body">
          <p v-if="medicine.requiresFood" class="food-required">🍽️ Requires Food</p>
          <p v-if="medicine.mustAvoid" class="avoid-text"><strong>⚠️ Avoid:</strong> {{ medicine.mustAvoid }}</p>
          <p v-if="medicine.notes" class="notes"><strong>📝 Notes:</strong> {{ medicine.notes }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getMedicines, createMedicine, updateMedicine, deleteMedicine } from '../services/api';

export default {
  name: 'MedicineList',
  data() {
    return {
      medicines: [],
      showAddForm: false,
      editingMedicine: null,
      form: this.getEmptyForm()
    };
  },
  mounted() {
    this.fetchMedicines();
  },
  methods: {
    getEmptyForm() {
      return {
        name: '',
        requiresFood: false,
        mustAvoid: '',
        notes: ''
      };
    },
    async fetchMedicines() {
       try {
    const response = await getMedicines();
    // Change this line from:
    // this.medicines = response.data;
    // To:
    this.medicines = response; // API wrapper already returns the data array
  } catch (error) {
    alert('Error fetching medicines: ' + error.message);
  }
},
    editMedicine(medicine) {
      this.editingMedicine = medicine;
      this.form = { ...medicine };
    },
    async saveMedicine() {
      try {
        if (this.editingMedicine) {
          await updateMedicine(this.editingMedicine._id, this.form);
        } else {
          await createMedicine(this.form);
        }
        this.cancelForm();
        this.fetchMedicines();
        alert('Medicine saved successfully!');
      } catch (error) {
        alert('Error saving medicine: ' + error.message);
      }
    },
    async deleteMedicineConfirm(id) {
      if (confirm('Are you sure you want to delete this medicine?')) {
        try {
          await deleteMedicine(id);
          this.fetchMedicines();
        } catch (error) {
          alert('Error deleting medicine: ' + error.message);
        }
      }
    },
    cancelForm() {
      this.showAddForm = false;
      this.editingMedicine = null;
      this.form = this.getEmptyForm();
    }
  }
};
</script>

<style scoped>
.medicine-list {
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

.medicine-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.medicine-card {
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 1.5rem;
  transition: transform 0.2s;
}

.medicine-card:hover {
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
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
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
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
}

.form-group textarea {
  resize: vertical;
}

/* Fixed Checkbox Styling */
.checkbox-group {
  margin-bottom: 1.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  margin-bottom: 0 !important;
  font-weight: 600;
  color: #333;
}

.checkbox-label input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
  margin: 0;
  flex-shrink: 0;
}

.checkbox-label span {
  font-weight: 600;
  color: #333;
  user-select: none;
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

.btn-secondary {
  padding: 0.75rem 1.5rem;
  background: #f0f0f0;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}
</style>
