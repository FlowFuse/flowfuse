<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Teams" />
        </template>
        <div class="ff-admin-audit">
            <div>
                <ff-data-table
                    v-model:search="teamSearch"
                    :columns="columns"
                    :rows="teams"
                    :rows-selectable="true"
                    :show-search="true"
                    search-placeholder="Search Teams..."
                    :search-fields="['name', 'id']"
                    :show-load-more="!!nextCursor"
                    :loading="loading"
                    loading-message="Loading Teams"
                    no-data-message="No Teams Found"
                    data-el="teams-table"
                    @row-selected="viewTeam"
                    @load-more="loadItems"
                />
            </div>
            <div>
                <SectionTopMenu hero="Filters" />
                <FormHeading class="mt-4">Sort:</FormHeading>
                <div data-el="sort-options">
                    <ff-dropdown v-model="filters.sortBy" class="w-full">
                        <ff-dropdown-option
                            v-for="sortOpt in sortOptions" :key="sortOpt.id"
                            :label="`${sortOpt.label}`" :value="sortOpt.id"
                        />
                    </ff-dropdown>
                </div>
                <FormHeading class="mt-4">Team Type:</FormHeading>
                <div data-el="filter-team-types" class="pl-2 space-y-2">
                    <FormRow
                        v-for="teamType in teamTypes"
                        :key="teamType.id"
                        v-model="filters.teamType[teamType.id]"
                        type="checkbox"
                    >
                        {{ teamType.name }}
                    </FormRow>
                </div>

                <template v-if="features.billing">
                    <FormHeading class="mt-4">Billing State:</FormHeading>
                    <div data-el="filter-team-types" class="pl-2 space-y-2">
                        <FormRow v-model="filters.suspended" type="checkbox">Suspended</FormRow>
                        <FormRow v-model="filters.billing.active" :disabled="filters.suspended" type="checkbox">Active</FormRow>
                        <FormRow v-model="filters.billing.trial" :disabled="filters.suspended" type="checkbox">Trial</FormRow>
                        <FormRow v-model="filters.billing.canceled" :disabled="filters.suspended" type="checkbox">Canceled</FormRow>
                        <FormRow v-model="filters.billing.unmanaged" :disabled="filters.suspended" type="checkbox">Unmanaged</FormRow>
                    </div>
                </template>
            </div>
        </div>
    </ff-page>
</template>

<script>
import { markRaw } from 'vue'
import { mapState } from 'vuex'

import teamTypesApi from '../../api/teamTypes.js'
import teamsApi from '../../api/teams.js'

import FormHeading from '../../components/FormHeading.vue'
import FormRow from '../../components/FormRow.vue'
import SectionTopMenu from '../../components/SectionTopMenu.vue'

import TeamCell from '../../components/tables/cells/TeamCell.vue'
import TeamTypeCell from '../../components/tables/cells/TeamTypeCell.vue'

export default {
    name: 'AdminTeams',
    components: {
        SectionTopMenu,
        FormHeading,
        FormRow
    },
    data () {
        const columns = [
            { label: 'Name', component: { is: markRaw(TeamCell) } },
            { label: 'Created', class: ['w-64'], key: 'createdAtFormatted' },
            { label: 'Type', key: 'type', component: { is: markRaw(TeamTypeCell) } },
            { label: 'Members', class: ['w-54', 'text-center'], key: 'memberCount' },
            { label: 'Instances', class: ['w-54', 'text-center'], key: 'instanceCount' },
            { label: 'Devices', class: ['w-54', 'text-center'], key: 'deviceCount' }
        ]
        return {
            teams: [],
            teamSearch: '',
            teamTypes: [],
            sortOptions: [
                { id: 'createdAt-desc', label: 'Newest' },
                { id: 'created-asc', label: 'Oldest' }
            ],
            filters: {
                teamType: {},
                billing: {},
                suspended: false,
                sortBy: 'createdAt-desc'
            },
            loading: false,
            nextCursor: null,
            columns
        }
    },
    computed: {
        ...mapState('account', ['features'])
    },
    watch: {
        teamSearch (v) {
            if (this.pendingSearch) {
                clearTimeout(this.pendingSearch)
            }
            if (!v) {
                this.loadItems(true)
            } else {
                this.loading = true
                this.pendingSearch = setTimeout(() => {
                    this.loadItems(true)
                }, 300)
            }
        },
        filters: {
            handler () {
                this.loading = true
                this.loadItems(true)
            },
            deep: true
        }
    },
    async created () {
        const teamTypes = (await teamTypesApi.getTeamTypes(null, null, 'all')).types
        this.teamTypes = teamTypes.map(tt => {
            return {
                order: tt.order,
                id: tt.id,
                name: tt.name,
                active: tt.active
            }
        })
        this.teamTypes.sort((A, B) => {
            if (A.active === B.active) {
                return A.order - B.order
            } else if (A.active) {
                return -1
            } else {
                return 1
            }
        })
        if (this.features.billing) {
            this.columns.push(
                { label: 'Billing', key: 'billingSummary' }
            )
        }
        await this.loadItems(true)
    },
    methods: {
        loadItems: async function (reload) {
            if (reload) {
                this.loading = true
                this.nextCursor = null
            }
            let result
            try {
                const filter = {
                    sort: this.filters.sortBy
                }
                for (const [teamType, enabled] of Object.entries(this.filters.teamType)) {
                    if (enabled) {
                        filter.teamType = filter.teamType || []
                        filter.teamType.push(teamType)
                    }
                }
                if (this.filters.suspended) {
                    filter.state = 'suspended'
                } else if (this.features.billing) {
                    // Only apply billing filter if not filtering for suspended teams
                    for (const [billingFeature, enabled] of Object.entries(this.filters.billing)) {
                        if (enabled) {
                            filter.billing = filter.billing || []
                            filter.billing.push(billingFeature)
                        }
                    }
                }
                result = await teamsApi.getTeams(this.nextCursor, 30, this.teamSearch, filter)
            } catch (err) {
                if (err.response?.status === 403) {
                    this.$router.push('/')
                    return
                }
            }
            if (reload) {
                this.teams = []
            }
            this.nextCursor = result.meta.next_cursor
            result.teams.forEach(v => {
                v.createdAtFormatted = v.createdAt.replace('T', ' ').replace(/\..*$/, '')
                if (v.billing) {
                    if (v.suspended) {
                        v.billingSummary = 'suspended'
                    } else if (v.billing.active) {
                        v.billingSummary = 'active'
                    } else if (v.billing.unmanaged) {
                        v.billingSummary = 'unmanaged'
                    } else if (v.billing.canceled) {
                        v.billingSummary = 'canceled'
                    } else if (v.billing.canceled) {
                        v.billingSummary = 'canceled'
                    } else if (v.billing.trialEnded) {
                        v.billingSummary = 'trial ended'
                    } else if (v.billing.trial) {
                        v.billingSummary = 'trial'
                    } else {
                        v.billingSummary = ''
                    }
                }
                this.teams.push(v)
            })
            this.loading = false
        },
        viewTeam (row) {
            this.$store.dispatch('account/setTeam', row.slug)
                .then(() => this.$router.push({
                    name: 'Team',
                    params: {
                        team_slug: row.slug
                    }
                }))
                .catch(e => console.warn(e))
        }
    }
}
</script>
