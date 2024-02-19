<template>
    <div class="space-y-6">
        <ff-data-table
            v-model:search="userSearch"
            :columns="columns"
            :rows="users"
            :show-search="true"
            search-placeholder="Search Users..."
            :show-load-more="!!nextCursor"
            :loading="loading"
            loading-message="Loading Users"
            no-data-message="No Users Found"
            :rows-selectable="true"
            @load-more="loadItems" @row-selected="showUser"
        >
            <template #actions>
                <ff-button to="./create">
                    <template #icon-left>
                        <UserAddIcon />
                    </template>
                    Create New User
                </ff-button>
            </template>
            <template #context-menu="{row}">
                <ff-list-item label="Edit User" @click.stop="showEditUserDialog(row)" />
            </template>
        </ff-data-table>
        <AdminUserEditDialog ref="adminUserEditDialog" @user-updated="userUpdated" @user-deleted="userDeleted" />
    </div>
</template>

<script>

import { UserAddIcon } from '@heroicons/vue/outline'

import { markRaw } from 'vue'

import { mapState } from 'vuex'

import usersApi from '../../../api/users.js'
import UserCell from '../../../components/tables/cells/UserCell.vue'

import AdminUserEditDialog from './dialogs/AdminUserEditDialog.vue'

export default {
    name: 'AdminUsers',
    components: {
        UserAddIcon,
        AdminUserEditDialog
    },
    data () {
        return {
            users: [],
            userSearch: '',
            loading: false,
            nextCursor: null,
            columns: [
                { label: 'User', class: ['flex-grow'], key: 'name', component: { is: markRaw(UserCell) }, sortable: true },
                { label: 'Password Expired', class: ['w-32', 'text-center'], key: 'password_expired', sortable: true },
                { label: 'Email Verified', class: ['w-32', 'text-center'], key: 'email_verified', sortable: true },
                { label: 'SSO', class: ['w-32', 'text-center'], key: 'sso_enabled', sortable: true },
                { label: 'MFA', class: ['w-32', 'text-center'], key: 'mfa_enabled', sortable: true },
                { label: 'Admin', class: ['w-32', 'text-center'], key: 'admin', sortable: true },
                { label: 'Suspended', class: ['w-32', 'text-center'], key: 'suspended', sortable: true }
            ]
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
    async created () {
        await this.loadItems(true)
        if (this.features.sso) {
            this.columns.push({
                label: 'SSO Enabled', class: ['w-32', 'text-center'], key: 'sso_enabled', sortable: true
            })
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
            let result
            try {
                result = await usersApi.getUsers(this.nextCursor, 30, this.userSearch)
            } catch (err) {
                if (err.response?.status === 403) {
                    this.$router.push('/')
                    return
                }
            }
            if (reload) {
                this.users = []
            }
            this.nextCursor = result.meta.next_cursor
            result.users.forEach(v => {
                v.onedit = (data) => { this.showEditUserDialog(v) }
                this.users.push(v)
            })
            this.loading = false
        },
        showUser (user) {
            this.$router.push({
                name: 'Admin User Details',
                params: { id: user.id }
            })
        }
    }
}
</script>
