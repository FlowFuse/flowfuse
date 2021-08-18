<template>
    <ItemTable :items="teams" :columns="columns" />
</template>

<script>

import ItemTable from '@/components/tables/ItemTable'

export default {
    name: 'TeamsTable',
    props: ['teams', 'teamCount'],
    data() {
        return {
            columns: [
                {name: 'Name', property: 'name', link: true},
                {name: 'Projects', property: 'projects'},
                {name: 'Role', property: 'role'}
            ]
        }
    },
    components: {
        ItemTable,
    }
}
</script>
