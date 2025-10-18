import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/calendar',
    name: 'Calendar',
    component: () => import('../views/CalendarView.vue')
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
