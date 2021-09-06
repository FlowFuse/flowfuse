<template>
    <form class="space-y-6">
        <FormHeading>Team Members</FormHeading>
        <ItemTable :items="users" :columns="columns" />
    </form>
</template>

<script>
import { mapState } from 'vuex'
import FormHeading from '@/components/FormHeading'
import ItemTable from '@/components/tables/ItemTable'
import Breadcrumbs from '@/mixins/Breadcrumbs';

export default {
    name: 'TeamUsers',
    mixins: [Breadcrumbs],
    created() {
        this.replaceLastBreadcrumb({ label:"Users" })
    },
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
