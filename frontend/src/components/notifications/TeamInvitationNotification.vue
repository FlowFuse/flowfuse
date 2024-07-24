<template>
    <NotificationMessage data-el="invitation-message" :to="{name: 'User Invitations'}">
        <template #icon>
            <UserAddIcon />
        </template>
        <template #title>
            Team Invitation
        </template>
        <template #message>
            You have been invited by <i>"{{ invitorName }}"</i> to join <i>"{{ teamName }}"</i>.
        </template>
        <template #timestamp>
            {{ notification.createdSince }}
        </template>
    </NotificationMessage>
</template>

<script>
import { UserAddIcon } from '@heroicons/vue/solid'

import NotificationMessageMixin from '../../mixins/NotificationMessage.js'

import NotificationMessage from './Notification.vue'

export default {
    name: 'TeamInvitationNotification',
    components: { NotificationMessage, UserAddIcon },
    mixins: [NotificationMessageMixin],
    computed: {
        invitorName () {
            return this.notification.invitor.name
        },
        teamName () {
            return this.notification.team.name
        }
    }
}
</script>

<style scoped lang="scss">

</style>
