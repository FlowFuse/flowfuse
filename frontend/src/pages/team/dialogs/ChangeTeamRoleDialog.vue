<template>
    <ff-dialog ref="dialog" header="Change Role" confirm-label="Change" :disable-primary="ownerCount < 2 && isOwner" @confirm="confirm()">
        <template v-if="user" #default>
            <form class="space-y-6" @submit.prevent>
                <div class="space-y-2">
                    <template v-if="ownerCount < 2 && isOwner">
                        <p class="text-sm text-gray-500">
                            You cannot change the role for <span class="font-bold">{{ user.username }}</span> as
                            they are the only owner of the team.
                        </p>
                    </template>
                    <template v-else>
                        <p class="text-sm text-gray-500 mb-6">
                            Select a role for <span class="font-bold">{{ user.username }}</span>:
                        </p>
                        <ff-radio-group v-model="input.role" orientation="vertical" :options="roleOptions" />
                    </template>
                </div>
            </form>
        </template>
    </ff-dialog>
</template>

<script>

import teamApi from '../../../api/team.js'
import alerts from '../../../services/alerts.js'
import { Roles } from '../../../utils/roles.js'

export default {
    name: 'ChangeTeamRoleDialog',
    emits: ['role-updated'],
    data () {
        return {
            ownerCount: 0,
            team: null,
            user: null,
            input: {
                role: ''
            },
            Roles
        }
    },
    methods: {
        async confirm () {
            if (!(this.ownerCount < 2 && this.isOwner)) {
                try {
                    await teamApi.changeTeamMemberRole(this.team.id, this.user.id, this.input.role)
                    this.user.role = this.input.role
                    this.$emit('role-updated', this.user)
                    alerts.emit("User's role successfully updated", 'confirmation')
                } catch (err) {
                    console.warn(err)
                }
            }
        }
    },
    computed: {
        isOwner: function () {
            return this.user?.role === Roles.Owner
        }
    },
    setup () {
        return {
            roleOptions: [{
                label: 'Owner',
                value: Roles.Owner,
                description: 'Owners can add and remove members to the team and create applications and instances'
            }, {
                label: 'Member',
                value: Roles.Member,
                description: 'Members can access the team instances'
            }, {
                label: 'Viewer',
                value: Roles.Viewer,
                description: 'Viewers can access the team instances, but not make any changes'
            }, {
                label: 'Dashboard Only',
                value: Roles.Dashboard,
                description: 'Dashboard users can only access the dashboards or HTTP endpoints created by the Node-RED instances when FlowFuse authentication is enabled'
            }],
            show (team, user, ownerCount) {
                this.$refs.dialog.show()
                this.team = team
                this.ownerCount = ownerCount
                this.user = user
                this.input.role = user.role
            }
        }
    }
}
</script>
