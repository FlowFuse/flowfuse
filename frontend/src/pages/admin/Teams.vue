<template>
    <div>
        <SectionTopMenu hero="Teams" />
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
</template>

<script>
import { markRaw } from 'vue'

import teamsApi from '../../api/teams.js'

import SectionTopMenu from '../../components/SectionTopMenu.vue'

import TeamCell from '../../components/tables/cells/TeamCell.vue'
import TeamTypeCell from '../../components/tables/cells/TeamTypeCell.vue'

export default {
    name: 'AdminTeams',
    components: {
        SectionTopMenu
    },
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
                { label: 'Application Instances', class: ['w-54', 'text-center'], key: 'instanceCount', sortable: true }
            ]
        }
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
    async created () {
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
                result = await teamsApi.getTeams(this.nextCursor, 30, this.teamSearch)
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
    }
}
</script>
