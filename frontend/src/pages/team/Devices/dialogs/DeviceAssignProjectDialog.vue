<template>
    <ff-dialog :open="isOpen" header="Add Device to Project">
        <template v-slot:default>
            <form class="space-y-6 mt-2 mb-2">
                <p class="text-sm text-gray-500">
                    Select the project to add the device to:
                </p>
                <FormRow :options="projects" v-model="input.project">Project</FormRow>
            </form>
        </template>
        <template v-slot:actions>
            <ff-button kind="secondary" @click="close()">Cancel</ff-button>
            <ff-button class="ml-4" @click="assignDevice()">Add</ff-button>
        </template>
    </ff-dialog>
</template>

<script>
// import devicesApi from '@/api/devices'

import { ref } from 'vue'
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
            this.close()
        }
    },
    setup () {
        const isOpen = ref(false)
        return {
            isOpen,
            close () {
                isOpen.value = false
            },
            async show (device) {
                this.device = device
                this.projects = []
                isOpen.value = true

                const result = await teamApi.getTeamProjects(this.team.id)
                this.projects = result.projects.map(d => { return { value: d.id, label: d.name } })
            }
        }
    }
}
</script>
