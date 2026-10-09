import { describe, expect, test } from 'vitest'

import { Roles } from '../../../../forge/lib/roles.js'
import { hasPermissionInAnyApplication } from '../../../../frontend/src/composables/Permissions.js'

describe('hasPermissionInAnyApplication', () => {
    test('allows a team Owner', () => {
        expect(hasPermissionInAnyApplication('project:create', { role: Roles.Owner })).toBe(true)
    })

    test('denies a team Member with no application roles', () => {
        expect(hasPermissionInAnyApplication('project:create', { role: Roles.Member })).toBe(false)
    })

    test('allows a team Member who is Owner of an application', () => {
        const teamMembership = {
            role: Roles.Member,
            permissions: { applications: { app1: Roles.Viewer, app2: Roles.Owner } }
        }
        expect(hasPermissionInAnyApplication('project:create', teamMembership)).toBe(true)
    })

    test('denies a team Member whose application roles are all below Owner', () => {
        const teamMembership = {
            role: Roles.Member,
            permissions: { applications: { app1: Roles.Viewer, app2: Roles.Member } }
        }
        expect(hasPermissionInAnyApplication('project:create', teamMembership)).toBe(false)
    })

    test('denies when there is no team membership', () => {
        expect(hasPermissionInAnyApplication('project:create', null)).toBe(false)
    })
})
