<template>
  <div class="medicines-container">
    <div class="header">
      <h2>Medicines</h2>
      <!-- <button @click="showAddModal = true" class="btn-primary">+ Add Medicine</button> -->
    </div>

    <div v-if="loading" class="loading">Loading medicines...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="medicines.length === 0" class="empty">No medicines added yet.</div>

    <div v-else class="medicines-grid">
      <div v-for="medicine in medicines" :key="medicine._id" class="medicine-card">
        <h3>{{ medicine.name }}</h3>
        <p v-if="medicine.requiresFood" class="requires-food">⚠️ Take with food</p>
        <p v-if="medicine.mustAvoid" class="must-avoid">🚫 Avoid: {{ medicine.mustAvoid }}</p>
        <p v-if="medicine.notes" class="notes">📝 {{ medicine.notes }}</p>

        <div class="actions">
          <!-- <button @click="editMedicine(medicine)" class="btn-edit">✏️</button>
          <button @click="deleteMedicine(medicine._id)" class="btn-delete">🗑️</button> -->
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal (your existing modal code) -->
  </div>
</template>

<script>
import { getMedicines, createMedicine, updateMedicine, deleteMedicine } from '@/services/api';

export default {
  name: 'MedicinesList',
  data() {
    return {
      medicines: [],
      loading: false,
      error: null,
      showAddModal: false,
      editingMedicine: null
    };
  },
  async mounted() {
    console.log('Medicines component mounted');
    console.log('API Base URL:', import.meta.env.VITE_API_URL);

    try {
      // Test direct axios call
      const response = await fetch('http://localhost:5000/api/medicines');
      const data = await response.json();
      console.log('Direct fetch result:', data);

      // Test our API wrapper
      const { getMedicines } = await import('@/services/api');
      const apiResult = await getMedicines();
      console.log('API wrapper result:', apiResult);

    } catch (error) {
      console.error('API test failed:', error);
    }

    await this.loadMedicines();
  },
  methods: {
    async loadMedicines() {
      this.loading = true;
      this.error = null;
      try {
        const data = await getMedicines();
        this.medicines = Array.isArray(data) ? data : [];
        console.log('Loaded medicines:', this.medicines.length);
      } catch (e) {
        console.error('Failed to load medicines:', e);
        this.error = 'Failed to load medicines';
        this.medicines = [];
      } finally {
        this.loading = false;
      }
    },
    async saveMedicine(medicineData) {
      try {
        if (this.editingMedicine) {
          await updateMedicine(this.editingMedicine._id, medicineData);
        } else {
          await createMedicine(medicineData);
        }
        await this.loadMedicines(); // reload list
        this.showAddModal = false;
        this.editingMedicine = null;
      } catch (e) {
        console.error('Save failed:', e);
        alert('Failed to save medicine');
      }
    },
    async deleteMedicine(id) {
      if (!confirm('Delete this medicine?')) return;
      try {
        await deleteMedicine(id);
        await this.loadMedicines();
      } catch (e) {
        console.error('Delete failed:', e);
        alert('Failed to delete medicine');
      }
    },
    editMedicine(medicine) {
      this.editingMedicine = medicine;
      this.showAddModal = true;
    }
  }
};
</script>

<style scoped>
.medicines-container { padding: 20px; }
.header { display: flex; justify-content: space-between; margin-bottom: 20px; }
.btn-primary { background: #6366f1; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; }
.loading, .error, .empty { text-align: center; padding: 40px; color: #666; }
.error { color: #ef4444; }
.medicines-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
.medicine-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.medicine-card h3 { margin: 0 0 10px 0; color: #1f2937; }
.requires-food, .must-avoid, .notes { margin: 8px 0; font-size: 14px; }
.requires-food { color: #f59e0b; }
.must-avoid { color: #ef4444; }
.notes { color: #6b7280; }
.actions { display: flex; gap: 10px; margin-top: 15px; }
.btn-edit, .btn-delete { background: none; border: none; font-size: 16px; cursor: pointer; padding: 5px; }
.btn-edit:hover { background: #f3f4f6; }
.btn-delete:hover { background: #fef2f2; }
</style>
