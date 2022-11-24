<template>
    <ff-dialog
        ref="dialog"
        header="Add Device to Project"
        class="ff-dialog-fixed-height"
        confirm-label="Add"
        @confirm="assignDevice()"
    >
        <template v-slot:default>
            <form class="space-y-6 mt-2 mb-2">
                <p class="text-sm text-gray-500">
                    Select the project to add the device to:
                </p>
                <FormRow :options="projects" v-model="input.project">Project</FormRow>
            </form>
        </template>
    </ff-dialog>
</template>

<script>
// import devicesApi from '@/api/devices'

import teamApi from '@/api/team'
import alerts from '@/services/alerts'
import FormRow from '@/components/FormRow'
export default {
    name: 'DeviceAssignProjectDialog',
    components: {
        FormRow
    },
    props: ['team'],
    data () {
        return {
            device: null,
            projects: [],
            input: {
                project: null
            }
        }
    },
    methods: {
        assignDevice () {
            this.$emit('assignDevice', this.device, this.input.project)
            alerts.emit('Device successfully assigned to project.', 'confirmation')
        }
    },
    setup () {
        return {
            async show (device) {
                this.$refs.dialog.show()
                this.device = device
                this.projects = []

                const result = await teamApi.getTeamProjects(this.team.id)
                this.projects = result.projects.map(d => { return { value: d.id, label: d.name } })
            }
        }
    }
}
</script>
