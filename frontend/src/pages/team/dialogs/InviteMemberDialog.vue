<template>
    <ff-dialog ref="dialog" header="Invite Team Member" confirm-label="Invite" @confirm="confirm()" :disable-primary="disableConfirm">
        <template v-slot:default>
            <form class="space-y-2" @submit.prevent>
                <template v-if="!responseErrors">
                    <p v-if="!exceedsUserLimit">Invite a user to join the team by username<span v-if="externalEnabled"> or email</span>.</p>
                    <p v-if="hasUserLimit">Your team can have a maximum of {{team.type.properties.userLimit}} members.</p>
                    <p v-if="exceedsUserLimit">You currently have {{totalMembers}} (including existing invites) so cannot invite any more.</p>
                    <div v-if="!exceedsUserLimit" class="space-y-4">
                        <FormRow id="userInfo" v-model="input.userInfo" :error="errors.userInfo" :placeholder="'username'+(externalEnabled?' or email':'')"></FormRow>
                        <ff-radio-group v-model="input.role" orientation="vertical" :options="roleOptions"></ff-radio-group>
                    </div>
                </template>
                <template v-else>
                    <ul>
                        <li class="text-sm" v-for="(value, name) in responseErrors" :key="name">
                            <span class="font-medium">{{name}}</span>: <span>{{value}}</span>
                        </li>
                    </ul>
                </template>
            </form>
        </template>
    </ff-dialog>
</template>

<script>
import { mapState } from 'vuex'
import FormRow from '@/components/FormRow'
import teamApi from '@/api/team'
import { Roles } from '@core/lib/roles'

import alerts from '@/services/alerts'

export default {
    name: 'InviteMemberDialog',
    emits: ['invitationSent'],
    components: {
        FormRow
    },
    props: ['team', 'userCount', 'inviteCount'],
    data () {
        return {
            input: {
                userInfo: '',
                role: Roles.Member
            },
            errors: {
                userInfo: null
            },
            responseErrors: null,
            Roles
        }
    },
    computed: {
        ...mapState('account', ['settings']),
        externalEnabled () {
            return this.settings.email && this.settings['team:user:invite:external']
        },
        disableConfirm () {
            return !!(this.exceedsUserLimit || this.responseErrors || !this.input.userInfo.trim() || this.errors.userInfo)
        },
        totalMembers () {
            const count = this.userCount + this.inviteCount
            return count + ' member' + (count > 1 ? 's' : '')
        },
        hasUserLimit () {
            return this.team.type.properties.userLimit > 0
        },
        exceedsUserLimit () {
            return this.hasUserLimit && (this.userCount + this.inviteCount) >= this.team.type.properties.userLimit
        }
    },
    watch: {
        'input.userInfo': function () {
            if (!this.externalEnabled) {
                if (/@/.test(this.input.userInfo)) {
                    this.errors.userInfo = 'Email invitations not available'
                } else {
                    this.errors.userInfo = null
                }
            }
        }
    },
    methods: {
        async confirm () {
            try {
                const result = await teamApi.createTeamInvitation(this.team.id, this.input.userInfo, parseInt(this.input.role))
                if (result.error) {
                    // result.error - an object of { username: error_message }
                    this.responseErrors = result.error
                    for (const [user, reason] of Object.entries(result.error)) {
                        alerts.emit(`Unable to invite ${user}: ${reason}`, 'warning')
                    }
                } else {
                    alerts.emit('Invite sent to ' + this.input.userInfo, 'confirmation')
                    this.$emit('invitationSent')
                }
            } catch (err) {
                if (err.response?.data) {
                    alerts.emit(`Unable to invite users: ${err.response.data.error}`)
                } else {
                    console.log(err)
                }
            }
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
            show () {
                this.$refs.dialog.show()
                this.responseErrors = null
                this.input.userInfo = ''
                this.errors.userInfo = null
            }
        }
    }
}
</script>
