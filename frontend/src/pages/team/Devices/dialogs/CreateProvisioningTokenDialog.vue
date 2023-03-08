<template>
    <ff-dialog ref="dialog" :header="editMode ? 'Update Provisioning Token' : 'Create Provisioning Token'"
               :confirm-label="editMode ? 'Update' : 'Create'" @confirm="confirm()" :disable-primary="!formValid">
        <template v-slot:default>
            <p>This will generate a <code>device.yml</code> to move to your device, that will auto register with this team.</p>
            <form class="space-y-6 mt-2 mb-2">
                <FormRow data-form="token-name" v-model="input.name" :error="errors.name" :disabled="editMode">Token Name</FormRow>
                <FormRow :options="projects" v-model="input.project">Auto assign instance (optional)</FormRow>
            </form>
        </template>
    </ff-dialog>
</template>

<script>

import teamApi from '@/api/team'

import alerts from '@/services/alerts'

import FormRow from '@/components/FormRow'

export default {
    name: 'CreateProvisioningTokenDialog',
    components: {
        FormRow
    },
    props: ['team'],
    emits: ['tokenUpdated', 'tokenCreating', 'tokenCreated'],
    data () {
        return {
            token: null,
            projects: [],
            input: {
                name: '',
                project: '',
                expiryAt: null
            },
            errors: {}
        }
    },
    computed: {
        editMode () {
            return !!this.token
        },
        formValid () {
            const trimmed = this.input.name.trim()
            return trimmed.length > 0 && trimmed.length < 80 && /^[a-z0-9-_ ]+$/i.test(trimmed)
        }
    },
    async mounted () {
    },
    methods: {
        confirm () {
            const opts = {
                name: this.input.name.trim(),
                project: this.input.project,
                team: this.team.id,
                expiryAt: this.input.expiryAt
            }

            if (this.editMode) {
                // Update
                teamApi.updateTeamDeviceProvisioningToken(this.team.id, this.token.id, opts).then((response) => {
                    this.$emit('tokenUpdated', response)
                    alerts.emit('Device successfully updated.', 'confirmation')
                }).catch(err => {
                    this.$emit('tokenUpdated', null)
                    console.log(err.response.data)
                    if (err.response.data) {
                        if (/expiryAt/.test(err.response.data.error)) {
                            this.errors.expiryAt = err.response.data.error
                        } else if (/project/.test(err.response.data.error)) {
                            this.errors.project = err.response.data.error
                        } else {
                            alerts.emit('Failed to update provisioning token: ' + err.response.data.error, 'warning', 7500)
                        }
                    }
                })
            } else {
                this.$emit('tokenCreating')
                teamApi.generateTeamDeviceProvisioningToken(opts.team, opts).then((response) => {
                    this.$emit('tokenCreated', response)
                    alerts.emit('Provisioning Token successfully created.', 'confirmation')
                }).catch(err => {
                    this.$emit('tokenCreated', null)
                    console.log(err.response.data)
                    if (err.response.data) {
                        if (/expiryAt/.test(err.response.data.error)) {
                            this.errors.expiryAt = err.response.data.error
                        } else if (/project/.test(err.response.data.error)) {
                            this.errors.project = err.response.data.error
                        } if (/name/.test(err.response.data.error)) {
                            this.errors.name = err.response.data.error
                        } else {
                            alerts.emit('Failed to create provisioning token: ' + err.response.data.error, 'warning', 7500)
                        }
                    }
                })
            }
        }
    },
    setup () {
        return {
            async show (token) {
                this.errors = {}
                this.input.name = ''
                this.input.project = ''
                this.token = null
                if (token) {
                    this.token = token
                    this.input.name = token.name
                    this.input.project = token.project
                }
                const result = await teamApi.getTeamProjectList(this.team.id)
                this.projects = result?.map(d => { return { value: d.id, label: d.name } }) || []
                this.projects.unshift({ value: '', label: 'None' })
                this.$refs.dialog.show()
            }
        }
    }
}
</script>
