<template>
    <div>{{ formatRole(role) }}</div>
</template>
<script>
import { RoleNames } from '../../../utils/roles.js'

export default {
    name: 'UserRoleCell',
    props: ['role'],
    methods: {
        formatRole: r => RoleNames[r] || 'unknown'
    }
}
</script>
