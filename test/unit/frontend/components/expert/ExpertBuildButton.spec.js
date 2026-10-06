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
    template: '<button data-stub="ff-button"><slot name="icon-left" /><slot /></button>'
}

function mountButton () {
    return mount(ExpertBuildButton, { global: { components: { 'ff-button': FfButton } } })
}

describe('ExpertBuildButton', () => {
    beforeEach(() => {
        contextStore.team = { id: 't1', slug: 'ateam' }
        settingsStore.featuresCheck = { isAiFeatureEnabled: true, isExpertAssistantFeatureEnabled: true }
    })

    test('links to the build page for the current team, styled as the Expert', () => {
        const button = mountButton().findComponent(FfButton)
        expect(button.props('kind')).toBe('expert')
        expect(button.props('to')).toEqual({ name: 'team-build', params: { team_slug: 'ateam' } })
        expect(button.text()).toContain('Build')
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
