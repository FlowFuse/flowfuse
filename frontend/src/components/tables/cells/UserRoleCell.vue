<template>
    <div>{{ formattedRole }}</div>
</template>
<script>
import { roleLabel } from '../../../utils/roleLabels.js'
export default {
    name: 'UserRoleCell',
    props: ['role'],
    computed: {
        formattedRole () {
            return roleLabel(this.role)
        }
    }
}
</script>
