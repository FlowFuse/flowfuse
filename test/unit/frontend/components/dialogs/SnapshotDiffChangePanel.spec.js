import { mount } from '@vue/test-utils'
import { expect } from 'vitest'

import SnapshotDiffChangePanel from '../../../../../frontend/src/components/dialogs/SnapshotDiffChangePanel.vue'

function changedText (wrapper, type) {
    return wrapper.vm.lines
        .filter(line => line.type === type)
        .flatMap(line => (line.segments || []).filter(seg => seg.changed).map(seg => seg.text))
}

describe('SnapshotDiffChangePanel', () => {
    test('highlights only the changed words of a changed line', () => {
        const wrapper = mount(SnapshotDiffChangePanel, {
            props: {
                value1: { name: 'pump', flow: 12, unit: 'L/min' },
                value2: { name: 'pump', flow: 13, unit: 'L/min' }
            }
        })

        expect(changedText(wrapper, 'removed')).toEqual(['12'])
        expect(changedText(wrapper, 'added')).toEqual(['13'])
        expect(wrapper.findAll('.diff-word-removed').map(el => el.text())).toEqual(['12'])
        expect(wrapper.findAll('.diff-word-added').map(el => el.text())).toEqual(['13'])
    })

    test('highlights only the changed words of a single-line value', () => {
        const wrapper = mount(SnapshotDiffChangePanel, {
            props: { value1: 'hello old world', value2: 'hello new world' }
        })

        expect(changedText(wrapper, 'removed')).toEqual(['old'])
        expect(changedText(wrapper, 'added')).toEqual(['new'])
    })

    test('keeps the whole line highlighted when the lines have nothing in common', () => {
        const wrapper = mount(SnapshotDiffChangePanel, {
            props: { value1: 'alpha', value2: 'beta' }
        })

        expect(wrapper.vm.lines.every(line => line.segments === undefined)).toBe(true)
        expect(wrapper.findAll('.diff-word-removed')).toHaveLength(0)
        expect(wrapper.findAll('.diff-word-added')).toHaveLength(0)
    })

    test('keeps the whole line highlighted when the lines share only punctuation', () => {
        const wrapper = mount(SnapshotDiffChangePanel, {
            props: {
                value1: { name: 'pump' },
                value2: { unit: 'bar' }
            }
        })

        expect(wrapper.findAll('.diff-word-removed')).toHaveLength(0)
        expect(wrapper.findAll('.diff-word-added')).toHaveLength(0)
    })

    test('keeps the whole line highlighted when long lines are too different to diff by word', () => {
        const words = (prefix) => Array.from({ length: 10000 }, (_, i) => `${prefix}${i}`).join(' ')
        const wrapper = mount(SnapshotDiffChangePanel, {
            props: { value1: `shared ${words('a')}`, value2: `shared ${words('b')}` }
        })

        expect(wrapper.findAll('.diff-word-removed')).toHaveLength(0)
        expect(wrapper.findAll('.diff-word-added')).toHaveLength(0)
    })

    test('pairs removed and added lines in order when the added block is longer', () => {
        const wrapper = mount(SnapshotDiffChangePanel, {
            props: {
                value1: 'start\nalpha one\nbeta two\nend',
                value2: 'start\nalpha ONE\nbeta TWO\ngamma three\nend'
            }
        })

        expect(wrapper.findAll('.diff-word-removed').map(el => el.text())).toEqual(['one', 'two'])
        expect(wrapper.findAll('.diff-word-added').map(el => el.text())).toEqual(['ONE', 'TWO'])
    })

    test('leaves an added line with no removed line to pair with unmarked', () => {
        const wrapper = mount(SnapshotDiffChangePanel, {
            props: {
                value1: { name: 'pump' },
                value2: { name: 'pump', unit: 'bar' }
            }
        })

        const added = wrapper.vm.lines.filter(line => line.type === 'added')
        expect(added.some(line => line.segments === undefined)).toBe(true)
    })
})
