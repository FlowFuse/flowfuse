import { Permissions } from '@core/lib/permissions'

export default {
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
        }
    }
}
