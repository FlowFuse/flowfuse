<template>
    <ff-dialog ref="dialog" data-el="delete-team-dialog" :header="'Delete Team: \'' + team?.name + '\''" kind="danger" :confirm-label="$t('ui.delete')" :disable-primary="!formValid" @confirm="confirm()">
        <template #default>
            <form v-if="team" class="space-y-6" @submit.prevent>
                <p>
                    <b>{{ $t('ui.areYouSureYouWantToDeleteThisTeam') }}</b>
                </p>
                <div>
                    <p>{{ $t('ui.youLlBeMissingOutOnLotsOfGreatFeaturesToHelpYouS') }}</p>
                    <ul class="mt-4 ml-2 list-disc list-inside space-y-2">
                        <li v-for="feature in enabledFeatures" :key="feature.label">
                            <b>{{ feature.label }}:</b> {{ feature.description }}
                        </li>
                    </ul>
                </div>
                <p>
                    {{ $t('ui.ifYouReAbsolutelySureYouWantToDeleteYourTeamPlea') }}
                </p>
                <p>
                    {{ $t('ui.teamName2') }} <span class="font-bold">{{ team?.name }}</span>
                </p>
                <p>
                    {{ $t('ui.pleaseTypeInTheTeamNameToConfirm') }}
                </p>
                <FormRow id="projectName" v-model="input.teamName" :placeholder="'Team Name'" data-form="team-name" />
            </form>
        </template>
    </ff-dialog>
</template>

<script>
import { mapState } from 'pinia'

import FormRow from '../../../components/FormRow.vue'

import { t } from '../../../i18n.js'

import { useAccountSettingsStore } from '@/stores/account-settings.js'

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
        ...mapState(useAccountSettingsStore, ['features', 'featuresCheck']),
        enabledFeatures () {
            // hosted instances?
            const features = {
                hostedInstances: {
                    enabled: this.featuresCheck.isHostedInstancesEnabledForTeam,
                    label: t('ui.hostedInstances'),
                    description: t('ui.noHassleHostingOfYourNodeRedInstancesWithCentral')
                },
                remoteInstances: {
                    enabled: true,
                    label: t('ui.remoteInstances'),
                    description: t('ui.deployAndDevelopFromAnywhereInTheWorldWithCentra')
                },
                snapshots: {
                    enabled: true,
                    label: t('ui.snapshots'),
                    description: t('ui.seamlessVersionControlForYourNodeRedApplications')
                },
                security: {
                    enabled: true,
                    label: t('ui.builtInSecurity'),
                    description: t('ui.feelAssuredKnowingThatFlowfuseHasYourBackWithBui')
                },
                pipelines: {
                    enabled: this.featuresCheck.isDevOpsPipelinesFeatureEnabled,
                    label: t('ui.devopsPipelines'),
                    description: t('ui.easilyManageDeploymentsBetweenDevelopmentAndProd')
                },
                library: {
                    enabled: this.featuresCheck.isSharedLibraryFeatureEnabledForTeam,
                    label: t('ui.teamLibrary'),
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
