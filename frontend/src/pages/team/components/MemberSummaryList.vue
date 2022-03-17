<template>
    <ul>
        <li class="mb-2 text-xs" v-for="user in users" :key="user.id">
            <UserCell v-bind="user" />
        </li>
    </ul>
</template>

<script>

import UserCell from '@/components/tables/cells/UserCell'

export default {
    name: 'MemberSummaryList',
    props: ['users'],
    components: {
        UserCell
    }
}
</script>
