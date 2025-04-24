<template>
    <ff-dialog
        ref="dialog"
        :header="editMode ? 'Update Provisioning Token' : 'Create Provisioning Token'"
        :confirm-label="editMode ? 'Update' : 'Create'"
        @confirm="confirm()"
        :disable-primary="!formValid"
        :closeOnConfirm="false"
    >
        <template #default>
            <p>This will generate a <code>device.yml</code> to move to your device, that will auto register with this team.</p>
            <form class="space-y-6 mt-2 mb-2">
                <FormRow data-form="token-name" v-model="input.name" :error="errors.name" :disabled="editMode">Token Name</FormRow>
                <FormRow data-form="auto-assign-type" :options="autoAssignTypes" v-model="input.autoAssignType">Auto Assign</FormRow>
                <FormRow v-if="input.autoAssignType === 'application'" :options="applications" v-model="input.application" :error="applicationError">Auto assign application</FormRow>
                <FormRow v-else-if="input.autoAssignType === 'instance'" :options="instances" v-model="input.instance" :error="instanceError">Auto assign instance</FormRow>
            </form>
        </template>
    </ff-dialog>
</template>

<script>

import teamApi from '../../../../api/team.js'

import FormRow from '../../../../components/FormRow.vue'
import alerts from '../../../../services/alerts.js'

export default {
    name: 'CreateProvisioningTokenDialog',
    components: {
        FormRow
    },
    props: ['team'],
    emits: ['token-updated', 'token-creating', 'token-created'],
    data () {
        return {
            token: null,
            applications: [],
            instances: [],
            input: {
                name: '',
                autoAssignType: '',
                application: '',
                instance: '',
                expiryAt: null
            },
            errors: {},
            autoAssignTypes: [
                { value: '', label: 'Don\'t assign' },
                { value: 'instance', label: 'Instance' },
                { value: 'application', label: 'Application' }
            ]
        }
    },
    computed: {
        editMode () {
            return !!this.token
        },
        formValid () {
            const trimmed = this.input.name.trim()
            return trimmed.length > 0 && trimmed.length < 80 && /^[a-z0-9-_ ]+$/i.test(trimmed) && this.applicationSelectionValid && this.instanceSelectionValid
        },
        applicationError () {
            if (!this.applicationSelectionValid) {
                return 'Invalid Application Selection'
            }
            return this.errors.application || ''
        },
        instanceError () {
            if (!this.instanceSelectionValid) {
                return 'Invalid Instance Selection'
            }
            return this.errors.instance || ''
        },
        applicationSelectionValid () {
            if (this.input.autoAssignType === 'application') {
                return this.input.application
            }
            return true
        },
        instanceSelectionValid () {
            if (this.input.autoAssignType === 'instance') {
                return this.input.instance
            }
            return true
        }
    },
    async mounted () {
    },
    methods: {
        confirm () {
            if (!this.instanceSelectionValid || !this.applicationSelectionValid) {
                return
            }
            const opts = {
                name: this.input.name.trim(),
                application: this.input.autoAssignType === 'application' ? this.input.application : null,
                instance: this.input.autoAssignType === 'instance' ? this.input.instance : null,
                team: this.team.id,
                expiryAt: this.input.expiryAt
            }
            if (this.editMode) {
                // Update
                teamApi.updateTeamDeviceProvisioningToken(this.team.id, this.token.id, opts).then((response) => {
                    this.$refs.dialog.close()
                    this.$emit('token-updated', response)
                    alerts.emit('Provisioning token successfully updated.', 'confirmation')
                }).catch(err => {
                    this.$emit('token-updated', null)
                    console.error(err.response.data)
                    if (err.response.data) {
                        if (/expiryAt/.test(err.response.data.error)) {
                            this.errors.expiryAt = err.response.data.error
                        } else if (/instance/.test(err.response.data.error)) {
                            this.errors.instance = err.response.data.error
                        } else if (/application/.test(err.response.data.error)) {
                            this.errors.application = err.response.data.error
                        } else {
                            alerts.emit('Failed to update provisioning token: ' + err.response.data.error, 'warning', 7500)
                        }
                    }
                })
            } else {
                this.$emit('token-creating')
                teamApi.generateTeamDeviceProvisioningToken(opts.team, opts).then((response) => {
                    this.$refs.dialog.close()
                    this.$emit('token-created', response)
                    alerts.emit('Provisioning Token successfully created.', 'confirmation')
                }).catch(err => {
                    this.$emit('token-created', null)
                    console.error(err.response.data)
                    if (err.response.data) {
                        if (/expiryAt/.test(err.response.data.error)) {
                            this.errors.expiryAt = err.response.data.error
                        } else if (/instance/.test(err.response.data.error)) {
                            this.errors.instance = err.response.data.error
                        } else if (/application/.test(err.response.data.error)) {
                            this.errors.application = err.response.data.error
                        } else if (/name/.test(err.response.data.error)) {
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
                this.input.application = ''
                this.input.autoAssignType = ''
                this.input.instance = ''
                this.token = null
                if (token) {
                    this.token = token
                    this.input.name = token.name
                    this.input.instance = token.instance
                    this.input.application = token.application
                    this.input.autoAssignType = this.input.application ? 'application' : this.input.instance ? 'instance' : ''
                }
                const result = await teamApi.getTeamInstancesList(this.team.id)
                this.instances = result?.map(d => { return { value: d.id, label: d.name } }) || []
                const applicationsResult = await teamApi.getTeamApplications(this.team.id)
                const applications = applicationsResult?.count > 0 ? applicationsResult?.applications : []
                this.applications = applications?.map(d => { return { value: d.id, label: d.name } }) || []
                this.$refs.dialog.show()
            }
        }
    }
}
</script>
