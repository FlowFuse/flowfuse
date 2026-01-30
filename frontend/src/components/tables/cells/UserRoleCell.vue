<template>
    <div>{{ formattedRole }}</div>
</template>
<script>
import { capitalize } from '../../../composables/String.js'
import { RoleNames, Roles } from '../../../utils/roles.js'
export default {
    name: 'UserRoleCell',
    props: ['role'],
    setup () {
        return { capitalize }
    },
    computed: {
        formattedRole () {
            return this.capitalize(this.roles[this.role])
        },
        roles () {
            return { ...RoleNames, [Roles.None]: 'No Access' }
        }
    }
}
</script>
