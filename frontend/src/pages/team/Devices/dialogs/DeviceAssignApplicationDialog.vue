<template>
    <ff-dialog
        ref="dialog"
        header="Add Device to Application"
        class="ff-dialog-fixed-height"
        confirm-label="Add"
        data-el="assign-device-dialog"
        @confirm="assignDeviceToApplication()"
    >
        <template #default>
            <form class="space-y-6 mt-2 mb-2">
                <p class="text-sm text-gray-500">
                    Select the Node-RED application you want to bind the device to.
                </p>
                <FormRow
                    v-model="input.application"
                    :options="options.applications"
                    :disabled="noApplications || loading.applications"
                    placeholder="Select an application"
                    data-form="application"
                >
                    Application
                </FormRow>
            </form>
        </template>
    </ff-dialog>
</template>

<script>
import { mapState } from 'vuex'

import TeamAPI from '../../../../api/team.js'
import FormRow from '../../../../components/FormRow.vue'
import alerts from '../../../../services/alerts.js'

export default {
    name: 'DeviceAssignApplicationDialog',
    components: {
        FormRow
    },
    emits: ['assignDevice'],
    setup () {
        return {
            async show (device) {
                this.$refs.dialog.show()
                this.device = device
            }
        }
    },
    data () {
        return {
            device: null,
            input: {
                application: null
            },
            options: {
                applications: null
            },
            loading: {
                applications: false
            }
        }
    },
    computed: {
        ...mapState('account', ['team']),
        Application () {
            return this.input.application
        },
        noApplications () {
            return !this.options.applications || this.options.applications?.length === 0
        }
    },
    mounted () {
        this.loadApplications()
    },
    methods: {
        loadApplications () {
            this.loading.applications = true
            TeamAPI.getTeamApplications(this.team.id).then((data) => {
                this.options.applications = data.applications.map(application => { return { value: application, label: application.name } })
                this.loading.applications = false
            }).catch((error) => {
                console.error(error)
            })
        },
        assignDeviceToApplication () {
            this.$emit('assignDevice', this.device, this.input.application.id)
            alerts.emit('Device successfully assigned to application.', 'confirmation')
        }
    }
}
</script>
