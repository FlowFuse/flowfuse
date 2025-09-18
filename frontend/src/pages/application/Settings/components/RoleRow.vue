<template>
    <div class="role-row-cell">
        <div class="actual-role">
            <h4 class="font-bold">{{ hasAlteredRole ? readableAlteredRole : readableRole }}</h4>
        </div>
        <div v-if="hasAlteredRole" class="team-tole text-gray-500 italic flex gap-1">
            <span>Team Role:</span>
            <span>{{ readableRole }}</span>
        </div>
    </div>
</template>

<script>
import { defineComponent } from 'vue'

import { RoleNames } from '../../../../utils/roles.js'
export default defineComponent({
    name: 'ApplicationRoleRow',
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

<style scoped lang="scss">
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

    .team-tole {
        flex: 1;

    }
}
</style>
