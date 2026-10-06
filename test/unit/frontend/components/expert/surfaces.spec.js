import { describe, expect, test } from 'vitest'

import { EXPERT_SURFACES, isFullPageSurface } from '../../../../../frontend/src/components/expert/surfaces.js'

describe('expert surfaces', () => {
    test('onboarding and building are full page surfaces', () => {
        expect(isFullPageSurface(EXPERT_SURFACES.ONBOARDING)).toBe(true)
        expect(isFullPageSurface(EXPERT_SURFACES.BUILDING)).toBe(true)
    })

    test('the drawer and unknown values are not', () => {
        expect(isFullPageSurface('drawer')).toBe(false)
        expect(isFullPageSurface(undefined)).toBe(false)
    })
})
