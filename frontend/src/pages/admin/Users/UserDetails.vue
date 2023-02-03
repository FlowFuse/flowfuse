<template>
    <div class="flex flex-col sm:flex-row mb-8">
        <div class="flex-grow">
            <div class="text-gray-800 text-xl">
                <router-link class="ff-link font-bold" :to="{path: '/admin/users'}">Users</router-link>
                <!-- <nav-item :icon="icons.breadcrumbSeparator" label="sss"></nav-item> -->
                <ChevronRightIcon class="ff-icon" />
                <span>{{ user.username }}</span>
            </div>
        </div>
    </div>
    <div>
        <div class="mb-4">
            <FormRow v-model="user.username" type="uneditable">
                <template #default>Username</template>
            </FormRow>
            <FormRow v-model="user.name" type="uneditable">
                <template #default>Name</template>
            </FormRow>
            <FormRow v-model="user.email" type="uneditable">
                <template #default>Email</template>
            </FormRow>
            <FormRow v-model="user.createdAt" type="uneditable">
                <template #default>Created</template>
            </FormRow>
        </div>
        <FormHeading>Teams</FormHeading>
        <ff-data-table
            :columns="columns"
            :rows="teams"
            :rows-selectable="true"
            :loading="loadingTeams"
            loading-message="Loading Teams"
            no-data-message="No Teams Found"
            data-el="teams-table"
        />
    </div>
</template>

<script>

import usersApi from '@/api/users'
import { ChevronRightIcon } from '@heroicons/vue/solid'

import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'

import { mapState } from 'vuex'
import TeamCell from '@/components/tables/cells/TeamCell'
import TeamTypeCell from '@/components/tables/cells/TeamTypeCell'
import UserRoleCell from '@/components/tables/cells/UserRoleCell'
import { markRaw } from 'vue'

export default {
    name: 'AdminUserDetails',
    data () {
        return {
            user: null,
            teams: null,
            loadingTeams: false,
            loading: false,
            columns: [
                { label: 'Name', class: ['w-full'], component: { is: markRaw(TeamCell) }, sortable: true },
                { label: 'Role', component: { is: markRaw(UserRoleCell) }, sortable: true },
                { label: 'Type', key: 'type', component: { is: markRaw(TeamTypeCell) }, sortable: true },
                { label: 'Members', class: ['w-54', 'text-center'], key: 'memberCount', sortable: true },
                { label: 'Projects', class: ['w-54', 'text-center'], key: 'projectCount', sortable: true }
            ]
        }
    },
    async created () {
        return this.loadUser()
    },
    computed: {
        ...mapState('account', ['features'])
    },
    watch: {
    },
    methods: {
        async loadUser () {
            this.loading = true
            this.loadingTeams = true
            try {
                this.user = await usersApi.getUser(this.$route.params.id)
                this.loading = false
                usersApi.getUserTeams(this.$route.params.id).then((result) => {
                    this.teams = result.teams
                    console.log(this.teams)
                }).finally(() => {
                    this.loadingTeams = false
                })
            } catch (err) {
                this.$router.push({
                    name: 'PageNotFound',
                    params: { pathMatch: this.$router.currentRoute.value.path.substring(1).split('/') },
                    // preserve existing query and hash if any
                    query: this.$router.currentRoute.value.query,
                    hash: this.$router.currentRoute.value.hash
                })
            }
        }
    },
    components: {
        FormRow,
        FormHeading,
        ChevronRightIcon
    }
}
</script>
