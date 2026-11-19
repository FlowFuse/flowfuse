import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { nextTick, ref } from 'vue'

vi.mock('@/services/product.js', () => ({ default: { capture: vi.fn() } }))

// imported after mocks so vi.mock hoisting resolves correctly
import Product from '../../../../../../frontend/src/services/product.js'
import Track from '../../../../../../frontend/src/ui-components/directives/Track.js'

function mountButton (event, attrs = '') {
    const name = ref(event)
    const wrapper = mount({
        directives: { 'ff-track': Track },
        setup: () => ({ name }),
        template: `<button v-ff-track="name" ${attrs}>Go</button>`
    })
    return { wrapper, name }
}

describe('v-ff-track', () => {
    beforeEach(() => {
        Product.capture.mockClear()
    })

    test('captures the event on click', async () => {
        const { wrapper } = mountButton('ff-instance-create-clicked')
        await wrapper.trigger('click')
        expect(Product.capture).toHaveBeenCalledWith('ff-instance-create-clicked')
    })

    test('captures the latest event when the binding changes', async () => {
        const { wrapper, name } = mountButton('ff-first-clicked')
        name.value = 'ff-second-clicked'
        await nextTick()
        await wrapper.trigger('click')
        expect(Product.capture).toHaveBeenCalledWith('ff-second-clicked')
    })

    // A button's own click handler often navigates away, and on a real click the
    // page can unmount before later listeners run, so tracking has to go first
    test('captures before the element\'s own click handlers run', async () => {
        const wrapper = mount({
            directives: { 'ff-track': Track },
            methods: { go: event => event.stopImmediatePropagation() },
            template: '<button v-ff-track="\'ff-instance-create-clicked\'" @click="go">Go</button>'
        })
        await wrapper.trigger('click')
        expect(Product.capture).toHaveBeenCalledWith('ff-instance-create-clicked')
    })

    test('ignores clicks on disabled elements', async () => {
        const { wrapper } = mountButton('ff-instance-create-clicked', 'aria-disabled="true"')
        await wrapper.trigger('click')
        expect(Product.capture).not.toHaveBeenCalled()
    })

    test('stops listening once unmounted', async () => {
        const { wrapper } = mountButton('ff-instance-create-clicked')
        const el = wrapper.element
        wrapper.unmount()
        el.dispatchEvent(new Event('click'))
        expect(Product.capture).not.toHaveBeenCalled()
    })
})
