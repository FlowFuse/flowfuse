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
                <FormHeading>Change your team type</FormHeading>
                <!-- TeamType Type -->
                <div class="flex flex-wrap gap-1 items-stretch">
                    <ff-tile-selection v-model="input.teamTypeId">
                        <ff-tile-selection-option
                            v-for="(teamType, index) in teamTypes" :key="index"
                            :disabled="team.type.id === teamType.id"
                            :label="teamType.name" :description="teamType.description"
                            :price="billingEnabled ? teamType.billingPrice : ''"
                            :price-interval="billingEnabled ? teamType.billingInterval : ''"
                            :value="teamType.id"
                        />
                    </ff-tile-selection>
                </div>
                <template v-if="billingEnabled">
                    <div class="mb-8 text-sm text-gray-500 space-y-2">
                        <template v-if="trialMode">
                            <p><ExclamationCircleIcon class="ff-icon mr-1" /> Updating the team type will bring your free trial to an end</p>
                        </template>
                        <p>Your billing subscription will be updated to reflect the new costs</p>
                    </div>
                </template>
                <ff-button :disabled="!formValid" @click="updateTeam()">
                    Change team type
                </ff-button>
            </form>
        </div>
    </ff-page>
</template>

<script>
import { ChevronLeftIcon, ExclamationCircleIcon } from '@heroicons/vue/outline'
import { mapState } from 'vuex'

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
        NavItem,
        ExclamationCircleIcon
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
            return this.input.teamTypeId && this.input.teamTypeId !== this.team.type.id
        },
        billingEnabled () {
            return this.features.billing
        },
        trialMode () {
            return this.team.billing?.trial
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
            if (teamType.id === this.team.type.id) {
                teamType.name = `${teamType.name} (current)`
            }
            return teamType
        })
        this.input.teamTypeId = this.team.type.id
    },
    async mounted () {
        await this.checkBilling()
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
        checkBilling: async function () {
            // Team Billing
            if (this.features.billing && !this.team.billing?.active) {
                this.$router.push({
                    path: `/team/${this.team.slug}/billing`
                })
            }
        }
    }
}
</script>
