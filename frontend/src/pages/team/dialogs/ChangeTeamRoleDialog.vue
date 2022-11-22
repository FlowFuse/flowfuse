<template>
    <ff-dialog ref="dialog" header="Change Role" confirm-label="Change" @confirm="confirm()" :disable-primary="ownerCount < 2 && isOwner">
        <template v-slot:default v-if="user">
            <form class="space-y-6" @submit.prevent>
                <div class="space-y-2">
                    <template v-if="ownerCount < 2 && isOwner">
                        <p class="text-sm text-gray-500">You cannot change the role for <span class="font-bold">{{ user.username }}</span> as
                            they are the only owner of the team.</p>
                    </template>
                    <template v-else>
                        <p class="text-sm text-gray-500 mb-6">
                            Select a role for <span class="font-bold">{{ user.username }}</span>:
                        </p>
                        <ff-radio-group v-model="input.role" orientation="vertical" :options="roleOptions"></ff-radio-group>
                    </template>
                </div>
            </form>
        </template>
    </ff-dialog>
</template>

<script>

import alerts from '@/services/alerts'

import teamApi from '@/api/team'
import { Roles } from '@core/lib/roles'

export default {
    name: 'ChangeTeamRoleDialog',
    emits: ['roleUpdated'],
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
                    this.$emit('roleUpdated', this.user)
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
                description: 'Owners can add and remove members to the team and create projects'
            }, {
                label: 'Member',
                value: Roles.Member,
                description: 'Members can access the team projects'
            }, {
                label: 'Viewer',
                value: Roles.Viewer,
                description: 'Viewers can access the team projects, but not make any changes'
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
