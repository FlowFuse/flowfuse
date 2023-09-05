<template>
    <ff-dialog ref="dialog" header="Remove User" kind="danger" confirm-label="Remove" :disable-primary="disableConfirm" @confirm="confirm()">
        <template v-if="user" #default>
            <form class="space-y-6" @submit.prevent>
                <div class="mt-2 space-y-2">
                    <template v-if="ownerCount < 2 && user.role === 'owner'">
                        <p class="text-sm text-gray-500">
                            You cannot remove <span class="font-bold">{{ user.username }}</span> as
                            they are the only owner of the team.
                        </p>
                    </template>
                    <template v-else>
                        <p class="text-sm text-gray-500">
                            Are you sure you want to remove <span class="font-bold">{{ user.username }}</span> from the team <span class="font-bold">{{ team.name }}</span>?
                        </p>
                    </template>
                </div>
            </form>
        </template>
    </ff-dialog>
</template>

<script>

import teamApi from '../../../api/team.js'
import alerts from '../../../services/alerts.js'

export default {
    name: 'ConfirmTeamUserRemoveDialog',
    data () {
        return {
            ownerCount: 0,
            user: null,
            team: null
        }
    },
    emits: ['user-removed'],
    methods: {
        async confirm () {
            if (!this.disableConfirm) {
                try {
                    await teamApi.removeTeamMember(this.team.id, this.user.id)
                    this.$emit('user-removed', this.user)
                    alerts.emit(`${this.user.username} successfully removed`, 'confirmation')
                } catch (err) {
                    console.warn(err)
                }
            }
        }
    },
    computed: {
        disableConfirm: function () {
            return this.user && this.ownerCount < 2 && this.user.role === 'owner'
        }
    },
    setup () {
        return {
            show (team, user, ownerCount) {
                this.$refs.dialog.show()
                this.user = user
                this.team = team
                this.ownerCount = ownerCount
            }
        }
    }
}
</script>
