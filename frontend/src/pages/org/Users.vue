<template>
    <ItemTable :items="users" :columns="columns" />
</template>

<script>

import usersApi from '@/api/users'
import ItemTable from '@/components/ItemTable'

export default {
    name: 'OrgUsers',
    data() {
        return {
            userCount: 0,
            users: [],
            columns: [
                {name: 'Name', property: 'name'},
                {name: 'Email', property: 'email', class: ['w-64']},
                {name: 'Admin', property: 'admin'}
            ]
        }
    },
    async created() {
        const data = await usersApi.getUsers()
        this.userCount = data.count;
        this.users = data.users;
    },
    components: {
        ItemTable,
    }
}
</script>
