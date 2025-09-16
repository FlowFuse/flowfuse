import { computed } from 'vue'
import { useStore } from 'vuex'

import { Permissions } from '../../../forge/lib/permissions.js'
import { Roles } from '../utils/roles.js'

/**
 * Determines if a user is visiting as an admin based on their team membership role.
 *
 * @param {Object} teamMembership - An object representing the user's team membership details.
 * @param {string} teamMembership.role - The role assigned to the user within the team.
 * @returns {boolean} True if the user has an admin role, otherwise false.
 */
export const isVisitingAdmin = (teamMembership) => {
    return teamMembership.role === Roles.Admin
}

/**
 * Checks if a user has the required permission for a specific scope based on their team membership.
 *
 * @param {string} scope - The specific scope for which the permission check is being made.
 * @param {Object|null} teamMembership - The user's team membership information, typically containing role details. Can be null if the user does not have team membership.
 * @throws {Error} If the provided scope is not recognized.
 * @returns {boolean} Returns true if the user has the required permission for the given scope, false otherwise.
 */
export const hasPermission = (scope, teamMembership) => {
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
export const hasAMinimumTeamRoleOf = (role, teamMembership) => {
    if (isVisitingAdmin(teamMembership)) {
        return true
    }

    return teamMembership?.role >= role
}

/**
 * Check if the user has a lower role than a given role.
 * @param {Role} role - The role to check against.
 * @param teamMembership
 * @returns {boolean} True if the user has a lower role than the given one, otherwise false.
 * @example
 // Check if the user has role lower than 'Member' role
 * const isMemberOrHigher = hasALowerTeamRoleThan(Roles.Member)
 */
export const hasALowerOrEqualTeamRoleThan = (role, teamMembership) => {
    if (isVisitingAdmin(teamMembership)) {
        return true
    }

    return role <= teamMembership?.role
}

/**
 * @typedef {0 | 5 | 10 | 30 | 50 | 99} Role
 * Enum for roles with specific numeric values.
 */
export default function usePermissions () {
    const store = useStore()

    const teamMembership = computed(() => store?.state?.account?.teamMembership || { role: 0 })

    /**
     * Determines if a user is visiting as an admin based on their team membership role.
     *
     * @returns {boolean} True if the user has an admin role, otherwise false.
     */
    const _isVisitingAdmin = computed(() => isVisitingAdmin(teamMembership.value))

    /**
     * Checks if a user has the required permission for a specific scope based on their team membership.
     *
     * @param {string} scope - The specific scope for which the permission check is being made.
     * @throws {Error} If the provided scope is not recognized.
     * @returns {boolean} Returns true if the user has the required permission for the given scope, false otherwise.
     */
    const _hasPermission = (scope) => hasPermission(scope, teamMembership.value)

    /**
     * Check if the user has the minimum required role.
     * @param {Role} role - The role to check against.
     * @returns {boolean} True if the user has the minimum required role, otherwise false.
     * @example
     * // Check if the user has at least the 'Member' role
     * const isMemberOrHigher = hasAMinimumTeamRoleOf(Roles.Member)
     */
    const _hasAMinimumTeamRoleOf = (role) => hasAMinimumTeamRoleOf(role, teamMembership.value)

    /**
     * Check if the user has a lower role than a given role.
     * @param {Role} role - The role to check against.
     * @returns {boolean} True if the user has a lower role than the given one, otherwise false.
     * @example
     // Check if the user has role lower than 'Member' role
     * const isMemberOrHigher = hasALowerTeamRoleThan(Roles.Member)
     */
    const _hasALowerOrEqualTeamRoleThan = (role) => hasALowerOrEqualTeamRoleThan(role, teamMembership.value)

    return {
        isVisitingAdmin: _isVisitingAdmin,
        hasPermission: _hasPermission,
        hasAMinimumTeamRoleOf: _hasAMinimumTeamRoleOf,
        hasALowerOrEqualTeamRoleThan: _hasALowerOrEqualTeamRoleThan
    }
}
