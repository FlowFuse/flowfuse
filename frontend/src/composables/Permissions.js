import { useStore } from 'vuex'

import { Permissions } from '../../../forge/lib/permissions.js'
import { Roles } from '../utils/roles.js'

/**
 * Fixes reactivity issue with the useStore utility but throws a warning while in dev mode
 * [Vue warn]: inject() can only be used inside setup() or functional components
 * Since teamMembership is defined outside the composable function and updated conditionally in usePermissions()
 *
 * The initialized store returns undefined upon switching teams and looses reactivity afterward. This should
 * warrant more investigations, as this usually happens when the entire store is re-written.
 *
 * @type {{role: number}}
 */
let teamMembership = { role: 0 }

/**
 * @typedef {0 | 5 | 10 | 30 | 50 | 99} Role
 * Enum for roles with specific numeric values.
 */
export default function usePermissions (store = null) {
    let state

    if (store !== null) {
        state = store.state
    } else {
        state = (useStore())?.state
    }

    if (state && state?.account?.teamMembership) {
        teamMembership = state?.account?.teamMembership
    }

    /**
         * @returns {boolean}
         */
    const isVisitingAdmin = () => {
        return teamMembership.role === Roles.Admin
    }

    /**
         *
         * @param scope
         * @returns {boolean}
         */
    const hasPermission = (scope) => {
        if (!Permissions[scope]) {
            throw new Error(`Unrecognised scope requested: '${scope}'`)
        }
        const permission = Permissions[scope]

        if (permission.role) {
            if (!teamMembership) {
                return false
            }
            if (teamMembership.role < permission.role) {
                return false
            }
        }
        return true
    }

    /**
         * Check if the user has the minimum required role.
         * @param {Role} role - The role to check against.
         * @returns {boolean} True if the user has the minimum required role, otherwise false.
         * @example
         * // Check if the user has at least the 'Member' role
         * const isMemberOrHigher = hasAMinimumTeamRoleOf(Roles.Member)
         */
    const hasAMinimumTeamRoleOf = (role) => {
        if (isVisitingAdmin()) {
            return true
        }

        return teamMembership?.role >= role
    }

    /**
         * Check if the user has a lower role than given role.
         * @param {Role} role - The role to check against.
         * @returns {boolean} True if the user has a lower role than the given one, otherwise false.
         * @example
         * // Check if the user has role lower than 'Member' role
         * const isMemberOrHigher = hasALowerTeamRoleThan(Roles.Member)
         */
    const hasALowerOrEqualTeamRoleThan = (role) => {
        if (isVisitingAdmin()) {
            return true
        }

        return role <= teamMembership?.role
    }

    return {
        isVisitingAdmin,
        hasPermission,
        hasAMinimumTeamRoleOf,
        hasALowerOrEqualTeamRoleThan
    }
}
