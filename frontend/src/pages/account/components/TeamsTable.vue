<template>
    <ItemTable :items="teams" :columns="columns" />
</template>

<script>

import ItemTable from '@/components/tables/ItemTable'
import { markRaw } from "vue"
import TeamCell from '@/components/tables/cells/UserCell'

export default {
    name: 'TeamsTable',
    props: ['teams', 'teamCount'],
    data() {
        return {
            columns: [
                {name: 'Name',  class:['flex-grow'], component: { is: markRaw(TeamCell) }, property: 'name', link: true},
                {name: 'Projects', class:['w-32','text-center'],property: 'projects'},
                {name: 'Role',     class:['w-40'],property: 'role'}
            ]
        }
    },
    components: {
        ItemTable,
    }
}
</script>
