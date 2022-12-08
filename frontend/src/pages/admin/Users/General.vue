<template>

    <div class="space-y-6">
        <ff-data-table
            :columns="columns"
            :rows="users"
            :show-search="true"
            v-model:search="userSearch"
            search-placeholder="Search Users..."
            :show-load-more="!!nextCursor"
            :loading="loading"
            loading-message="Loading Users"
            @load-more="loadItems"
            no-data-message="No Users Found"
        >
            <template v-slot:actions>
                <ff-button to="./create">
                    <template v-slot:icon-left>
                        <UserAddIcon />
                    </template>
                    Create New User
                </ff-button>
            </template>
            <template v-slot:context-menu="{row}">
                <ff-list-item label="Edit User" @click="showEditUserDialog(row)"></ff-list-item>
            </template>
        </ff-data-table>
        <AdminUserEditDialog @userUpdated="userUpdated" @userDeleted="userDeleted" ref="adminUserEditDialog"/>
    </div>
</template>

<script>

import usersApi from '@/api/users'
import { UserAddIcon } from '@heroicons/vue/outline'
import UserCell from '@/components/tables/cells/UserCell'
import { markRaw } from 'vue'

import AdminUserEditDialog from './dialogs/AdminUserEditDialog'

import { mapState } from 'vuex'

export default {
    name: 'AdminUsers',
    data () {
        return {
            users: [],
            userSearch: '',
            loading: false,
            nextCursor: null,
            columns: [
                { label: 'User', class: ['flex-grow'], key: 'name', component: { is: markRaw(UserCell) }, sortable: true },
                { label: 'Password Expired', class: ['w-56', 'text-center'], key: 'password_expired', sortable: true },
                { label: 'Email Verified', class: ['w-56', 'text-center'], key: 'email_verified', sortable: true },
                { label: 'Admin', class: ['w-32', 'text-center'], key: 'admin', sortable: true },
                { label: 'Suspended', class: ['w-32', 'text-center'], key: 'suspended', sortable: true }
            ]
        }
    },
    async created () {
        await this.loadItems(true)
        if (this.features.sso) {
            this.columns.push({
                label: 'SSO Enabled', class: ['w-32', 'text-center'], key: 'sso_enabled', sortable: true
            })
        }
    },
    computed: {
        ...mapState('account', ['features'])
    },
    watch: {
        userSearch (v) {
            if (this.pendingSearch) {
                clearTimeout(this.pendingSearch)
            }
            if (!v) {
                this.loadItems(true)
            } else {
                this.loading = true
                this.pendingSearch = setTimeout(() => {
                    this.loadItems(true)
                }, 300)
            }
        }
    },
    methods: {
        showEditUserDialog (user) {
            this.$refs.adminUserEditDialog.show(user)
        },
        userUpdated (user) {
            user.onedit = (data) => { this.showEditUserDialog(user) }
            for (let i = 0; i < this.users.length; i++) {
                if (this.users[i].id === user.id) {
                    this.users[i] = user
                    break
                }
            }
        },
        userDeleted (userId) {
            const index = this.users.findIndex(u => u.id === userId)
            if (index > -1) {
                this.users.splice(index, 1)
            }
        },
        loadItems: async function (reload) {
            if (reload) {
                this.loading = true
                this.nextCursor = null
            }
            const result = await usersApi.getUsers(this.nextCursor, 30, this.userSearch)
            if (reload) {
                this.users = []
            }
            this.nextCursor = result.meta.next_cursor
            result.users.forEach(v => {
                v.onedit = (data) => { this.showEditUserDialog(v) }
                this.users.push(v)
            })
            this.loading = false
        }
    },
    components: {
        UserAddIcon,
        AdminUserEditDialog

    }
}
</script>
