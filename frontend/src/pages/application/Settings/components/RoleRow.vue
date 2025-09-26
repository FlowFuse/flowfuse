<template>
    <div class="role-row-cell">
        <div v-if="!hasAlteredRole" class="actual-role">
            <span class="font-bold">{{ hasAlteredRole ? readableAlteredRole : readableRole }}</span>
        </div>
        <RoleCompare v-else :baseRole="role" :overrideRole="contextualRole" :show-override-role="true" class="w-40" />
    </div>
</template>

<script>
import { defineComponent } from 'vue'

import RoleCompare from '../../../../components/permissions/RoleCompare.vue'
import { RoleNames } from '../../../../utils/roles.js'
export default defineComponent({
    name: 'ApplicationRoleRow',
    components: { RoleCompare },
    props: {
        role: {
            type: Number,
            required: true
        },
        permissions: {
            type: Object,
            required: true
        },
        applicationId: {
            type: String,
            required: true
        }
    },
    computed: {
        contextualRole () {
            if (!this.hasContextualRole) return null

            return this.permissions.applications[this.applicationId]
        },
        hasContextualRole () {
            return Object.prototype.hasOwnProperty.call(this.permissions, 'applications') &&
            Object.prototype.hasOwnProperty.call(this.permissions.applications, this.applicationId)
        },
        hasAlteredRole () {
            return this.hasContextualRole && this.role !== this.contextualRole
        },
        readableRole () {
            const role = RoleNames[this.role] || 'Unknown'
            return role.charAt(0).toUpperCase() + role.slice(1)
        },
        readableAlteredRole () {
            const role = RoleNames[this.contextualRole] || 'Unknown'
            return role.charAt(0).toUpperCase() + role.slice(1)
        }
    }
})
</script>

<style lang="scss">
.role-row-cell {
    display: flex;
    flex-direction: column;
    min-height: 40px;

    .actual-role {
        flex: 1;
        display: flex;
        justify-content: center;
        flex-direction: column;
    }

    .team-role {
        flex: 1;
    }
    .role {
        font-weight: bold;
    }
}
</style>
