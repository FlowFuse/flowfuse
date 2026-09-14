import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'

import QuestionsList from '../../../../../frontend/src/components/expert/components/messages/components/resources/QuestionsList.vue'

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
const multiQuestion = [{ question: 'Which protocols?', multiSelect: true, options: [{ label: 'MQTT' }, { label: 'HTTP' }] }]

describe('QuestionsList', () => {
    test('composes the same "question answer" line from a picked option', () => {
        const wrapper = mountList(singleQuestion)
        wrapper.vm.setSingle(0, 'MQTT')
        expect(wrapper.vm.compose()).toBe('Which feature do you use most? MQTT')
    })

    test('single-select: a picked option and a typed answer are mutually exclusive', () => {
        const wrapper = mountList(singleQuestion)
        wrapper.vm.setSingle(0, 'MQTT')
        wrapper.vm.setFreeText(0, 'My own answer')
        expect(wrapper.vm.selections[0]).toEqual([])
        expect(wrapper.vm.compose()).toBe('Which feature do you use most? My own answer')

        wrapper.vm.setSingle(0, 'Dashboard')
        expect(wrapper.vm.freeTextSelected[0]).toBe(false)
        expect(wrapper.vm.compose()).toBe('Which feature do you use most? Dashboard')
    })

    test('multi-select: a typed answer joins the checked options, and can be dropped alone', () => {
        const wrapper = mountList(multiQuestion)
        wrapper.vm.setMulti(0, 'MQTT', true)
        wrapper.vm.setFreeText(0, 'Modbus')
        expect(wrapper.vm.compose()).toBe('Which protocols? MQTT, Modbus')

        wrapper.vm.toggleFreeText(0, false)
        expect(wrapper.vm.compose()).toBe('Which protocols? MQTT')
    })

    test('submit emits the composed query and the raw answer state to persist', () => {
        const wrapper = mountList(multiQuestion)
        wrapper.vm.setMulti(0, 'MQTT', true)
        wrapper.vm.setFreeText(0, 'Modbus')
        wrapper.vm.submit()
        expect(wrapper.emitted('select')[0][0]).toEqual({
            query: 'Which protocols? MQTT, Modbus',
            answer: { selections: [['MQTT']], freeTexts: ['Modbus'], freeTextSelected: [true] }
        })
    })

    test('restores picks and typed text from a previously sent answer', () => {
        const wrapper = mountList(multiQuestion, {
            initialAnswer: { selections: [['MQTT']], freeTexts: ['Modbus'], freeTextSelected: [true] }
        })
        expect(wrapper.vm.compose()).toBe('Which protocols? MQTT, Modbus')
        expect(wrapper.vm.allAnswered).toBe(true)
    })
})
