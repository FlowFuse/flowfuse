<template>
    <div>{{ formatRole(role) }}</div>
</template>
<script>
import { RoleNames } from '../../../../../forge/lib/roles'

export default {
    name: 'UserRoleCell',
    props: ['role'],
    methods: {
        formatRole: r => RoleNames[r] || 'unknown'
    }
}
</script>
