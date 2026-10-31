import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRouter, createWebHashHistory } from 'vue-router'

import { db } from '@/db'
import { DEFAULT_CATEGORIES } from '@/domain/categories'
import { i18n } from '@/i18n'
import BudgetView from '@/views/BudgetView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/', component: { template: '<div />' } }],
})

describe('BudgetView', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await db.categories.bulkPut(DEFAULT_CATEGORIES)
    await db.txns.bulkAdd([
      {
        date: '2026-10-01',
        amountCents: 1000,
        merchant: 'Demo',
        source: 'kartica',
        category: 'groceries',
      },
      {
        date: '2026-10-02',
        amountCents: 500,
        merchant: 'Child spend',
        source: 'kartica',
        category: 'bars',
      },
    ])
    i18n.global.locale.value = 'hr'
  })

  afterEach(async () => {
    vi.restoreAllMocks()
  })

  it('excludes income from budget rows', async () => {
    await db.txns.add({
      date: '2026-10-03',
      amountCents: 50000,
      merchant: 'Salary',
      source: 'zaba',
      category: 'income',
    })
    const wrapper = mount(BudgetView, {
      global: { plugins: [i18n, router] },
    })
    await vi.waitFor(() => expect(wrapper.text()).toContain('Hrana'))
    expect(wrapper.text()).not.toContain('Priljevi')
  })
})
