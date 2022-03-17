<template>
    <ItemTable :items="teams" :columns="columns"/>
</template>

<script>

import ItemTable from '@/components/tables/ItemTable'
import { markRaw } from 'vue'
import TeamCell from '@/components/tables/cells/TeamCell'

export default {
    name: 'TeamsTable',
    props: ['teams', 'teamCount'],
    data () {
        return {
            columns: [
                { name: 'Name', class: ['flex-grow'], component: { is: markRaw(TeamCell) }, link: true },
                { name: 'Projects', class: ['w-32', 'text-center'], property: 'projectCount' },
                { name: 'Members', class: ['w-32', 'text-center'], property: 'memberCount' },
                { name: 'Role', class: ['w-40'], property: 'roleName' }
            ]
        }
    },
    components: {
        ItemTable
    }
}
</script>
