import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { nextTick } from 'vue'

import { useRevealMore } from '../../../../frontend/src/composables/RevealMore.ts'

const List = {
    props: ['items'],
    setup () { return useRevealMore(2) },
    template: '<ul><li v-for="item in items.slice(0, shown)" :key="item">{{ item }}</li><li v-if="items.length > shown" ref="sentinel" data-el="more" /></ul>'
}

// stands in for the browser telling the page what scrolled into view
function fakeObserver () {
    const observers = []
    vi.stubGlobal('IntersectionObserver', class {
        constructor (callback) { this.callback = callback; this.watched = new Set(); observers.push(this) }
        observe (el) { this.watched.add(el) }
        disconnect () { this.watched.clear() }
    })
    return { comeIntoView: () => observers.forEach(o => o.watched.size && o.callback([{ isIntersecting: true }])), watching: () => observers.some(o => o.watched.size) }
}

describe('useRevealMore', () => {
    afterEach(() => vi.unstubAllGlobals())

    test('draws a step at a time, each time the end of the list comes into view', async () => {
        const browser = fakeObserver()
        const list = mount(List, { props: { items: [1, 2, 3, 4, 5] } })
        await nextTick()
        expect(list.findAll('li:not([data-el])')).toHaveLength(2)
        browser.comeIntoView()
        await nextTick()
        expect(list.findAll('li:not([data-el])')).toHaveLength(4)
        browser.comeIntoView()
        await nextTick()
        expect(list.findAll('li:not([data-el])')).toHaveLength(5)
        expect(list.find('[data-el="more"]').exists()).toBe(false)
        await nextTick()
        expect(browser.watching()).toBe(false)
    })

    test('starts over when reset', async () => {
        const browser = fakeObserver()
        const list = mount(List, { props: { items: [1, 2, 3, 4, 5] } })
        await nextTick()
        browser.comeIntoView()
        await nextTick()
        list.vm.reset()
        await nextTick()
        expect(list.findAll('li:not([data-el])')).toHaveLength(2)
    })

    test('draws everything where the browser cannot say what is in view', () => {
        vi.stubGlobal('IntersectionObserver', undefined)
        const list = mount(List, { props: { items: [1, 2, 3, 4, 5] } })
        expect(list.findAll('li:not([data-el])')).toHaveLength(5)
    })
})
