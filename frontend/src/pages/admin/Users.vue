<template>

    <form class="space-y-6">
        <FormHeading>Users
            <template v-slot:tools>
                <router-link to="./users/create" class="forge-button pl-1 pr-2"><UserAddIcon class="w-4 mx-1" /><span class="text-xs">New User</span></router-link>
            </template>
        </FormHeading>
        <ItemTable :items="users" :columns="columns" />

        <AdminUserEditDialog @userUpdated="userUpdated" ref="adminUserEditDialog"/>

    </form>
</template>

<script>

import usersApi from '@/api/users'
import ItemTable from '@/components/tables/ItemTable'
import FormHeading from '@/components/FormHeading'
import { PlusSmIcon, UserAddIcon } from '@heroicons/vue/outline'
import UserCell from '@/components/tables/cells/UserCell'
import { markRaw } from "vue"
import Breadcrumbs from '@/mixins/Breadcrumbs';

import AdminUserEditButton from './AdminUserEditButton'
import AdminUserEditDialog from './dialogs/AdminUserEditDialog'

export default {
    name: 'AdminUsers',
    mixins: [ Breadcrumbs ],
    data() {
        return {
            userCount: 0,
            users: [],
            columns: [
                {name: "User", class: ['flex-grow'], component: { is: markRaw(UserCell) } },
                {name: 'Password Expired',class: ['w-32','text-center'], property: 'password_expired'},
                {name: 'Email Verified',class: ['w-32','text-center'], property: 'email_verified'},

                {name: 'Admin',class: ['w-32','text-center'], property: 'admin'},
                {name: '', class: ['w-16','text-center'], component: { is: markRaw(AdminUserEditButton)}}
            ]
        }
    },
    async created() {
        this.setBreadcrumbs([
            {label:"Admin", to:{name:"Admin"}},
            {label:"Users"}
        ]);

        const data = await usersApi.getUsers()
        this.userCount = data.count;
        this.users = data.users;
        this.users.forEach(v => {
            v.onedit = (data) => { this.showEditUserDialog(v); }
        })
    },
    methods: {
        showEditUserDialog(user) {
            this.$refs.adminUserEditDialog.show(user);
        },
        userUpdated(user) {
            user.onedit = (data) => { this.showEditUserDialog(user); }
            for (let i=0;i<this.users.length;i++) {
                if (this.users[i].id === user.id) {
                    this.users[i] = user;
                    break
                }
            }
        }
    },
    components: {
        ItemTable,
        FormHeading,
        PlusSmIcon,
        UserAddIcon,
        AdminUserEditDialog

    }
}
</script>
