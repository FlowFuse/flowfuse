<template>
    <NotificationMessage
        :notification="notification"
        :selections="selections"
        data-el="invitation-message" :to="{name: 'user-invitations'}"
        @selected="onSelect"
        @deselected="onDeselect"
    >
        <template #icon>
            <UserAddIcon />
        </template>
        <template #title>
            Team Invitation
        </template>
        <template #message>
            <p>You have been invited by <i>"{{ invitorName }}"</i> to join <i>"{{ teamName }}"</i>.</p>
        </template>
    </NotificationMessage>
</template>

<script>
import { UserAddIcon } from '@heroicons/vue/solid'

import NotificationMessageMixin from '../../../mixins/NotificationMessage.js'

import NotificationMessage from '../Notification.vue'

export default {
    name: 'TeamInvitationReceivedNotification',
    components: { NotificationMessage, UserAddIcon },
    mixins: [NotificationMessageMixin],
    computed: {
        invitorName () {
            return this.notification.data.invitor.username
        },
        teamName () {
            return this.notification.data.team.name
        }
    }
}
</script>

<style scoped lang="scss">

</style>
