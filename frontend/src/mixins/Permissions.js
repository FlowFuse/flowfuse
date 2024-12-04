import { mapState } from 'vuex'

import usePermissions from '../composables/Permissions.js'

/**
 * @typedef {0 | 5 | 10 | 30 | 50 | 99} Role
 * Enum for roles with specific numeric values.
 */
// todo in an attempt to sunset the wide use of mixins, the permissions composable should be used instead
export default {
    computed: {
        // todo to be removed. A lot of components that use this mixin rely on the state imported here
        ...mapState('account', ['team', 'teamMembership']),
        isVisitingAdmin () {
            const { isVisitingAdmin } = usePermissions()
            return isVisitingAdmin()
        }
    },
    methods: {
        hasPermission (scope) {
            const { hasPermission } = usePermissions()
            return hasPermission(scope)
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
            const { hasAMinimumTeamRoleOf } = usePermissions()
            return hasAMinimumTeamRoleOf(role)
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
            const { hasALowerOrEqualTeamRoleThan } = usePermissions()
            return hasALowerOrEqualTeamRoleThan(role)
        }
    }
}
