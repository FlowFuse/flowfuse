<template>
    <ff-dialog :open="isOpen" header="Invite Team Member" @close="close">
        <template v-slot:default>
            <form class="space-y-6" @submit.prevent>
                <div class="space-y-2">
                    <template v-if="!responseErrors">
                        <p>Invite a user to join the team.</p>
                        <FormRow id="userInfo" v-model="input.userInfo" :error="errors.userInfo" :placeholder="'username'+(externalEnabled?' or email':'')"></FormRow>
                    </template>
                    <template v-else>
                        <ul>
                            <li class="text-sm" v-for="(value, name) in responseErrors" :key="name">
                                <span class="font-medium">{{name}}</span>: <span>{{value}}</span>
                            </li>
                        </ul>
                    </template>
                </div>
            </form>
        </template>
        <template v-slot:actions>
            <ff-button kind="secondary" @click="close">Cancel</ff-button>
            <ff-button :disabled="disabledConfirm" class="ml-4" @click="confirm">Invite</ff-button>
        </template>
    </ff-dialog>
</template>

<script>
import { ref } from 'vue'
import { mapState } from 'vuex'
import FormRow from '@/components/FormRow'
import teamApi from '@/api/team'

import alerts from '@/services/alerts'

export default {
    name: 'InviteMemberDialog',
    emits: ['invitationSent'],
    components: {
        FormRow
    },
    props: ['team'],
    data () {
        return {
            input: {
                userInfo: ''
            },
            errors: {
                userInfo: null
            },
            responseErrors: null
        }
    },
    computed: {
        ...mapState('account', ['settings']),
        externalEnabled () {
            return this.settings.email && this.settings['team:user:invite:external']
        },
        disableConfirm () {
            return this.responseErrors || !this.input.userInfo.trim() || this.errors.userInfo
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
                const result = await teamApi.createTeamInvitation(this.team.id, this.input.userInfo)
                if (result.status === 'error') {
                    this.responseErrors = result.message
                    alerts.emit('Unable to invite ' + this.input.userInfo, 'warning')
                } else {
                    alerts.emit('Invite sent to ' + this.input.userInfo, 'confirmation')
                    this.$emit('invitationSent')
                    this.isOpen = false
                }
            } catch (err) {
                console.warn(err)
                this.isOpen = false
            }
        }
    },
    setup () {
        const isOpen = ref(false)
        return {
            isOpen,
            close () {
                isOpen.value = false
            },
            show () {
                this.responseErrors = null
                this.input.userInfo = ''
                this.errors.userInfo = null
                isOpen.value = true
            }
        }
    }
}
</script>
