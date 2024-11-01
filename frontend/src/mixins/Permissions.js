import { mapState } from 'vuex'

import { Permissions } from '../../../forge/lib/permissions.js'
import { Roles } from '../utils/roles.js'
/**
 * @typedef {0 | 5 | 10 | 30 | 50 | 99} Role
 * Enum for roles with specific numeric values.
 */

export default {
    computed: {
        ...mapState('account', ['team', 'teamMembership']),
        isVisitingAdmin () {
            return this.teamMembership?.role === Roles.Admin
        }
    },
    methods: {
        hasPermission (scope) {
            if (!Permissions[scope]) {
                throw new Error(`Unrecognised scope requested: '${scope}'`)
            }
            const permission = Permissions[scope]
            // if (<check settings>) {
            if (permission.role) {
                if (!this.teamMembership) {
                    return false
                }
                if (this.teamMembership.role < permission.role) {
                    return false
                }
            }
            return true
        },

        /**
         * Check if the user has the minimum required role.
         * @param {Role} role - The role to check against.
         * @returns {boolean} True if the user has the minimum required role, otherwise false.
         * @example
         * // Check if the user has at least the 'Member' role
         * const isMemberOrHigher = hasAMinimumTeamRoleOf(Roles.Member)
         */
        hasAMinimumTeamRoleOf (role) {
            if (this.isVisitingAdmin) {
                return true
            }

            return this.teamMembership?.role >= role
        },

        /**
         * Check if the user has a lower role than given role.
         * @param {Role} role - The role to check against.
         * @returns {boolean} True if the user has a lower role than the given one, otherwise false.
         * @example
         * // Check if the user has role lower than 'Member' role
         * const isMemberOrHigher = hasALowerTeamRoleThan(Roles.Member)
         */
        hasALowerOrEqualTeamRoleThan (role) {
            if (this.isVisitingAdmin) {
                return true
            }

            return role <= this.teamMembership?.role
        }
    }
}
