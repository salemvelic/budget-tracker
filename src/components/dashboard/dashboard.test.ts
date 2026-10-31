import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'

import CategoryBreakdown from '@/components/dashboard/CategoryBreakdown.vue'
import IncomeCard from '@/components/dashboard/IncomeCard.vue'
import RecurringCard from '@/components/dashboard/RecurringCard.vue'
import SavingsCard from '@/components/dashboard/SavingsCard.vue'
import { DEFAULT_CATEGORIES } from '@/domain/categories'
import type { MonthPlan } from '@/domain/plan'
import { i18n } from '@/i18n'

const global = { plugins: [i18n] }

const basePlan: MonthPlan = {
  limitCents: 60000,
  usesCategoryBudgets: false,
  spentCents: 20000,
  fixedSpentCents: 0,
  variableSpentCents: 20000,
  fixedReservedCents: 0,
  remainingCents: 40000,
  flexibleLeftCents: 40000,
  savedCents: 5000,
  incomeCents: 0,
  savingsRate: null,
}

beforeEach(() => {
  i18n.global.locale.value = 'hr'
  try {
    localStorage.removeItem('budget-tracker:collapsed:income')
    localStorage.removeItem('budget-tracker:collapsed:byCategory')
  } catch {
    /* ignore */
  }
})

function sectionToggleButton(wrapper: ReturnType<typeof mount>) {
  return wrapper.find('article button, h2 button')
}

describe('CategoryBreakdown', () => {
  it('shows trend line under a category row', () => {
    const wrapper = mount(CategoryBreakdown, {
      props: {
        rows: [{ id: 'food', cents: 12000, children: [] }],
        trends: { food: { lastMonthCents: 10000, avg3Cents: 9000 } },
        categories: DEFAULT_CATEGORIES,
        txns: [],
        expandedId: null,
        openListId: null,
      },
      global,
    })
    expect(wrapper.text()).toContain('prošli mj.')
    expect(wrapper.text()).toContain('prosjek 3 mj.')
  })

  it('expands subcategories on click', async () => {
    const wrapper = mount(CategoryBreakdown, {
      props: {
        rows: [{ id: 'food', cents: 12000, children: [['groceries', 8000]] }],
        trends: {},
        categories: DEFAULT_CATEGORIES,
        txns: [],
        expandedId: null,
        openListId: null,
      },
      global,
    })
    await wrapper.findAll('button')[1]!.trigger('click')
    expect(wrapper.emitted('categoryClick')?.[0]?.[0]).toMatchObject({ id: 'food' })
  })

  it('collapses and expands from the section header', async () => {
    const wrapper = mount(CategoryBreakdown, {
      props: {
        rows: [{ id: 'food', cents: 12000, children: [] }],
        trends: {},
        categories: DEFAULT_CATEGORIES,
        txns: [],
        expandedId: null,
        openListId: null,
      },
      global,
    })
    expect(wrapper.text()).toContain('Hrana')
    const header = sectionToggleButton(wrapper)
    expect(header.attributes('aria-expanded')).toBe('true')
    await header.trigger('click')
    expect(header.attributes('aria-expanded')).toBe('false')
    expect(wrapper.text()).not.toContain('Hrana')
    await header.trigger('click')
    expect(header.attributes('aria-expanded')).toBe('true')
    expect(wrapper.text()).toContain('Hrana')
  })
})

describe('IncomeCard', () => {
  it('shows savings rate when there is income', () => {
    const wrapper = mount(IncomeCard, {
      props: {
        plan: { ...basePlan, incomeCents: 100000, savingsRate: 0.05 },
      },
      global,
    })
    expect(wrapper.text()).toContain('Stopa štednje')
    expect(wrapper.text()).toContain('5 %')
  })

  it('hides savings rate without income', () => {
    const wrapper = mount(IncomeCard, {
      props: { plan: basePlan },
      global,
    })
    expect(wrapper.text()).not.toContain('Stopa štednje')
  })

  it('collapses and expands from the section header', async () => {
    const wrapper = mount(IncomeCard, {
      props: {
        plan: { ...basePlan, incomeCents: 100000, savingsRate: 0.05 },
      },
      global,
    })
    expect(wrapper.text()).toContain('Priljevi')
    const header = sectionToggleButton(wrapper)
    expect(header.attributes('aria-expanded')).toBe('true')
    await header.trigger('click')
    expect(header.attributes('aria-expanded')).toBe('false')
    expect(wrapper.text()).not.toContain('Stopa štednje')
    await header.trigger('click')
    expect(wrapper.text()).toContain('Stopa štednje')
  })
})

describe('RecurringCard', () => {
  it('renders recurring rows and collapses', async () => {
    const wrapper = mount(RecurringCard, {
      props: {
        selectedMonth: '2026-10',
        categories: DEFAULT_CATEGORIES,
        txns: [
          {
            date: '2026-09-05',
            amountCents: 999,
            merchant: 'Demo Stream',
            category: 'subscriptions',
          },
          {
            date: '2026-08-05',
            amountCents: 999,
            merchant: 'Demo Stream',
            category: 'subscriptions',
          },
        ],
      },
      global,
    })
    expect(wrapper.text()).toContain('Ponavljajuća')
    await sectionToggleButton(wrapper).trigger('click')
    expect(wrapper.text()).not.toContain('demo stream')
  })
})

describe('SavingsCard', () => {
  it('lists savings merchant groups when open', async () => {
    const wrapper = mount(SavingsCard, {
      props: {
        plan: { ...basePlan, savedCents: 3000 },
        savingsGroups: [
          {
            merchant: 'Demo Robo',
            cents: 3000,
            txns: [
              {
                id: 1,
                date: '2026-10-01',
                amountCents: 3000,
                merchant: 'Demo Robo',
                source: 'revolut',
                category: 'savings',
              },
            ],
          },
        ],
        savingsOpen: true,
        openSavingsMerchant: null,
        isOpenSavingsGroup: () => false,
      },
      global,
    })
    expect(wrapper.text()).toContain('Demo Robo')
  })
})
