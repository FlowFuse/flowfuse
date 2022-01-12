<template>
    <form class="space-y-6">
        <FormHeading>Teams</FormHeading>
        <ItemTable :items="teams" :columns="columns" />
        <div v-if="nextCursor">
            <a v-if="!loading" @click.stop="loadItems" class="forge-button-inline">Load more...</a>
        </div>
    </form>
</template>

<script>
import teamsApi from '@/api/teams'

import ItemTable from '@/components/tables/ItemTable'
import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'
import Breadcrumbs from '@/mixins/Breadcrumbs';

import TeamCell from '@/components/tables/cells/TeamCell'
import { markRaw } from "vue"


export default {
    name: 'AdminTeams',
    mixins: [ Breadcrumbs ],
    data() {
        return {
            teams: [],
            loading: false,
            nextCursor: null,
            columns: [
                {name: "Team", class: ['flex-grow'], component: { is: markRaw(TeamCell) }, link: true},
                {name: 'Members', class:['w-32','text-center'],property: 'memberCount'},
                {name: 'Projects', class:['w-32','text-center'],property: 'projectCount'},
            ]
        }
    },
    async created() {
        this.setBreadcrumbs([
            {label:"Admin", to:{name:"Admin"}},
            {label:"Teams"}
        ]);
        await this.loadItems()
    },
    methods: {
        loadItems: async function() {
            this.loading = true;
            const result = await teamsApi.getTeams(this.nextCursor,30)
            this.nextCursor = result.meta.next_cursor;
            result.teams.forEach(v => {
                this.teams.push(v);
            })
            this.loading = false;
        },
    },
    components: {
        FormRow,
        FormHeading,
        ItemTable
    }
}
</script>
