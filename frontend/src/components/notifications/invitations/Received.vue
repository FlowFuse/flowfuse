<template>
    <NotificationMessage
        :notification="notification"
        :selections="selections"
        data-el="invitation-message" :to="{name: 'user-invitations'}"
        @selected="onSelect"
        @deselected="onDeselect"
    >
        <template #icon>
            <UserPlusIcon />
        </template>
        <template #title>
            {{ $t('ui.teamInvitation') }}
        </template>
        <template #message>
            <p>{{ $t('ui.youHaveBeenInvitedBy') }} <i>"{{ invitorName }}"</i> {{ $t('ui.toJoin') }} <i>"{{ teamName }}"</i>.</p>
        </template>
    </NotificationMessage>
</template>

<script>
import { UserPlusIcon } from '@heroicons/vue/20/solid'

import NotificationMessageMixin from '../../../mixins/NotificationMessage.js'

import NotificationMessage from '../Notification.vue'

export default {
    name: 'TeamInvitationReceivedNotification',
    components: { NotificationMessage, UserPlusIcon },
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
