<template>
    <div class="team-audience-picker" data-el="team-audience-picker">
        <div class="picker-filters">
            <div class="filter-group">
                <FormHeading>Team Type:</FormHeading>
                <div class="filter-options" data-el="picker-filter-team-types">
                    <FormRow
                        v-for="teamType in teamTypes"
                        :key="teamType.id"
                        v-model="filters.teamType[teamType.id]"
                        type="checkbox"
                    >
                        {{ teamType.name }}
                    </FormRow>
                </div>
            </div>
            <template v-if="features.billing">
                <div class="filter-group">
                    <FormHeading>Billing State:</FormHeading>
                    <div class="filter-options" data-el="picker-filter-billing">
                        <FormRow v-model="filters.billing.active" type="checkbox">Active</FormRow>
                        <FormRow v-model="filters.billing.trial" type="checkbox">Trial</FormRow>
                        <FormRow v-model="filters.billing.canceled" type="checkbox">Canceled</FormRow>
                        <FormRow v-model="filters.billing.unmanaged" type="checkbox">Unmanaged</FormRow>
                    </div>
                </div>
            </template>
        </div>

        <div class="picker-summary" data-el="picker-summary">
            <span class="summary-count" data-el="picker-selected-count">
                {{ selectedCount }} {{ selectedCount === 1 ? 'team' : 'teams' }} selected
                <span class="summary-matching">
                    {{ matchingCount }} {{ matchingCount === 1 ? 'team matches' : 'teams match' }} the current filter
                </span>
            </span>
            <div class="summary-actions">
                <ff-button
                    kind="secondary"
                    size="small"
                    :disabled="busy || matchingCount === 0"
                    data-action="select-all-matching"
                    @click="selectAllMatching"
                >
                    Select all {{ matchingCount }} matching
                </ff-button>
                <ff-button
                    kind="tertiary"
                    size="small"
                    :disabled="teams.length === 0"
                    data-action="select-loaded"
                    @click="selectLoaded"
                >
                    Select visible {{ teams.length }}
                </ff-button>
                <ff-button
                    kind="tertiary"
                    size="small"
                    :disabled="selectedCount === 0"
                    data-action="clear-selection"
                    @click="clearSelection"
                >
                    Clear selection
                </ff-button>
            </div>
        </div>

        <div v-if="truncated" class="picker-warning" data-el="picker-truncated">
            More teams match than can be addressed in one announcement. Only the first {{ selectedCount }} were selected.
            Narrow the filter and send in batches.
        </div>

        <ff-data-table
            v-model:search="search"
            :columns="columns"
            :rows="teams"
            :checked="checkedMap"
            :show-row-checkboxes="true"
            check-key-prop="id"
            :show-search="true"
            :server-side-search="true"
            search-placeholder="Search teams by name..."
            :show-load-more="!!nextCursor"
            :loading="loading"
            loading-message="Loading teams"
            no-data-message="No teams found"
            data-el="picker-teams-table"
            @update:checked="onCheckedUpdate"
            @load-more="loadItems(false)"
        />

        <div v-if="showChips" class="selected-teams" data-el="picker-selected-teams">
            <span
                v-for="team in selectedList"
                :key="team.id"
                class="selected-team"
                :data-el="`picker-selected-${team.id}`"
            >
                {{ team.name || team.id }}
                <XMarkIcon class="ff-icon" :data-action="`remove-team-${team.id}`" @click="deselect(team.id)" />
            </span>
        </div>
    </div>
</template>

<script>
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { mapState } from 'pinia'

import adminApi from '../../../api/admin.js'
import teamTypesApi from '../../../api/teamTypes.js'
import teamsApi from '../../../api/teams.js'

import FormHeading from '../../../components/FormHeading.vue'
import FormRow from '../../../components/FormRow.vue'
import alerts from '../../../services/alerts.js'

import { useAccountSettingsStore } from '@/stores/account-settings.js'

const PAGE_SIZE = 50
// Above this many selections a chip list stops being reviewable, so the count
// and the table checkboxes become the way to see and prune the selection.
const MAX_CHIPS = 25

/**
 * Picks an explicit set of teams out of a paginated, filterable list.
 *
 * The selection lives here rather than in the table, because it has to survive
 * paging, searching and filtering: an audience of a few hundred teams is built
 * up across several different filters.
 */
