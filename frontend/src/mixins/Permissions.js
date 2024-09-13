import { mapState } from 'vuex'

import { Permissions } from '../../../forge/lib/permissions.js'
import { RoleNames, Roles } from '../../../forge/lib/roles.js'

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
         *
         * @param {'dashboard', 'viewer', 'member', 'owner'} role
         *
         * @return Boolean
         */
        hasAMinimumTeamRoleOf (role) {
            if (this.isVisitingAdmin) {
                return true
            }

            const [roleValue] = Object.entries(RoleNames).find(([key, value]) => value === role) || []

            return this.teamMembership?.role >= roleValue
        }
    }
}
