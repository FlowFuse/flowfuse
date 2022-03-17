<template>
    <p>Unused Component!</p>
    <ItemTable :items="projects" :columns="columns" />
</template>

<script>

import ItemTable from '@/components/tables/ItemTable'

export default {
    name: 'AccountProjects',
    props: ['projects', 'projectCount'],
    data () {
        return {
            columns: [
                { name: 'Name', property: 'name', link: 'link' },
                { name: 'Updated', property: 'updatedSince' },
                { name: 'Team', property: 'teamName', link: 'teamLink' },
                { name: 'Editor', value: 'Open Editor...', external: true, link: 'url' }
            ]
        }
    },
    async created () {
    },
    components: {
        ItemTable
    }
}
</script>
