import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import ExpertLoadingIndicator from '../../../../../frontend/src/components/expert/components/ExpertLoadingIndicator.vue'

describe('ExpertLoadingIndicator', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    test('shows a status line under the dots after a few seconds', async () => {
        const wrapper = mount(ExpertLoadingIndicator)
        vi.advanceTimersByTime(5000)
        await wrapper.vm.$nextTick()

        expect(wrapper.findAll('.loading-dot')).toHaveLength(3)
        expect(wrapper.find('.loading-message').exists()).toBe(true)
    })

    test('shows only the dots when status lines are off', async () => {
        const wrapper = mount(ExpertLoadingIndicator, { props: { showMessages: false } })
        vi.advanceTimersByTime(5000)
        await wrapper.vm.$nextTick()

        expect(wrapper.findAll('.loading-dot')).toHaveLength(3)
        expect(wrapper.find('.loading-message').exists()).toBe(false)
    })
})
