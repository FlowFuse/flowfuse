import { mount } from '@vue/test-utils'
import { expect } from 'vitest'

import SnapshotDiffChangePanel from '../../../../../frontend/src/components/dialogs/SnapshotDiffChangePanel.vue'

function highlighted (wrapper, type) {
    return wrapper.findAll(`.diff-word-${type}`).map(el => el.text())
}

describe('SnapshotDiffChangePanel', () => {
    test('highlights only the changed words of a changed line', () => {
        const wrapper = mount(SnapshotDiffChangePanel, {
            props: {
                value1: { name: 'pump', flow: 12, unit: 'L/min' },
                value2: { name: 'pump', flow: 13, unit: 'L/min' }
            }
        })

        expect(highlighted(wrapper, 'removed')).toEqual(['12'])
        expect(highlighted(wrapper, 'added')).toEqual(['13'])
    })

    test('highlights only the changed words of a single-line value', () => {
        const wrapper = mount(SnapshotDiffChangePanel, {
            props: { value1: 'hello old world', value2: 'hello new world' }
        })

        expect(highlighted(wrapper, 'removed')).toEqual(['old'])
        expect(highlighted(wrapper, 'added')).toEqual(['new'])
    })

    test('keeps the whole line highlighted when the lines have nothing in common', () => {
        const wrapper = mount(SnapshotDiffChangePanel, {
            props: { value1: 'alpha', value2: 'beta' }
        })

        expect(highlighted(wrapper, 'removed')).toEqual([])
        expect(highlighted(wrapper, 'added')).toEqual([])
    })

    test('keeps the whole line highlighted when the lines share only punctuation', () => {
        const wrapper = mount(SnapshotDiffChangePanel, {
            props: {
                value1: { name: 'pump' },
                value2: { unit: 'bar' }
            }
        })

        expect(highlighted(wrapper, 'removed')).toEqual([])
        expect(highlighted(wrapper, 'added')).toEqual([])
    })

    test('keeps the whole line highlighted when long lines are too different to diff by word', () => {
        const words = (prefix) => Array.from({ length: 10000 }, (_, i) => `${prefix}${i}`).join(' ')
        const wrapper = mount(SnapshotDiffChangePanel, {
            props: { value1: `shared ${words('a')}`, value2: `shared ${words('b')}` }
        })

        expect(highlighted(wrapper, 'removed')).toEqual([])
        expect(highlighted(wrapper, 'added')).toEqual([])
    })

    test('pairs removed and added lines in order when both blocks have the same length', () => {
        const wrapper = mount(SnapshotDiffChangePanel, {
            props: {
                value1: 'start\nalpha one\nbeta two\nend',
                value2: 'start\nalpha ONE\nbeta TWO\nend'
            }
        })

        expect(highlighted(wrapper, 'removed')).toEqual(['one', 'two'])
        expect(highlighted(wrapper, 'added')).toEqual(['ONE', 'TWO'])
    })

    test('pairs JSON properties by key when a property is inserted before the changed one', () => {
        const wrapper = mount(SnapshotDiffChangePanel, {
            props: {
                value1: '{\n  "type": "inject"\n}',
                value2: '{\n  "id": "inject",\n  "type": "debug"\n}'
            }
        })

        const [idLine, typeLine] = wrapper.findAll('.diff-line-added')
        expect(idLine.findAll('.diff-word-added')).toHaveLength(0)
        expect(typeLine.findAll('.diff-word-added').map(el => el.text())).toEqual(['debug'])
        expect(highlighted(wrapper, 'removed')).toEqual(['inject'])
    })

    test('highlights the added comma when a property is appended', () => {
        const wrapper = mount(SnapshotDiffChangePanel, {
            props: {
                value1: { name: 'pump' },
                value2: { name: 'pump', unit: 'bar' }
            }
        })

        const [nameLine, unitLine] = wrapper.findAll('.diff-line-added')
        expect(nameLine.findAll('.diff-word-added').map(el => el.text())).toEqual([','])
        expect(unitLine.findAll('.diff-word-added')).toHaveLength(0)
    })

    test('keeps the whole lines highlighted when plain-text blocks differ in length', () => {
        const wrapper = mount(SnapshotDiffChangePanel, {
            props: {
                value1: 'start\nalpha one\nbeta two\nend',
                value2: 'start\nalpha ONE\nbeta TWO\ngamma three\nend'
            }
        })

        expect(highlighted(wrapper, 'removed')).toEqual([])
        expect(highlighted(wrapper, 'added')).toEqual([])
    })

    test('keeps the whole line highlighted when a JSON property changes key', () => {
        const wrapper = mount(SnapshotDiffChangePanel, {
            props: {
                value1: { x: 10, name: 'pump' },
                value2: { wires: 10, name: 'pump' }
            }
        })

        expect(highlighted(wrapper, 'removed')).toEqual([])
        expect(highlighted(wrapper, 'added')).toEqual([])
    })

    test('highlights only the value when a JSON property keeps its key', () => {
        const wrapper = mount(SnapshotDiffChangePanel, {
            props: {
                value1: { x: 100, name: 'pump' },
                value2: { x: 250, name: 'pump' }
            }
        })

        expect(highlighted(wrapper, 'removed')).toEqual(['100'])
        expect(highlighted(wrapper, 'added')).toEqual(['250'])
    })
})
