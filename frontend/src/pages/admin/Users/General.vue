<template>

    <form class="space-y-6">
        <!-- <ItemTable :items="users" :columns="columns" /> -->
        <ff-data-table :columns="columns" :rows="users" :show-search="true" search-placeholder="Search Users...">
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
        <div v-if="nextCursor">
            <a v-if="!loading" @click.stop="loadItems" class="forge-button-inline">Load more...</a>
        </div>
        <AdminUserEditDialog @userUpdated="userUpdated" @userDeleted="userDeleted" ref="adminUserEditDialog"/>
    </form>
</template>

<script>

import usersApi from '@/api/users'
import { UserAddIcon } from '@heroicons/vue/outline'
import UserCell from '@/components/tables/cells/UserCell'
import { markRaw } from 'vue'

import AdminUserEditDialog from './dialogs/AdminUserEditDialog'

export default {
    name: 'AdminUsers',
    data () {
        return {
            users: [],
            loading: false,
            nextCursor: null,
            columns: [
                { label: 'User', class: ['flex-grow'], component: { is: markRaw(UserCell) } },
                { label: 'Password Expired', class: ['w-32', 'text-center'], key: 'password_expired' },
                { label: 'Email Verified', class: ['w-32', 'text-center'], key: 'email_verified' },
                { label: 'Admin', class: ['w-32', 'text-center'], key: 'admin' }
            ]
        }
    },
    async created () {
        await this.loadItems()
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
        loadItems: async function () {
            this.loading = true
            const result = await usersApi.getUsers(this.nextCursor, 30)
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
