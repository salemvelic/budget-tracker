import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRouter, createWebHashHistory } from 'vue-router'

import { db } from '@/db'
import { DEFAULT_CATEGORIES } from '@/domain/categories'
import { monthKey, shiftMonth } from '@/domain/month'
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
    const ym = monthKey()
    const m1 = shiftMonth(ym, -1)
    const m2 = shiftMonth(ym, -2)
    await db.txns.bulkAdd([
      {
        date: `${ym}-01`,
        amountCents: 1000,
        merchant: 'Demo',
        source: 'kartica',
        category: 'groceries',
      },
      {
        date: `${ym}-02`,
        amountCents: 500,
        merchant: 'Child spend',
        source: 'kartica',
        category: 'bars',
      },
      {
        date: `${m1}-10`,
        amountCents: 8500,
        merchant: 'Lidl',
        source: 'kartica',
        category: 'groceries',
      },
      {
        date: `${m2}-12`,
        amountCents: 8500,
        merchant: 'Lidl',
        source: 'kartica',
        category: 'groceries',
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

  it('applies a budget suggestion from the 3-month average', async () => {
    const wrapper = mount(BudgetView, {
      global: { plugins: [i18n, router] },
    })
    await vi.waitFor(() => expect(wrapper.text()).toContain('Prijedlog'))
    const apply = wrapper.findAll('button').find((b) => b.text() === 'Primijeni')
    expect(apply).toBeDefined()
    await apply!.trigger('click')
    await vi.waitFor(async () => {
      expect((await db.categories.get('food'))?.budgetCents).toBe(9000)
    })
  })
})
