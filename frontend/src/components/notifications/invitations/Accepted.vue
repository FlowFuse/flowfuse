<template>
    <NotificationMessage
        :notification="notification"
        :selections="selections"
        data-el="invitation-message" :to="to"
        @selected="onSelect"
        @deselected="onDeselect"
    >
        <template #icon>
            <UserAddIcon />
        </template>
        <template #title>
            Team Invitation: Accepted
        </template>
        <template #message>
            <p>
                <i>"{{ inviteeName }}"</i>
                has accepted your invitation to join
                <i>"{{ teamName }}"</i>
                as a
                <i>"{{ role }}".</i>
            </p>
        </template>
    </NotificationMessage>
</template>

<script>
import { UserAddIcon } from '@heroicons/vue/solid'

import NotificationMessageMixin from '../../../mixins/NotificationMessage.js'
import { RoleNames } from '../../../utils/roles.js'

import NotificationMessage from '../Notification.vue'

export default {
    name: 'TeamInvitationAcceptedNotification',
    components: { NotificationMessage, UserAddIcon },
    mixins: [NotificationMessageMixin],
    computed: {
        inviteeName () {
            return this.notification.data.invitee.username
        },
        teamName () {
            return this.notification.data.team.name
        },
        role () {
            return RoleNames[this.notification.data.role]
        },
        to () {
            return {
                name: 'team-members',
                params: { team_slug: this.notification.data.team.slug }
            }
        }
    }
}
</script>

<style scoped lang="scss">

</style>
