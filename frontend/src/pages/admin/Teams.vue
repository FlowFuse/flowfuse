<template>
    <form>
        <SectionTopMenu hero="Teams" />
        <ff-loading v-if="loading" message="Loading Teams..." />
        <ff-data-table v-if="!loading" :columns="columns" :rows="teams"
                       :show-search="true" search-placeholder="Search Teams..."
                       :search-fields="['name', 'id']"/>
        <div v-if="nextCursor">
            <a v-if="!loading" @click.stop="loadItems" class="forge-button-inline">Load more...</a>
        </div>
    </form>
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
        await this.loadItems()
    },
    methods: {
        loadItems: async function () {
            this.loading = true
            const result = await teamsApi.getTeams(this.nextCursor, 30)
            this.nextCursor = result.meta.next_cursor
            result.teams.forEach(v => {
                this.teams.push(v)
            })
            this.loading = false
        }
    },
    components: {
        SectionTopMenu
    }
}
</script>
