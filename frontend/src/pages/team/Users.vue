<template>
    <form class="space-y-6">
        <FormHeading>Team Members</FormHeading>
        <ItemTable :items="users" :columns="columns" />
    </form>
</template>

<script>
import { mapState } from 'vuex'
import FormHeading from '@/components/FormHeading'
import ItemTable from '@/components/ItemTable'

export default {
    name: 'TeamUsers',
    data() {
        return {
            users: [],
            columns: [
                {name: 'Name', property: 'name'},
                {name: 'Role', property: 'role'}
            ]
        }
    },
    watch: {
         team: 'fetchData'
    },
    mounted() {
        this.fetchData()
    },
    methods: {
        fetchData () {
            this.users = this.team.users;
        }
    },
    props:[ "team" ],
    components: {
        ItemTable,
        FormHeading
    }
}
</script>
