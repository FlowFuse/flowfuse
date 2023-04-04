<template>
    <ff-dialog
        ref="dialog"
        header="Add Device to Instance"
        class="ff-dialog-fixed-height"
        confirm-label="Add"
        data-el="assign-device-dialog"
        @confirm="assignDevice()"
    >
        <template #default>
            <form class="space-y-6 mt-2 mb-2">
                <p class="text-sm text-gray-500">
                    Select the Node-RED instance you want to bind the device to.
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
                <FormRow
                    v-model="input.instance"
                    :options="options.instances"
                    :disabled="noInstances || loading.instances"
                    :placeholder="instancePlaceholder"
                    data-form="instance"
                >
                    Node-RED Instance
                </FormRow>
            </form>
        </template>
    </ff-dialog>
</template>

<script>
import { mapState } from 'vuex'

import ApplicationAPI from '../../../../api/application.js'
import TeamAPI from '../../../../api/team.js'

import FormRow from '../../../../components/FormRow.vue'
import alerts from '../../../../services/alerts.js'

export default {
    name: 'DeviceAssignInstanceDialog',
    components: {
        FormRow
    },
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
            loading: {
                applications: false,
                instances: false
            },
            options: {
                applications: null,
                instances: null
            },
            input: {
                application: null,
                instance: null
            }
        }
    },
    computed: {
        ...mapState('account', ['team']),
        noInstances () {
            return !this.options.instances || this.options.instances?.length === 0
        },
        noApplications () {
            return !this.options.applications || this.options.applications?.length === 0
        },
        instancePlaceholder () {
            return !this.input.application ? 'Select an application first' : 'Select an instance'
        }
    },
    watch: {
        'input.application': function () {
            this.input.instance = null
            this.loadInstances(this.input.application)
        }
    },
    mounted () {
        this.loadApplications()
    },
    methods: {
        assignDevice () {
            this.$emit('assignDevice', this.device, this.input.instance)
            alerts.emit('Device successfully assigned to instance.', 'confirmation')
        },
        loadApplications () {
            this.loading.applications = true
            TeamAPI.getTeamApplications(this.team.id).then((data) => {
                this.options.applications = data.applications.map(a => { return { value: a.id, label: a.name } })
                this.loading.applications = false
            }).catch((error) => {
                console.error(error)
            })
        },
        loadInstances (applicationId) {
            this.loading.instances = true
            ApplicationAPI.getApplicationInstances(applicationId).then((instances) => {
                this.options.instances = instances?.map(d => { return { value: d.id, label: d.name } }) ?? []
                this.loading.instances = false
            }).catch((error) => {
                console.error(error)
            })
        }
    }
}
</script>