export default {
    name: 'TeamAudiencePicker',
    components: { FormHeading, FormRow, XMarkIcon },
    props: {
        /** Selected teams, as `[{ id, name }]` */
        modelValue: {
            type: Array,
            default: () => []
        }
    },
    emits: ['update:modelValue'],
    data () {
        return {
            columns: [
                { label: 'Name', key: 'name' },
                { label: 'Type', key: 'teamTypeName' },
                { label: 'Members', class: ['w-32', 'text-center'], key: 'memberCount' },
                { label: 'Instances', class: ['w-32', 'text-center'], key: 'instanceCount' }
            ],
            teams: [],
            teamTypes: [],
            search: '',
            filters: {
                teamType: {},
                billing: {}
            },
            matchingCount: 0,
            truncated: false,
            loading: false,
            busy: false,
            nextCursor: null,
            pendingSearch: null
        }
    },
    computed: {
        ...mapState(useAccountSettingsStore, ['features']),
        selectedList () {
            return this.modelValue
        },
        selectedCount () {
            return this.modelValue.length
        },
        checkedMap () {
            return this.modelValue.reduce((map, team) => {
                map[team.id] = true
                return map
            }, {})
        },
        showChips () {
            return this.selectedCount > 0 && this.selectedCount <= MAX_CHIPS
        },
        queryFilter () {
            // Suspended teams are excluded outright: they are filtered out when
            // the announcement is addressed, so offering them here would let an
            // admin build a selection that can never receive anything.
            const filter = { state: 'active' }
            const teamTypes = Object.entries(this.filters.teamType)
                .filter(([, enabled]) => enabled)
                .map(([teamType]) => teamType)
            if (teamTypes.length) {
                filter.teamType = teamTypes
            }
            if (this.features.billing) {
                const billing = Object.entries(this.filters.billing)
                    .filter(([, enabled]) => enabled)
                    .map(([state]) => state)
                if (billing.length) {
                    filter.billing = billing
                }
            }
            return filter
        }
    },
    watch: {
        search () {
            if (this.pendingSearch) {
                clearTimeout(this.pendingSearch)
            }
            this.loading = true
            this.pendingSearch = setTimeout(() => this.loadItems(true), 300)
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
        this.teamTypes = teamTypes
            .map(tt => ({ id: tt.id, name: tt.name, active: tt.active, order: tt.order }))
            .sort((a, b) => (a.active === b.active ? a.order - b.order : (a.active ? -1 : 1)))
        await this.loadItems(true)
    },
    methods: {
        async loadItems (reload) {
            if (reload) {
                this.nextCursor = null
            }
            this.loading = true
            try {
                const result = await teamsApi.getTeams(this.nextCursor, PAGE_SIZE, this.search, this.queryFilter)
                const rows = (result.teams || []).map(team => ({
                    id: team.id,
                    name: team.name,
                    teamTypeName: team.type?.name,
                    memberCount: team.memberCount,
                    instanceCount: team.instanceCount
                }))
                this.teams = reload ? rows : this.teams.concat(rows)
                this.matchingCount = result.count ?? this.teams.length
                this.nextCursor = result.meta?.next_cursor ?? null
            } catch (err) {
                alerts.emit('Unable to load teams.', 'warning')
                console.warn(err)
            } finally {
                this.loading = false
            }
        },
        onCheckedUpdate (map) {
            // The table only knows about the rows on screen, so a row it does
            // not have cannot be the reason an id disappeared from the map.
            const loadedIds = new Set(this.teams.map(team => team.id))
            const kept = this.modelValue.filter(team => map[team.id] || !loadedIds.has(team.id))
            const knownIds = new Set(kept.map(team => team.id))
            const added = this.teams
                .filter(team => map[team.id] && !knownIds.has(team.id))
                .map(team => ({ id: team.id, name: team.name }))
            if (added.length === 0 && kept.length === this.modelValue.length) {
                return
            }
            this.emitSelection(kept.concat(added))
        },
        selectLoaded () {
            const knownIds = new Set(this.modelValue.map(team => team.id))
            const added = this.teams
                .filter(team => !knownIds.has(team.id))
                .map(team => ({ id: team.id, name: team.name }))
            if (added.length) {
                this.emitSelection(this.modelValue.concat(added))
            }
        },
        async selectAllMatching () {
            this.busy = true
            try {
                const result = await adminApi.getTeamIdsForFilter(this.search, this.queryFilter)
                const namesById = new Map(this.teams.map(team => [team.id, team.name]))
                this.modelValue.forEach(team => {
                    if (team.name) {
                        namesById.set(team.id, team.name)
                    }
                })
                this.truncated = !!result.truncated
                this.emitSelection(result.ids.map(id => ({ id, name: namesById.get(id) ?? null })))
            } catch (err) {
                alerts.emit('Unable to select all matching teams.', 'warning')
                console.warn(err)
            } finally {
                this.busy = false
            }
        },
        clearSelection () {
            this.truncated = false
            this.emitSelection([])
        },
        deselect (id) {
            this.emitSelection(this.modelValue.filter(team => team.id !== id))
        },
        emitSelection (teams) {
            this.$emit('update:modelValue', teams)
        }
    }
}
</script>

<style scoped lang="scss">
.team-audience-picker {
    display: flex;
    flex-direction: column;
    gap: $ff-unit-md;

    .picker-filters {
        display: flex;
        gap: $ff-unit-xl;
        flex-wrap: wrap;

        .filter-options {
            display: flex;
            gap: $ff-unit-lg;
            flex-wrap: wrap;
            margin-top: $ff-unit-sm;
        }
    }

    .picker-summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: $ff-unit-md;
        flex-wrap: wrap;
        padding: $ff-unit-sm $ff-unit-md;
        border: 1px solid var(--ff-color-border-strong);
        background-color: var(--ff-color-bg-surface-raised);

        .summary-count {
            font-weight: 600;
            display: flex;
            flex-direction: column;

            .summary-matching {
                font-weight: 400;
                font-size: 0.85rem;
                color: var(--ff-color-text-subtle);
            }
        }

        .summary-actions {
            display: flex;
            gap: $ff-unit-sm;
            flex-wrap: wrap;
        }
    }

    .picker-warning {
        padding: $ff-unit-sm $ff-unit-md;
        border: 1px solid var(--ff-color-status-warning-border);
        background-color: var(--ff-color-status-warning-bg);
    }

    :deep(.ff-loadmore) {
        padding: $ff-unit-lg 0;
        display: flex;
        justify-content: center;
    }

    .selected-teams {
        display: flex;
        flex-wrap: wrap;
        gap: $ff-unit-sm;

        .selected-team {
            display: flex;
            align-items: center;
            gap: $ff-unit-xs;
            font-size: 0.85rem;
            padding: 2px $ff-unit-sm;
            border: 1px solid var(--ff-color-border-strong);
            background-color: var(--ff-color-bg-surface-raised);
            border-radius: 5px;

            .ff-icon {
                height: 14px;
                width: 14px;
                cursor: pointer;
            }
        }
    }
}
</style>
