import { computed } from 'vue'

import { Permissions } from '../../../forge/lib/permissions.js'

import { Roles } from '../utils/roles.js'

import { useContextStore } from '@/stores/context.js'

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
 * @param {Object|null} context - The context in which the permission check is being made. Can be null if not applicable.
 * @throws {Error} If the provided scope is not recognized.
 * @returns {boolean} Returns true if the user has the required permission for the given scope, false otherwise.
 */
export const hasPermission = (scope, teamMembership, context) => {
    if (!Permissions[scope]) {
        throw new Error(`Unrecognised scope requested: '${scope}'`)
    }

    const permission = Permissions[scope]

    if (permission.role) {
        if (!teamMembership) {
            return false
        }
        let userRole = teamMembership.role
        // TODO: check platform feature flag 'rbacApplication'
        const application = context?.application?.id || context?.applicationId
        if (application && teamMembership.permissions?.applications?.[application] !== undefined) {
            userRole = teamMembership.permissions.applications[application]
        }
        // Useful debug to track down RBAC issues. Logs the permission being checked, the user's team role and the computed granular rbac role
        // console.warn('hasPermission', scope, teamMembership.role, userRole)
        if (userRole < permission.role) {
            return false
        }
    }
    return true
}

/**
 * Checks if a user has the required permission either at the team level or in at least
 * one application where they have an application-level role.
 *
 * Used for team-wide actions that end up in an application of the user's choosing,
 * e.g. creating an instance from the team pages.
 *
 * @param {string} scope - The specific scope for which the permission check is being made.
 * @param {Object|null} teamMembership - The user's team membership information.
 * @returns {boolean} Returns true if the user has the permission in the team or in any of their applications.
 */
export const hasPermissionInAnyApplication = (scope, teamMembership) => {
    if (hasPermission(scope, teamMembership)) {
        return true
    }
    const applications = Object.keys(teamMembership?.permissions?.applications || {})
    return applications.some(applicationId => hasPermission(scope, teamMembership, { applicationId }))
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
    const teamMembership = computed(() => useContextStore().teamMembership || { role: 0 })

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
     * @param {string} context - The context in which the permission check is being made.
     * @throws {Error} If the provided scope is not recognized.
     * @returns {boolean} Returns true if the user has the required permission for the given scope, false otherwise.
     */
    const _hasPermission = (scope, context) => hasPermission(scope, teamMembership.value, context)

    /**
     * Checks if a user has the required permission in the team or in at least one of their applications.
     *
     * @param {string} scope - The specific scope for which the permission check is being made.
     * @returns {boolean} Returns true if the user has the permission in the team or in any of their applications.
     */
    const _hasPermissionInAnyApplication = (scope) => hasPermissionInAnyApplication(scope, teamMembership.value)

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
        hasPermissionInAnyApplication: _hasPermissionInAnyApplication,
        hasAMinimumTeamRoleOf: _hasAMinimumTeamRoleOf,
        hasALowerOrEqualTeamRoleThan: _hasALowerOrEqualTeamRoleThan
    }
}
