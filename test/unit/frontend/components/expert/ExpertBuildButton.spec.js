import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { reactive } from 'vue'

const contextStore = reactive({ team: null })
const settingsStore = reactive({ featuresCheck: {} })

vi.mock('@/stores/context.js', () => ({ useContextStore: () => contextStore }))
vi.mock('@/stores/account-settings.js', () => ({ useAccountSettingsStore: () => settingsStore }))

// imported after mocks so vi.mock hoisting resolves correctly
import ExpertBuildButton from '../../../../../frontend/src/components/expert/ExpertBuildButton.vue'

const FfButton = {
    name: 'ff-button',
    props: ['kind', 'to'],
    template: '<button data-stub="ff-button"><slot name="icon" /><slot /></button>'
}

function mountButton (target = 'instance') {
    return mount(ExpertBuildButton, {
        props: { target },
        global: {
            components: { 'ff-button': FfButton },
            directives: {
                'ff-tooltip': {},
                // Records the event name so the test can read it off the element
                'ff-track': { mounted (el, binding) { el.dataset.track = binding.value } }
            }
        }
    })
}

describe('ExpertBuildButton', () => {
    beforeEach(() => {
        contextStore.team = { id: 't1', slug: 'ateam' }
        settingsStore.featuresCheck = { isAiFeatureEnabled: true, isExpertAssistantFeatureEnabled: true }
    })

    test('links to the build page for the current team, styled as the Expert', () => {
        const button = mountButton().findComponent(FfButton)
        expect(button.props('kind')).toBe('expert')
        expect(button.props('to')).toEqual({ name: 'team-build-instance', params: { team_slug: 'ateam' } })
    })

    test('is an icon only button with an accessible name', () => {
        const button = mountButton().find('[data-stub="ff-button"]')
        expect(button.text()).toBe('')
        expect(button.find('svg').exists()).toBe(true)
        expect(button.attributes('aria-label')).toBe('Build an instance using the FlowFuse Expert')
    })

    test('sends applications and devices to their own build route, named on hover', () => {
        const application = mountButton('application')
        expect(application.findComponent(FfButton).props('to')).toEqual({ name: 'team-build-application', params: { team_slug: 'ateam' } })
        expect(application.find('[data-stub="ff-button"]').attributes('aria-label')).toBe('Build an application using the FlowFuse Expert')

        const device = mountButton('device')
        expect(device.findComponent(FfButton).props('to')).toEqual({ name: 'team-build-device', params: { team_slug: 'ateam' } })
        expect(device.find('[data-stub="ff-button"]').attributes('aria-label')).toBe('Build a remote instance using the FlowFuse Expert')
    })

    test('tracks each kind of build under its own event', () => {
        const event = target => mountButton(target).find('[data-stub="ff-button"]').attributes('data-track')
        expect(event('instance')).toBe('ff-expert-build-instance-clicked')
        expect(event('application')).toBe('ff-expert-build-application-clicked')
        expect(event('device')).toBe('ff-expert-build-device-clicked')
    })

    test('renders nothing when AI is off', () => {
        settingsStore.featuresCheck = { isAiFeatureEnabled: false, isExpertAssistantFeatureEnabled: true }
        expect(mountButton().find('[data-stub="ff-button"]').exists()).toBe(false)
    })

    test('renders nothing when the Expert assistant is off', () => {
        settingsStore.featuresCheck = { isAiFeatureEnabled: true, isExpertAssistantFeatureEnabled: false }
        expect(mountButton().find('[data-stub="ff-button"]').exists()).toBe(false)
    })

    test('renders nothing before the team has loaded', () => {
        contextStore.team = null
        expect(mountButton().find('[data-stub="ff-button"]').exists()).toBe(false)
    })
})
