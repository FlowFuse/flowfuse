<template>
    <ff-dialog
        v-if="isVisible"
        ref="dialog"
        :disable-primary="!isDirty"
        :close-on-confirm="false"
        header="Set a new role"
        @confirm="onConfirm"
        @cancel="onCancel"
    >
        <template #default>
            <p class="mb-4">Set a new role for {{ user.name }} in {{ application.name }}</p>
            <ff-listbox v-model="selection" :options="options" />
        </template>
    </ff-dialog>
</template>

<script>
import { defineComponent } from 'vue'
import { mapState } from 'vuex'

import teamApi from '../../../../api/team.js'
import { capitalize } from '../../../../composables/String.js'
import alerts from '../../../../services/alerts.js'
import { RoleNames } from '../../../../utils/roles.js'

export default defineComponent({
    name: 'EditApplicationPermissionsDialog',
    emits: ['user-updated'],
    data () {
        return {
            application: null,
            isVisible: false,
            original: null,
            selection: null,
            user: null
        }
    },
    computed: {
        ...mapState('account', ['team']),
        options () {
            return Object.keys(RoleNames)
                .filter(key => key.toString() !== '99')
                .map(key => {
                    return {
                        label: this.capitalize(RoleNames[key]),
                        value: key.toString()
                    }
                })
        },
        isDirty () {
            return this.selection !== this.original
        }
    },
    methods: {
        capitalize,
        show (user, application) {
            this.isVisible = true
            this.user = user
            this.application = application

            let selection = user.role.toString()
            if (Object.prototype.hasOwnProperty.call(user.permissions, 'applications') &&
                Object.prototype.hasOwnProperty.call(user.permissions.applications, application.id)) {
                selection = user.permissions.applications[application.id].toString()
            }
            this.selection = selection
            this.original = selection

            setTimeout(() => {
                this.$refs.dialog.show()
            })
        },
        onConfirm () {
            const permissions = {
                applications: {
                    ...(this.user.permissions?.applications || {}),
                    [this.application.id]: parseInt(this.selection)
                }
            }
            return teamApi.changeTeamMemberRole(this.team.id, this.user.id, null, permissions)
                .then(() => {
                    this.isVisible = false
                    this.$emit('user-updated', { ...this.user, permissions })
                    alerts.emit('Permissions updated successfully.', 'confirmation')
                })
                .catch((e) => {
                    console.warn(e)
                    alerts.emit('Something went wrong. Failed to update user permissions', 'warning')
                })
        },
        onCancel () {
            this.isVisible = false
        },
        onSubmit () {
            return false
        }
    }
})
</script>

<style scoped lang="scss">

</style>
