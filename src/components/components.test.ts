import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '@/db'
import { DEFAULT_CATEGORIES } from '@/domain/categories'
import { i18n } from '@/i18n'

import ImportPreview from './ImportPreview.vue'
import TransactionForm from './TransactionForm.vue'
import TransactionList from './TransactionList.vue'

const global = { plugins: [i18n] }

beforeEach(() => {
  i18n.global.locale.value = 'hr'
})

describe('TransactionForm', () => {
  it('shows the specific validation message and does not emit', async () => {
    const wrapper = mount(TransactionForm, { props: { categories: DEFAULT_CATEGORIES }, global })
    await wrapper.find('input[inputmode="decimal"]').setValue('12,5x')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Iznos nije valjan.')
    expect(wrapper.emitted('save')).toBeUndefined()
  })

  it('emits cents for a valid entry', async () => {
    const wrapper = mount(TransactionForm, { props: { categories: DEFAULT_CATEGORIES }, global })
    await wrapper.find('input[inputmode="decimal"]').setValue('12,50')
    await wrapper.findAll('input[type="text"]')[1]!.setValue('Demo shop')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('save')?.[0]?.[0]).toMatchObject({
      amountCents: 1250,
      merchant: 'Demo shop',
    })
  })
})

describe('TransactionList', () => {
  afterEach(() => vi.restoreAllMocks())

  const props = {
    categories: DEFAULT_CATEGORIES,
    txns: [
      {
        id: 3,
        date: '2026-10-01',
        amountCents: 100,
        merchant: 'Demo',
        source: 'kartica' as const,
        category: 'food',
      },
    ],
  }

  it('asks before deleting', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const wrapper = mount(TransactionList, { props, global })
    await wrapper.findAll('button')[1]!.trigger('click')
    expect(confirm).toHaveBeenCalledOnce()
    expect(wrapper.emitted('remove')).toBeUndefined()

    confirm.mockReturnValue(true)
    await wrapper.findAll('button')[1]!.trigger('click')
    expect(wrapper.emitted('remove')?.[0]).toEqual([3])
  })

  it('emits a category change from the inline select', async () => {
    const wrapper = mount(TransactionList, { props, global })
    await wrapper.find('select').setValue('shopping')
    expect(wrapper.emitted('recategorize')?.[0]).toEqual([props.txns[0], 'shopping'])
  })
})

describe('ImportPreview', () => {
  const emptyExcluded = new Set<string>()
  const emptyHints = new Map<string, string>()

  it('lists skip reasons with counts', () => {
    const wrapper = mount(ImportPreview, {
      props: {
        preview: [],
        skipped: { transfer: 4, payment: 2, pending: 0 },
        importing: false,
        excluded: emptyExcluded,
        duplicateHints: emptyHints,
      },
      global,
    })
    expect(wrapper.text()).toContain('Nadoplate i prijenosi: 4')
    expect(wrapper.text()).toContain('Uplate za karticu: 2')
    expect(wrapper.text()).not.toContain('Na čekanju')
  })

  it('starts duplicate rows unchecked', () => {
    const row = {
      date: '2026-10-01',
      amountCents: 100,
      merchant: 'Demo',
      source: 'zaba' as const,
      category: 'other',
      importHash: 'zaba|dup',
    }
    const excluded = new Set(['zaba|dup'])
    const wrapper = mount(ImportPreview, {
      props: {
        preview: [row],
        skipped: {},
        importing: false,
        excluded,
        duplicateHints: new Map([['zaba|dup', 'Existing shop']]),
      },
      global,
    })
    const checkbox = wrapper.find('input[type="checkbox"]').element as HTMLInputElement
    expect(checkbox.checked).toBe(false)
  })

  it('lets the category be changed before import', async () => {
    await db.categories.bulkPut(DEFAULT_CATEGORIES)
    const row = {
      date: '2026-10-01',
      amountCents: 100,
      merchant: 'Demo',
      source: 'zaba' as const,
      category: 'other',
      importHash: 'zaba|id:B1',
    }
    const wrapper = mount(ImportPreview, {
      props: {
        preview: [row],
        skipped: {},
        importing: false,
        excluded: emptyExcluded,
        duplicateHints: emptyHints,
      },
      global,
    })
    await vi.waitFor(() => expect(wrapper.findAll('option').length).toBe(DEFAULT_CATEGORIES.length))
    await wrapper.find('select').setValue('food')
    expect(wrapper.emitted('setCategory')?.[0]).toEqual([0, 'food'])
  })
})
