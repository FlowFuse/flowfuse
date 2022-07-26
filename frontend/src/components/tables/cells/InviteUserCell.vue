<template>
    <UserCell v-if="!invitee.external" :avatar="invitee.avatar" :name="invitee.name" :username="invitee.username" />
    <template v-else>
        <div class="flex align-center">
            <div class="flex flex-col justify-center"><UserCircleIcon class="text-gray-300 w-6 mr-3  inline"/></div>
            <div class="inline-flex flex-col">
                <div class="text-gray-500">{{ invitee.email }}</div>
            </div>
        </div>
    </template>
</template>
<script>
import UserCell from './UserCell'
import { UserCircleIcon } from '@heroicons/vue/solid'

export default {
    name: 'InviteUserCell',
    props: ['invitee'],
    components: {
        UserCell,
        UserCircleIcon
    }
}
</script>
