import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import { defineComponent, h } from 'vue'

import FfDragHandle from '../../../../../../frontend/src/ui-components/components/DragHandle.vue'
import { useDragReorder } from '../../../../../../frontend/src/ui-components/composables/useDragReorder.js'

const dataTransfer = () => ({ setData: vi.fn(), setDragImage: vi.fn(), effectAllowed: '', dropEffect: '' })

describe('ff-drag-handle', () => {
    test('can be dragged, and carries the row it sits in', async () => {
        const wrapper = mount({ components: { FfDragHandle }, template: '<table><tbody><tr data-el="row"><td><ff-drag-handle /></td></tr></tbody></table>' })
        const handle = wrapper.find('[data-el="ff-drag-handle"]')
        expect(handle.attributes('draggable')).toBe('true')
        const transfer = dataTransfer()
        await handle.trigger('dragstart', { dataTransfer: transfer })
        expect(transfer.effectAllowed).toBe('move')
        expect(transfer.setDragImage).toHaveBeenCalledWith(wrapper.find('[data-el="row"]').element, 0, 0)
    })

    test('tells of a drag starting and ending, and names itself', async () => {
        const wrapper = mount(FfDragHandle, { props: { label: 'Drag field' } })
        expect(wrapper.attributes('title')).toBe('Drag field')
        await wrapper.trigger('dragstart', { dataTransfer: dataTransfer() })
        await wrapper.trigger('dragend')
        expect(wrapper.emitted()).toHaveProperty('dragstart')
        expect(wrapper.emitted()).toHaveProperty('dragend')
    })
})

describe('useDragReorder', () => {
    function mountList (onMove) {
        const Table = defineComponent({
            components: { FfDragHandle },
            setup () {
                const reorder = useDragReorder({ onMove })
                return () => h('table', h('tbody', [['a', 0], ['b', 1], ['c', 2], ['x', 0]].map(([name, index], position) => {
                    const group = position === 3 ? 'other' : 'list'
                    return h('tr', { 'data-el': name, ...reorder.row(group, index) }, h('td', h(FfDragHandle, reorder.handle(group, index))))
                })))
            }
        })
        return mount(Table)
    }
    // jsdom has no layout, so the row is taken to span 0-10 and the pointer is placed in its upper or lower half
    const over = (wrapper, name, y, type = 'dragover') => {
        const row = wrapper.find(`[data-el="${name}"]`)
        row.element.getBoundingClientRect = () => ({ top: 0, height: 10 })
        return row.trigger(type, { dataTransfer: dataTransfer(), clientY: y })
    }
    const start = (wrapper, name) => wrapper.find(`[data-el="${name}"] [data-el="ff-drag-handle"]`).trigger('dragstart', { dataTransfer: dataTransfer() })

    test('reports the index an item had and takes once taken out of its place', async () => {
        const onMove = vi.fn()
        const wrapper = mountList(onMove)
        await start(wrapper, 'a')
        await over(wrapper, 'c', 8, 'drop')
        expect(onMove).toHaveBeenCalledWith({ group: 'list', from: 0, to: 2 })
        await start(wrapper, 'c')
        await over(wrapper, 'a', 2, 'drop')
        expect(onMove).toHaveBeenLastCalledWith({ group: 'list', from: 2, to: 0 })
    })

    test('reports nothing when an item is dropped where it already is', async () => {
        const onMove = vi.fn()
        const wrapper = mountList(onMove)
        await start(wrapper, 'b')
        await over(wrapper, 'c', 2, 'drop')
        await start(wrapper, 'b')
        await over(wrapper, 'a', 8, 'drop')
        expect(onMove).not.toHaveBeenCalled()
    })

    test('marks where the drop would land, above or below the row', async () => {
        const wrapper = mountList(vi.fn())
        await start(wrapper, 'a')
        expect(wrapper.find('[data-el="a"]').classes()).toContain('ff-reorder--dragging')
        await over(wrapper, 'b', 2)
        expect(wrapper.find('[data-el="b"]').classes()).toContain('ff-reorder--before')
        await over(wrapper, 'b', 8)
        expect(wrapper.find('[data-el="b"]').classes()).toContain('ff-reorder--after')
        await wrapper.find('[data-el="a"] [data-el="ff-drag-handle"]').trigger('dragend')
        expect(wrapper.findAll('[class*="ff-reorder"]')).toHaveLength(0)
    })

    test('refuses a drop on another group', async () => {
        const onMove = vi.fn()
        const wrapper = mountList(onMove)
        await start(wrapper, 'a')
        const transfer = dataTransfer()
        const row = wrapper.find('[data-el="x"]')
        row.element.getBoundingClientRect = () => ({ top: 0, height: 10 })
        const event = new Event('dragover', { cancelable: true })
        event.dataTransfer = transfer
        row.element.dispatchEvent(event)
        expect(event.defaultPrevented).toBe(false)
        await over(wrapper, 'x', 8, 'drop')
        expect(onMove).not.toHaveBeenCalled()
        expect(row.classes()).not.toContain('ff-reorder--after')
    })
})
