import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import Invitations from '../../../../../../frontend/src/pages/team/Members/Invitations.vue'
import ForgeUIComponents from '../../../../../../frontend/src/ui-components/index.js'

const mocks = vi.hoisted(() => ({
    dialogShow: vi.fn()
}))

vi.mock('@/services/dialog.js', () => ({ default: { show: mocks.dialogShow } }))
vi.mock('@/stores/context.js', () => ({ useContextStore: () => ({ team: null, teamMembership: null }) }))
vi.mock('@/stores/account-settings.js', () => ({ useAccountSettingsStore: () => ({ settings: {} }) }))

const payload = '<img src=x onerror=alert(1)>'
const invite = { id: 'i1', team: { id: 't1' }, invitee: { name: payload } }

describe('Invitations', () => {
    let wrapper

    beforeEach(() => {
        mocks.dialogShow.mockReset()
        wrapper = mount(Invitations, {
            props: { inviteCount: 1 },
            global: { plugins: [ForgeUIComponents] }
        })
    })

    test.each(['removeInvite', 'resendInvite'])('%s escapes the invitee name in the dialog html', async (method) => {
        await wrapper.vm[method](invite)

        const { html } = mocks.dialogShow.mock.calls[0][0]
        expect(html).not.toContain('<img')
        expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    })
})
