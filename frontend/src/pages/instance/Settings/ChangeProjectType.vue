<template>
    <div class="w-full max-w-4xl" data-el="change-project">
        <ff-loading v-if="saving" message="Updating Project..." />
        <ProjectForm v-else :project="projectDetails || project" :team="team" :billingEnabled="!!features.billing" @on-submit="changeProjectDefinition" />
    </div>
</template>

<script>
import { mapState } from 'vuex'

import InstanceApi from '../../../api/instances'

import ProjectForm from '../components/ProjectForm'

import Alerts from '@/services/alerts'

export default {
    name: 'CreateProject',
    components: {
        ProjectForm
    },
    props: {
        project: {
            required: true,
            type: Object
        }
    },
    emits: ['instance-updated'],
    data () {
        return {
            saving: false,
            projectDetails: null
        }
    },
    computed: {
        ...mapState('account', ['team', 'features'])
    },
    methods: {
        changeProjectDefinition (projectDetails) {
            if (typeof projectDetails.projectType !== 'string' || projectDetails.projectType === '') {
                Alerts.emit('No project is selected. Try refreshing your browser and try again', 'warning', 3500)
                return
            }
            const changePayload = { ...projectDetails, team: this.team.id, changeProjectDefinition: true }
            this.saving = true
            InstanceApi.updateInstance(this.project.id, changePayload).then(() => {
                this.$emit('instance-updated')
                Alerts.emit('Project successfully updated.', 'confirmation')
                this.$router.push({
                    name: 'Project'
                })
            }).catch(err => {
                console.warn(err)
                Alerts.emit('Project update failed.', 'warning')
                this.projectDetails = { ...projectDetails, id: this.project.id }
            }).finally(() => {
                this.saving = false
            })
        }
    }
}
</script>
