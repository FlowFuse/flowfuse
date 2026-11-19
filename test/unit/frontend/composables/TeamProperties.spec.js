import { describe, expect, test } from 'vitest'

import { getTeamProperty } from '../../../../frontend/src/composables/TeamProperties.js'

describe('getTeamProperty', () => {
    test('returns the team-level override when present', () => {
        const team = { properties: { features: { agentAutoDeploy: true } }, type: { properties: { features: { agentAutoDeploy: false } } } }
        expect(getTeamProperty(team, 'features.agentAutoDeploy', false)).toBe(true)
    })

    test('falls back to the TeamType property when the team has no override', () => {
        const team = { properties: {}, type: { properties: { features: { agentAutoDeploy: true } } } }
        expect(getTeamProperty(team, 'features.agentAutoDeploy', false)).toBe(true)
    })

    test('falls back to the default value when neither has the property', () => {
        const team = { properties: {}, type: { properties: { features: {} } } }
        expect(getTeamProperty(team, 'features.agentAutoDeploy', false)).toBe(false)
    })

    test('does not throw when the team has no type', () => {
        const team = { id: 'team-1', slug: 'my-team' }
        expect(getTeamProperty(team, 'features.agentAutoDeploy', false)).toBe(false)
    })

    test('does not throw when team is null or undefined', () => {
        expect(getTeamProperty(null, 'features.agentAutoDeploy', false)).toBe(false)
        expect(getTeamProperty(undefined, 'features.agentAutoDeploy', false)).toBe(false)
    })

    test('resolves a nested dotted path', () => {
        const team = { properties: {}, type: { properties: { trial: { runtimesLimit: 3 } } } }
        expect(getTeamProperty(team, 'trial.runtimesLimit')).toBe(3)
    })
})
