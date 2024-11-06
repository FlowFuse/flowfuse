import { mapState } from 'vuex'

import {
    hasALowerOrEqualTeamRoleThan,
    hasAMinimumTeamRoleOf,
    hasPermission,
    isVisitingAdmin
} from '../composables/Permissions.js'

/**
 * @typedef {0 | 5 | 10 | 30 | 50 | 99} Role
 * Enum for roles with specific numeric values.
 */

/**
 * @typedef {0 | 5 | 10 | 30 | 50 | 99} Role
 * Enum for roles with specific numeric values.
 */

export default {
    computed: {
        ...mapState('account', ['team', 'teamMembership']),

        isVisitingAdmin: function () {
            return isVisitingAdmin(this.teamMembership?.role)
        }
    },
    methods: {
        hasPermission: function (scope) {
            return hasPermission(scope, this.teamMembership)
        },

        /**
         * Check if the user has the minimum required role.
         * @param {Role} role - The role to check against.
         * @returns {boolean} True if the user has the minimum required role, otherwise false.
         * @example
         * // Check if the user has at least the 'Member' role
         * const isMemberOrHigher = hasAMinimumTeamRoleOf(Roles.Member)
         */
        hasAMinimumTeamRoleOf: function (role) {
            hasAMinimumTeamRoleOf(role, this.teamMembership)
        },

        /**
         * Check if the user has a lower role than given role.
         * @param {Role} role - The role to check against.
         * @returns {boolean} True if the user has a lower role than the given one, otherwise false.
         * @example
         * // Check if the user has role lower than 'Member' role
         * const isMemberOrHigher = hasALowerTeamRoleThan(Roles.Member)
         */
        hasALowerOrEqualTeamRoleThan: function (role) {
            return hasALowerOrEqualTeamRoleThan(role, this.teamMembership)
        }
    }
}
