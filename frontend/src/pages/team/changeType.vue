<template>
    <Teleport v-if="mounted" to="#platform-sidenav">
        <SideNavigation>
            <template #options>
                <a @click="$router.back()">
                    <nav-item
                        :icon="icons.chevronLeft"
                        label="Back"
                    />
                </a>
            </template>
        </SideNavigation>
    </Teleport>
    <ff-page>
        <ff-loading v-if="loading" message="Updating Team..." />
        <div v-else class="max-w-2xl m-auto">
            <form class="space-y-6">
                <FormHeading>
                    <template v-if="isTypeChange">
                        Change your team type
                    </template>
                    <template v-else>
                        Select your team type
                    </template>
                </FormHeading>
                <!-- TeamType Type -->
                <div class="flex flex-wrap gap-1 items-stretch">
                    <ff-tile-selection v-model="input.teamTypeId" data-form="team-type">
                        <ff-tile-selection-option
                            v-for="(teamType, index) in teamTypes" :key="index"
                            :label="teamType.name" :description="teamType.description"
                            :price="billingEnabled ? teamType.billingPrice : ''"
                            :price-interval="billingEnabled ? teamType.billingInterval : ''"
                            :value="teamType.id"
                        />
                    </ff-tile-selection>
                </div>
                <template v-if="billingEnabled">
                    <div class="mb-8 text-sm text-gray-500 space-y-2">
                        <template v-if="trialMode && !trialHasEnded">
                            <p>Setting up billing will bring your free trial to an end</p>
                        </template>
                        <p v-if="isTypeChange">Your billing subscription will be updated to reflect the new costs</p>
                    </div>
                </template>
                <div class="flex gap-x-4">
                    <ff-button v-if="isTypeChange" :disabled="!formValid" data-action="change-team-type" @click="updateTeam()">
                        Change team type
                    </ff-button>
                    <ff-button v-else :disabled="!formValid" data-action="setup-team-billing" @click="setupBilling()">
                        Setup Payment Details
                    </ff-button>
                    <ff-button kind="secondary" data-action="cancel-change-team-type" @click="$router.back()">
                        Cancel
                    </ff-button>
                </div>
            </form>
        </div>
    </ff-page>
</template>

<script>
import { ChevronLeftIcon } from '@heroicons/vue/outline'
import { mapState } from 'vuex'

import billingApi from '../../api/billing.js'
import teamApi from '../../api/team.js'
import teamTypesApi from '../../api/teamTypes.js'
import FormHeading from '../../components/FormHeading.vue'

import NavItem from '../../components/NavItem.vue'
import SideNavigation from '../../components/SideNavigation.vue'
import Alerts from '../../services/alerts.js'

export default {
    name: 'ChangeTeamType',
    components: {
        FormHeading,
        SideNavigation,
        NavItem
    },
    data () {
        return {
            mounted: false,
            loading: false,
            redirecting: false,
            teamTypes: [],
            icons: {
                chevronLeft: ChevronLeftIcon
            },
            input: {
                teamTypeId: '',
                teamType: null
            }
        }
    },
    computed: {
        ...mapState('account', ['user', 'team', 'features']),
        formValid () {
            return this.input.teamTypeId && (!this.isTypeChange || this.input.teamTypeId !== this.team.type.id)
        },
        billingEnabled () {
            return this.features.billing
        },
        trialMode () {
            return this.team.billing?.trial
        },
        trialHasEnded () {
            return this.team.billing?.trialEnded
        },
        billingSetup () {
            return this.billingEnabled && this.team.billing?.active
        },
        isTypeChange () {
            return !this.billingEnabled || this.billingSetup
        }
    },
    watch: {
        'input.teamTypeId': function (v) {
            if (v) {
                this.input.teamType = this.teamTypes.find(tt => tt.id === v)
            } else {
                this.input.teamType = null
            }
        }
    },
    async created () {
        const teamTypesPromise = await teamTypesApi.getTeamTypes()

        this.teamTypes = (await teamTypesPromise).types.map(teamType => {
            if (this.isTypeChange && teamType.id === this.team.type.id) {
                teamType.name = `${teamType.name} (current)`
            }
            return teamType
        })
        this.input.teamTypeId = this.team.type.id
    },
    async mounted () {
        this.mounted = true
    },
    methods: {
        updateTeam () {
            this.loading = true

            const opts = {
                type: this.input.teamTypeId
            }
            teamApi.updateTeam(this.team.id, opts).then(async result => {
                await this.$store.dispatch('account/refreshTeams')
                await this.$store.dispatch('account/refreshTeam')
                this.$router.push({ name: 'Team', params: { team_slug: result.slug } })
            }).catch(err => {
                Alerts.emit('Unable to change team type: ' + err.response.data.error, 'warning', 15000)
            }).finally(() => {
                this.loading = false
            })
        },
        setupBilling: async function () {
            this.loading = true
            const response = await billingApi.createSubscription(this.team.id, this.input.teamTypeId)
            window.open(response.billingURL, '_self')
        }
    }
}
</script>
