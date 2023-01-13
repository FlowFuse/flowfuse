<template>
    <SectionTopMenu hero="Shared Library" help-header="FlowForge - Library" info="Shared repository to store common flows and nodes."></SectionTopMenu>
    <ff-data-table :columns="columns"></ff-data-table>
    {{ team }}
</template>

<script>
import teamApi from '@/api/team'

import SectionTopMenu from '@/components/SectionTopMenu'

export default {
    name: 'SharedLibrary',
    props: ['team', 'teamMembership'],
    data () {
        return {
            columns: [{
                key: 'name',
                label: 'Name'
            }, {
                key: 'name',
                label: 'Last Modified'
            }, {
                key: 'name',
                label: 'Modified By'
            }]
        }
    },
    methods: {
        loadLibrary () {
            teamApi.getTeamLibrary(this.team.id).then((library) => {
                console.log(library)
            })
        }
    },
    mounted () {
        this.loadLibrary()
    },
    components: {
        SectionTopMenu
    }
}
</script>
