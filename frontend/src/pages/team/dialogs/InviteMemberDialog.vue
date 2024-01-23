<template>
    <ff-dialog ref="dialog" header="Invite Team Member" confirm-label="Invite" :disable-primary="disableConfirm" @confirm="confirm()">
        <template #default>
            <form class="space-y-2" @submit.prevent>
                <template v-if="!responseErrors">
                    <p v-if="!exceedsUserLimit">Invite a user to join the team by username<span v-if="externalEnabled"> or email</span>.</p>
                    <p v-if="hasUserLimit">Your team can have a maximum of {{ team.type.properties.userLimit }} members.</p>
                    <p v-if="exceedsUserLimit">You currently have {{ totalMembers }} (including existing invites) so cannot invite any more.</p>
                    <div v-if="!exceedsUserLimit" class="space-y-4">
                        <FormRow id="userInfo" v-model="input.userInfo" :error="errors.userInfo" :placeholder="'username'+(externalEnabled?' or email':'')" />
                        <ff-radio-group v-model="input.role" orientation="vertical" :options="roleOptions" />
                    </div>
                </template>
                <template v-else>
                    <ul>
                        <li v-for="(value, name) in responseErrors" :key="name" class="text-sm">
                            <span class="font-medium">{{ name }}</span>: <span>{{ value }}</span>
                        </li>
                    </ul>
                </template>
            </form>
        </template>
    </ff-dialog>
</template>

<script>
import { mapState } from 'vuex'

import { Roles } from '../../../../../forge/lib/roles.js'
import teamApi from '../../../api/team.js'
import FormRow from '../../../components/FormRow.vue'

import alerts from '../../../services/alerts.js'

export default {
    name: 'InviteMemberDialog',
    components: {
        FormRow
    },
    props: {
        team: {
            type: Object,
            required: true
        },
        userCount: {
            type: Number,
            required: true
        },
        inviteCount: {
            type: Number,
            required: true
        }
    },
    emits: ['invitation-sent'],
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
            show () {
                this.$refs.dialog.show()
                this.responseErrors = null
                this.input.userInfo = ''
                this.errors.userInfo = null
            }
        }
    },
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
                    this.$emit('invitation-sent')
                }
            } catch (err) {
                if (err.response?.data) {
                    alerts.emit(`Unable to invite users: ${err.response.data.error}`)
                } else {
                    console.error(err)
                }
            }
        }
    }
}
</script>
