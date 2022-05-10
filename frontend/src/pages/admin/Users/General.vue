<template>

    <form class="space-y-6">
        <FormHeading>Users
            <template v-slot:tools>
                <ff-button to="./create" size="small">
                    <template v-slot:icon-left>
                        <UserAddIcon />
                    </template>
                    New User
                </ff-button>
            </template>
        </FormHeading>
        <ItemTable :items="users" :columns="columns" />
        <div v-if="nextCursor">
            <a v-if="!loading" @click.stop="loadItems" class="forge-button-inline">Load more...</a>
        </div>
        <AdminUserEditDialog @userUpdated="userUpdated" @userDeleted="userDeleted" ref="adminUserEditDialog"/>

    </form>
</template>

<script>

import usersApi from '@/api/users'
import ItemTable from '@/components/tables/ItemTable'
import FormHeading from '@/components/FormHeading'
import { UserAddIcon } from '@heroicons/vue/outline'
import UserCell from '@/components/tables/cells/UserCell'
import { markRaw } from 'vue'

import AdminUserEditButton from './components/AdminUserEditButton'
import AdminUserEditDialog from './dialogs/AdminUserEditDialog'

export default {
    name: 'AdminUsers',
    data () {
        return {
            users: [],
            loading: false,
            nextCursor: null,
            columns: [
                { name: 'User', class: ['flex-grow'], component: { is: markRaw(UserCell) } },
                { name: 'Password Expired', class: ['w-32', 'text-center'], property: 'password_expired' },
                { name: 'Email Verified', class: ['w-32', 'text-center'], property: 'email_verified' },

                { name: 'Admin', class: ['w-32', 'text-center'], property: 'admin' },
                { name: '', class: ['w-16', 'text-center'], component: { is: markRaw(AdminUserEditButton) } }
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
        ItemTable,
        FormHeading,
        UserAddIcon,
        AdminUserEditDialog

    }
}
</script>
