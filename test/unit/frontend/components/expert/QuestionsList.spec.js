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

    test('single-select: a non-empty typed answer rides along with a picked option', () => {
        const wrapper = mountList(singleQuestion)
        wrapper.vm.setSingle(0, 'MQTT')
        wrapper.vm.setFreeText(0, 'My own answer')
        expect(wrapper.vm.selections[0]).toEqual(['MQTT'])
        expect(wrapper.vm.compose()).toBe('Which feature do you use most? MQTT, My own answer')

        wrapper.vm.setFreeText(0, '')
        expect(wrapper.vm.compose()).toBe('Which feature do you use most? MQTT')
    })

    test('single-select: a typed answer alone counts as answered', () => {
        const wrapper = mountList(singleQuestion)
        expect(wrapper.vm.allAnswered).toBe(false)
        wrapper.vm.setFreeText(0, 'My own answer')
        expect(wrapper.vm.allAnswered).toBe(true)
        expect(wrapper.vm.compose()).toBe('Which feature do you use most? My own answer')
    })

    test('multi-select: a typed answer joins the checked options, and clearing it drops it', () => {
        const wrapper = mountList(multiQuestion)
        wrapper.vm.setMulti(0, 'MQTT', true)
        wrapper.vm.setFreeText(0, 'Modbus')
        expect(wrapper.vm.compose()).toBe('Which protocols? MQTT, Modbus')

        wrapper.vm.setFreeText(0, ' ')
        expect(wrapper.vm.compose()).toBe('Which protocols? MQTT')
    })

    test('submit emits the composed query and the raw answer state to persist', () => {
        const wrapper = mountList(multiQuestion)
        wrapper.vm.setMulti(0, 'MQTT', true)
        wrapper.vm.setFreeText(0, 'Modbus')
        wrapper.vm.submit()
        expect(wrapper.emitted('select')[0][0]).toEqual({
            query: 'Which protocols? MQTT, Modbus',
            answer: { selections: [['MQTT']], freeTexts: ['Modbus'] }
        })
    })

    test('restores picks and typed text from a previously sent answer', () => {
        const wrapper = mountList(multiQuestion, {
            initialAnswer: { selections: [['MQTT']], freeTexts: ['Modbus'] }
        })
        expect(wrapper.vm.compose()).toBe('Which protocols? MQTT, Modbus')
        expect(wrapper.vm.allAnswered).toBe(true)
    })

    test('requests the tile layout only on the onboarding surface', () => {
        const drawer = mountList(singleQuestion)
        expect(drawer.vm.tileLayout).toBe(false)

        const onboarding = mount(QuestionsList, {
            props: { questions: singleQuestion },
            global: { stubs, provide: { 'expert-surface': 'onboarding' } }
        })
        expect(onboarding.vm.tileLayout).toBe(true)
    })

    test('applies the tile class to checkbox options only on the onboarding surface', () => {
        const drawer = mountList(multiQuestion)
        expect(drawer.find('.ff-checkbox--tile').exists()).toBe(false)

        const onboarding = mount(QuestionsList, {
            props: { questions: multiQuestion },
            global: { stubs, provide: { 'expert-surface': 'onboarding' } }
        })
        expect(onboarding.find('.ff-checkbox--tile').exists()).toBe(true)
    })
})
