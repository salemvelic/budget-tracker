import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'

import App from '../App.vue'
import { i18n } from '../i18n'
import router from '../router'

describe('App', () => {
  it('renders app title', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router, i18n],
      },
    })
    await router.isReady()
    expect(wrapper.text()).toContain('Budget tracker')
  })
})
