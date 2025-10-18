import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://api.scheduler.carpeldreams.me/',
  withCredentials: false
});

// Helper to unwrap { success, data } responses
const unwrap = promise => promise.then(res => res?.data?.data ?? res?.data);

// Medicines API
export const getMedicines = () => unwrap(api.get('/api/medicines'));
export const createMedicine = (payload) => unwrap(api.post('/api/medicines', payload));
export const updateMedicine = (id, payload) => unwrap(api.put(`/api/medicines/${id}`, payload));
export const deleteMedicine = (id) => unwrap(api.delete(`/api/medicines/${id}`));

// Schedules API
export const getSchedules = () => unwrap(api.get('/api/schedules'));
export const getTodaySchedules = () => unwrap(api.get('/api/schedules/today'));
export const getUpcomingDoses = (days = 7) => unwrap(api.get(`/api/schedules/upcoming?days=${days}`));
export const createSchedule = (payload) => unwrap(api.post('/api/schedules', payload));
export const updateSchedule = (id, payload) => unwrap(api.put(`/api/schedules/${id}`, payload));
export const deleteSchedule = (id) => unwrap(api.delete(`/api/schedules/${id}`));

// Dose tracking
export const markDoseAsTaken = (scheduleId, time, date = null) =>
  unwrap(api.post(`/api/schedules/${scheduleId}/doses/mark`, { time, date }));

export default api;
