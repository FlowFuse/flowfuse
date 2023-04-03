<template>
    <div class="flex flex-col sm:flex-row mb-8">
        <div class="flex-grow">
            <div class="text-gray-800 text-xl">
                <router-link class="ff-link font-bold" :to="{path: '/admin/users'}">Users</router-link>
                <!-- <nav-item :icon="icons.breadcrumbSeparator" label="sss"></nav-item> -->
                <ChevronRightIcon class="ff-icon" />
                <span>{{user.username}}</span>
            </div>
        </div>
        <div>
            <ff-button @click="showEditUserDialog()" data-action="editUser">Edit</ff-button>
        </div>
    </div>
    <div>
        <div class="flex items-center mb-4">
            <div class="mr-3"><img :src="user.avatar" class="h-14 v-14 rounded-md"/></div>
            <div class="flex flex-col">
                <div class="text-xl font-bold">{{ user.name }}</div>
                <div class="text-l text-gray-400">{{ user.username }}</div>
            </div>
            <div class="ml-3 space-x-1">
                <span v-if="user.admin" class="forge-badge forge-status-running">admin</span>
                <span v-if="user.suspended" class="forge-badge forge-status-error">suspended</span>
            </div>
        </div>
        <div class="mb-4">
            <table class="table-fixed w-full mb-2">
                <tr class="border-b">
                    <td class="w-1/4 font-medium py-2">Email</td>
                    <td class="flex">
                        {{user.email}}
                        <div class="ml-3 space-x-1">
                            <span v-if="user.sso_enabled" class="forge-badge forge-status-safe">sso-enabled</span>
                            <span v-else-if="user.email_verified" class="forge-badge forge-status-running">verified</span>
                            <span v-else class="forge-badge forge-status-error">unverified</span>
                        </div>
                    </td>
                </tr>
                <tr class="border-b">
                    <td class="w-1/4 font-medium py-2">Registered At</td>
                    <td class="py-1">{{user.createdAt}}</td>
                </tr>
            </table>
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
    <AdminUserEditDialog @userUpdated="userUpdated" @userDeleted="userDeleted" ref="adminUserEditDialog"/>
</template>

<script>

import usersApi from '@/api/users'
import { ChevronRightIcon } from '@heroicons/vue/solid'

import FormHeading from '@/components/FormHeading'

import AdminUserEditDialog from './dialogs/AdminUserEditDialog'

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
                { label: 'Application Instances', class: ['w-54', 'text-center'], key: 'projectCount', sortable: true }
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
        },
        showEditUserDialog (user) {
            this.$refs.adminUserEditDialog.show(this.user)
        },
        userUpdated (user) {
            this.loadUser()
        },
        userDeleted (userId) {
            this.$router.push({ path: '/admin/users' })
        }
    },
    components: {
        AdminUserEditDialog,
        FormHeading,
        ChevronRightIcon
    }
}
</script>
