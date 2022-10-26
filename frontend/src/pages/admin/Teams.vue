<template>
    <div>
        <SectionTopMenu hero="Teams" />
        <ff-data-table
            :columns="columns"
            :rows="teams"
            :rows-selectable="true"
            @row-selected="viewTeam"
            :show-search="true"
            v-model:search="teamSearch"
            search-placeholder="Search Teams..."
            :search-fields="['name', 'id']"
            :show-load-more="!!nextCursor"
            :loading="loading"
            loading-message="Loading Teams"
            @load-more="loadItems"
            no-data-message="No Teams Found"
            data-el="teams-table"
        />
    </div>
</template>

<script>
import teamsApi from '@/api/teams'

import SectionTopMenu from '@/components/SectionTopMenu'

import TeamCell from '@/components/tables/cells/TeamCell'
import TeamTypeCell from '@/components/tables/cells/TeamTypeCell'
import { markRaw } from 'vue'

export default {
    name: 'AdminTeams',
    data () {
        return {
            teams: [],
            teamSearch: '',
            loading: false,
            nextCursor: null,
            columns: [
                { label: 'Name', class: ['w-full'], component: { is: markRaw(TeamCell) }, sortable: true },
                { label: 'Type', key: 'type', component: { is: markRaw(TeamTypeCell) }, sortable: true },
                { label: 'Members', class: ['w-54', 'text-center'], key: 'memberCount', sortable: true },
                { label: 'Projects', class: ['w-54', 'text-center'], key: 'projectCount', sortable: true }
            ]
        }
    },
    async created () {
        await this.loadItems(true)
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
        }
    },
    methods: {
        loadItems: async function (reload) {
            if (reload) {
                this.loading = true
                this.nextCursor = null
            }
            const result = await teamsApi.getTeams(this.nextCursor, 30, this.teamSearch)
            if (reload) {
                this.teams = []
            }
            this.nextCursor = result.meta.next_cursor
            result.teams.forEach(v => {
                this.teams.push(v)
            })
            this.loading = false
        },
        viewTeam (row) {
            this.$router.push({
                name: 'Team',
                params: {
                    team_slug: row.slug
                }
            })
        }
    },
    components: {
        SectionTopMenu
    }
}
</script>
