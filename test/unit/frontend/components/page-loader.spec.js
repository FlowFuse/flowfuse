import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import PageLoader from '../../../../frontend/src/components/PageLoader.vue'
import { useUxLoadingStore } from '../../../../frontend/src/stores/ux-loading.js'

describe('PageLoader', () => {
    let pinia

    beforeEach(() => {
        pinia = createPinia()
        setActivePinia(pinia)
    })

    function mountLoader (loading) {
        return mount(PageLoader, {
            props: { loading, loaderKey: 'test-key' },
            slots: {
                loading: '<div class="skeleton" />',
                default: '<div class="content" />'
            },
            global: { plugins: [pinia] }
        })
    }

    it('renders the skeleton slot while loading and registers the key', () => {
        const wrapper = mountLoader(true)
        expect(wrapper.find('.skeleton').exists()).toBe(true)
        expect(wrapper.find('.content').exists()).toBe(false)
        expect(useUxLoadingStore().isPageLoading).toBe(true)
    })

    it('renders content and does not register when not loading', () => {
        const wrapper = mountLoader(false)
        expect(wrapper.find('.content').exists()).toBe(true)
        expect(wrapper.find('.skeleton').exists()).toBe(false)
        expect(useUxLoadingStore().isPageLoading).toBe(false)
    })

    it('registers when it becomes loading and clears when it resolves', async () => {
        const wrapper = mountLoader(false)
        const store = useUxLoadingStore()

        await wrapper.setProps({ loading: true })
        expect(store.isPageLoading).toBe(true)

        await wrapper.setProps({ loading: false })
        expect(store.isPageLoading).toBe(false)
    })

    it('clears its key on unmount', () => {
        const wrapper = mountLoader(true)
        const store = useUxLoadingStore()
        expect(store.isPageLoading).toBe(true)

        wrapper.unmount()
        expect(store.isPageLoading).toBe(false)
    })
})
