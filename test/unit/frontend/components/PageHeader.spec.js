import { describe, expect, test } from 'vitest'

import PageHeader from '../../../../frontend/src/components/PageHeader.vue'

// navigationOptions only reads a few fields, so it runs against a plain object
function menuTags (featuresCheck) {
    const header = { user: { admin: false }, featuresCheck, $router: { push: () => {} } }
    return PageHeader.computed.navigationOptions.call(header).map(option => option.tag)
}

describe('PageHeader user menu', () => {
    test('offers the welcome tour on the classic home', () => {
        expect(menuTags({})).toContain('welcome-tour')
    })

    test('hides the welcome tour on the Expert home', () => {
        const tags = menuTags({ isExpertAssistantFeatureEnabled: true })
        expect(tags).not.toContain('welcome-tour')
        expect(tags).toContain('getting-started')
    })
})
