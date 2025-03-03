<template>
    <ff-dialog ref="dialog" data-el="delete-team-dialog" :header="'Delete Team: \'' + team?.name + '\''" kind="danger" confirm-label="Delete" :disable-primary="!formValid" @confirm="confirm()">
        <template #default>
            <form v-if="team" class="space-y-6" @submit.prevent>
                <p>
                    <b>Are you sure you want to delete this team?</b>
                </p>
                <p>
                    You'll be missing out on lots of great features to help you scale and professionalize your Node-RED applications such as:
                    <ul class="mt-4 ml-2 list-disc list-inside space-y-2">
                        <li v-for="feature in enabledFeatures" :key="feature.label">
                            <b>{{ feature.label }}:</b> {{ feature.description }}
                        </li>
                    </ul>
                </p>
                <p>
                    If you're absolutely sure you want to delete your team, please type in the team name to confirm. Once deleted, there is no going back.
                </p>
                <p>
                    Team Name: <span class="font-bold">{{ team?.name }}</span>
                </p>
                <p>
                    Please type in the team name to confirm.
                </p>
                <FormRow id="projectName" v-model="input.teamName" :placeholder="'Team Name'" data-form="team-name" />
            </form>
        </template>
    </ff-dialog>
</template>

<script>
import { mapGetters, mapState } from 'vuex'

import FormRow from '../../../components/FormRow.vue'

export default {
    name: 'ConfirmTeamDeleteDialog',
    components: {
        FormRow
    },
    data () {
        return {
            input: {
                teamName: ''
            },
            formValid: false,
            team: null
        }
    },
    emits: ['delete-team'],
    watch: {
        'input.teamName': function () {
            this.formValid = this.team?.name === this.input.teamName
        }
    },
    computed: {
        ...mapState('account', ['features']),
        ...mapGetters('account', ['featuresCheck']),
        enabledFeatures () {
            // hosted instances?
            const features = {
                hostedInstances: {
                    enabled: this.featuresCheck.isHostedInstancesEnabledForTeam,
                    label: 'Hosted Instances',
                    description: 'No hassle hosting of your Node-RED instances, with centralized management through FlowFuse.'
                },
                remoteInstances: {
                    enabled: true,
                    label: 'Remote Instances',
                    description: 'Deploy and develop from anywhere in the world, with centralized management of your Remote Instances.'
                },
                snapshots: {
                    enabled: true,
                    label: 'Snapshots',
                    description: 'Seamless version control for your Node-RED applications'
                },
                security: {
                    enabled: true,
                    label: 'Built In Security',
                    description: 'Feel assured knowing that FlowFuse has your back, with built-in security for all of your Hosted and Remote Instances'
                },
                pipelines: {
                    enabled: this.featuresCheck.devOpsPipelinesFeatureEnabled,
                    label: 'DevOps Pipelines',
                    description: 'Easily manage deployments between development and production Instances, with one-click deployments to thousands of Node-RED Instances.'
                },
                library: {
                    enabled: this.featuresCheck.isSharedLibraryFeatureEnabledForTeam,
                    label: 'Team Library',
                    description: "Centralized management of your team's custom nodes and flows"
                }
            }
            return Object.values(features)
                .filter(feature => {
                    return feature.enabled
                })
        }
    },
    methods: {
        confirm () {
            this.$emit('delete-team')
        }
    },
    setup () {
        return {
            show (team) {
                this.team = team
                this.$refs.dialog.show()
            }
        }
    }
}
</script>
