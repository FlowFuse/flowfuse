import { describe, expect, it } from 'vitest'

import { contactRequiredToChangeTeamType } from '../../../../frontend/src/utils/teamType.ts'

const contactType = { properties: { billing: { requireContact: true } } }
const selfServeType = { properties: { billing: { requireContact: false } } }

const base = {
    billingEnabled: true,
    isAdmin: false,
    selectedTeamType: contactType,
    selectedTeamTypeId: 'current',
    currentTeamTypeId: 'current',
    trialMode: false
}

describe('contactRequiredToChangeTeamType', () => {
    it('requires contact for a trial converting on its current contact-required type', () => {
        expect(contactRequiredToChangeTeamType({ ...base, trialMode: true })).toBe(true)
    })

    it('does not require contact for a trial when the current type is self-serve', () => {
        expect(contactRequiredToChangeTeamType({ ...base, selectedTeamType: selfServeType, trialMode: true })).toBe(false)
    })

    it('requires contact when switching to a different contact-required type', () => {
        expect(contactRequiredToChangeTeamType({ ...base, selectedTeamTypeId: 'target' })).toBe(true)
    })

    it('does not require contact for a non-trial team staying on its current contact-required type', () => {
        expect(contactRequiredToChangeTeamType(base)).toBe(false)
    })

    it('lets admins self-serve even in a trial on a contact-required type', () => {
        expect(contactRequiredToChangeTeamType({ ...base, isAdmin: true, trialMode: true })).toBe(false)
    })

    it('never requires contact when billing is disabled', () => {
        expect(contactRequiredToChangeTeamType({ ...base, billingEnabled: false, selectedTeamTypeId: 'target', trialMode: true })).toBe(false)
    })

    it('does not require contact when the selected team type is missing', () => {
        expect(contactRequiredToChangeTeamType({ ...base, selectedTeamType: null, selectedTeamTypeId: 'target' })).toBe(false)
    })
})
