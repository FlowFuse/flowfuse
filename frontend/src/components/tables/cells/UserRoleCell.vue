<template>
    <div>{{ formattedRole }}</div>
</template>
<script>
import { capitalize } from '../../../composables/String.js'
import { RoleNames } from '../../../utils/roles.js'
export default {
    name: 'UserRoleCell',
    props: ['role'],
    setup () {
        return { capitalize }
    },
    computed: {
        formattedRole () {
            return this.capitalize(this.formatRole(this.role))
        }
    },
    methods: {
        formatRole: r => RoleNames[r] || 'unknown'
    }
}
</script>
