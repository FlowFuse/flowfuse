<template>
    <ff-dialog ref="dialog" header="Remove User" kind="danger" confirm-label="Remove" @confirm="confirm()" :disable-primary="disableConfirm">
        <template v-slot:default v-if="user">
            <form class="space-y-6" @submit.prevent>
                <div class="mt-2 space-y-2">
                    <template v-if="ownerCount < 2 && user.role === 'owner'">
                        <p class="text-sm text-gray-500">You cannot remove <span class="font-bold">{{user.username}}</span> as
                            they are the only owner of the team.</p>
                    </template>
                    <template v-else>
                        <p class="text-sm text-gray-500">
                            Are you sure you want to remove <span class="font-bold">{{user.username}}</span> from the team <span class="font-bold">{{team.name}}</span>?
                        </p>
                    </template>
                </div>
            </form>
        </template>
    </ff-dialog>
</template>

<script>

import alerts from '@/services/alerts'
import teamApi from '@/api/team'

export default {
    name: 'ConfirmTeamUserRemoveDialog',
    data () {
        return {
            ownerCount: 0,
            user: null,
            team: null
        }
    },
    methods: {
        async confirm () {
            if (!this.disableConfirm) {
                try {
                    await teamApi.removeTeamMember(this.team.id, this.user.id)
                    this.$emit('userRemoved', this.user)
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
