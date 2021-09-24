<template>
    <form class="space-y-6">
        <div class="text-right"><button type="button" class="forge-button-secondary"><span>Add member</span></button></div>
        <ItemTable :items="users" :columns="columns" />
    </form>
</template>

<script>
import {shallowRef} from 'vue'
import { mapState } from 'vuex'
import FormHeading from '@/components/FormHeading'
import ItemTable from '@/components/tables/ItemTable'
import Breadcrumbs from '@/mixins/Breadcrumbs'
import UserCell from '@/components/tables/cells/UserCell'
import { markRaw } from "vue"

export default {
    name: 'TeamUsers',
    data() {
        return {
            users: [],
            columns: [
                {name: 'User', component: { is: markRaw(UserCell) }},
                {name: 'Role', property: 'role'}
            ],
            isOwner: false
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
            if (this.users) {
                const currentUser = this.users.find(user => user.username === this.$store.state.account.user.username )
                this.isOwner = currentUser && currentUser.role === 'owner';
                if (this.isOwner) {
                    this.columns.push({class: ["w-20","text-center"]})
                }
            }
        }
    },
    props:[ "team" ],
    components: {
        ItemTable,
        FormHeading
    }
}
</script>
