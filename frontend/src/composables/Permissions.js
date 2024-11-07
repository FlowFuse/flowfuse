// import { useStore } from 'vuex'

import { Permissions } from '../../../forge/lib/permissions.js'
import { Roles } from '../utils/roles.js'
/**
 * @typedef {0 | 5 | 10 | 30 | 50 | 99} Role
 * Enum for roles with specific numeric values.
 */

export default function usePermissions () {
    // todo There's a reactivity problem I can't figure out with the useStore utility and our account store when switching
    //  teams. The initialized store returns undefined upon switching teams and looses reactivity afterwards. This should
    //  warrant more investigations, as this usually happens when the entire store is re-written. The teamMembership arguments
    //  should be disposed asap

    // const store = useStore()
    // const teamMembership = store.state.account.teamMembership

    /**
     * @param teamMembership
     * @returns {boolean}
     */
    const isVisitingAdmin = (teamMembership) => {
        return teamMembership === Roles.Admin
    }

    /**
     *
     * @param scope
     * @param teamMembership
     * @returns {boolean}
     */
    const hasPermission = (scope, teamMembership) => {
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
     * @param teamMembership
     * @returns {boolean} True if the user has the minimum required role, otherwise false.
     * @example
     * // Check if the user has at least the 'Member' role
     * const isMemberOrHigher = hasAMinimumTeamRoleOf(Roles.Member)
     */
    const hasAMinimumTeamRoleOf = (role, teamMembership) => {
        if (isVisitingAdmin(teamMembership?.role)) {
            return true
        }

        return teamMembership?.role >= role
    }

    /**
     * Check if the user has a lower role than given role.
     * @param {Role} role - The role to check against.
     * @param teamMembership
     * @returns {boolean} True if the user has a lower role than the given one, otherwise false.
     * @example
     * // Check if the user has role lower than 'Member' role
     * const isMemberOrHigher = hasALowerTeamRoleThan(Roles.Member)
     */
    const hasALowerOrEqualTeamRoleThan = (role, teamMembership) => {
        if (isVisitingAdmin(teamMembership?.role)) {
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
