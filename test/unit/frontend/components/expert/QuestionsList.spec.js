import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'

import QuestionsList from '../../../../../frontend/src/components/expert/components/messages/components/resources/QuestionsList.vue'

// The ff-* form controls are globally registered in the app but not in the test
// env; stub them so the component mounts and we can drive its answer state.
const stubs = {
    'ff-radio-group': true,
    'ff-radio-button': true,
    'ff-checkbox': true,
    'ff-text-input': true,
    'ff-button': true
}

function mountList (questions, props = {}) {
    return mount(QuestionsList, {
        props: { questions, ...props },
        global: { stubs }
    })
}

const singleQuestion = [{ question: 'Which feature do you use most?', options: [{ label: 'MQTT' }, { label: 'Dashboard' }] }]
const twoQuestions = [
    { question: 'Q1?', options: [{ label: 'A' }, { label: 'B' }] },
    { question: 'Q2?', options: [{ label: 'C' }, { label: 'D' }] }
]
const multiQuestion = [{ question: 'Which protocols?', multiSelect: true, options: [{ label: 'MQTT' }, { label: 'HTTP' }] }]

describe('QuestionsList', () => {
    test('composes the same "question answer" line from a picked option', () => {
        const wrapper = mountList(singleQuestion)
        wrapper.vm.setSingle(0, 'MQTT')
        expect(wrapper.vm.compose()).toBe('Which feature do you use most? MQTT')
    })

    test('composes from a typed answer when no option is picked', () => {
        const wrapper = mountList(singleQuestion)
        wrapper.vm.setFreeText(0, 'Something custom')
        expect(wrapper.vm.compose()).toBe('Which feature do you use most? Something custom')
    })

    test('single-select: typing an answer clears the picked option', () => {
        const wrapper = mountList(singleQuestion)
        wrapper.vm.setSingle(0, 'MQTT')
        wrapper.vm.setFreeText(0, 'My own answer')
        expect(wrapper.vm.selections[0]).toEqual([])
        expect(wrapper.vm.compose()).toBe('Which feature do you use most? My own answer')
    })

    test('single-select: picking an option deselects the typed answer but keeps the text', () => {
        const wrapper = mountList(singleQuestion)
        wrapper.vm.setFreeText(0, 'My own answer')
        wrapper.vm.setSingle(0, 'Dashboard')
        expect(wrapper.vm.freeTextSelected[0]).toBe(false)
        expect(wrapper.vm.freeTexts[0]).toBe('My own answer')
        expect(wrapper.vm.compose()).toBe('Which feature do you use most? Dashboard')
    })

    test('multi-select: a chosen typed answer joins the checked options', () => {
        const wrapper = mountList(multiQuestion)
        wrapper.vm.setMulti(0, 'MQTT', true)
        wrapper.vm.setFreeText(0, 'Modbus')
        expect(wrapper.vm.compose()).toBe('Which protocols? MQTT, Modbus')
    })

    test('multi-select: deselecting the typed answer keeps the options and drops the text', () => {
        const wrapper = mountList(multiQuestion)
        wrapper.vm.setMulti(0, 'MQTT', true)
        wrapper.vm.setFreeText(0, 'Modbus')
        wrapper.vm.toggleFreeText(0, false)
        expect(wrapper.vm.freeTexts[0]).toBe('Modbus')
        expect(wrapper.vm.compose()).toBe('Which protocols? MQTT')
    })

    test('allAnswered is satisfied by a typed answer alone', () => {
        const wrapper = mountList(twoQuestions)
        expect(wrapper.vm.allAnswered).toBe(false)
        wrapper.vm.setSingle(0, 'A')
        expect(wrapper.vm.allAnswered).toBe(false)
        wrapper.vm.setFreeText(1, 'typed for the second')
        expect(wrapper.vm.allAnswered).toBe(true)
    })

    test('choosing the free-text option without typing is not answered', () => {
        const wrapper = mountList(singleQuestion)
        wrapper.vm.selectFreeText(0)
        expect(wrapper.vm.allAnswered).toBe(false)
    })

    test('whitespace-only typed answers do not count as answered', () => {
        const wrapper = mountList(singleQuestion)
        wrapper.vm.setFreeText(0, '   ')
        expect(wrapper.vm.allAnswered).toBe(false)
    })

    test('submit emits the composed query and the raw answer state to persist', () => {
        const wrapper = mountList(multiQuestion)
        wrapper.vm.setMulti(0, 'MQTT', true)
        wrapper.vm.setFreeText(0, 'Modbus')
        wrapper.vm.submit()
        const payload = wrapper.emitted('select')[0][0]
        expect(payload.query).toBe('Which protocols? MQTT, Modbus')
        expect(payload.answer).toEqual({
            selections: [['MQTT']],
            freeTexts: ['Modbus'],
            freeTextSelected: [true]
        })
    })

    test('restores picks and typed text from a previously sent answer', () => {
        const wrapper = mountList(multiQuestion, {
            initialAnswer: {
                selections: [['MQTT']],
                freeTexts: ['Modbus'],
                freeTextSelected: [true]
            }
        })
        expect(wrapper.vm.compose()).toBe('Which protocols? MQTT, Modbus')
        expect(wrapper.vm.allAnswered).toBe(true)
    })

    test('does not mutate the restored answer object', () => {
        const initialAnswer = {
            selections: [['MQTT']],
            freeTexts: [''],
            freeTextSelected: [false]
        }
        const wrapper = mountList(multiQuestion, { initialAnswer })
        wrapper.vm.setMulti(0, 'HTTP', true)
        expect(initialAnswer.selections).toEqual([['MQTT']])
    })

    test('no longer exposes an edit action', () => {
        const wrapper = mountList(singleQuestion)
        expect(wrapper.vm.$options.emits).not.toContain('edit')
    })
})
