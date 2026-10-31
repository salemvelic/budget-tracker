import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      meta: { titleKey: 'views.dashboard.heading' },
      component: () => import('@/views/DashboardView.vue'),
    },
    {
      path: '/transactions',
      name: 'transactions',
      meta: { titleKey: 'views.transactions.heading' },
      component: () => import('@/views/TransactionsView.vue'),
    },
    {
      path: '/import',
      name: 'import',
      meta: { titleKey: 'views.import.heading' },
      component: () => import('@/views/ImportView.vue'),
    },
    {
      path: '/budget',
      name: 'budget',
      meta: { titleKey: 'views.budget.heading' },
      component: () => import('@/views/BudgetView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      meta: { titleKey: 'views.settings.heading' },
      component: () => import('@/views/SettingsView.vue'),
    },
  ],
})

export default router
