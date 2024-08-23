<template>
    <div class="ff-notifications-drawer" data-el="notifications-drawer">
        <div class="header">
            <h2 class="title">Notifications</h2>
            <!--            <div class="actions">-->
            <!--                <span class="forge-badge" :class="{disabled: !canSelectAll}" @click="selectAll">select all</span>-->
            <!--                <span class="forge-badge" :class="{disabled: !canDeselectAll}" @click="deselectAll">deselect all</span>-->
            <!--                <span class="forge-badge disabled">mark as read</span>-->
            <!--                <span class="forge-badge disabled">mark as unread</span>-->
            <!--            </div>-->
        </div>
        <ul v-if="hasNotificationMessages" class="messages-wrapper" data-el="messages-wrapper">
            <li v-for="notification in notifications" :key="notification.id" data-el="message">
                <component
                    :is="notificationsComponentMap[notification.type]"
                    :notification="notification"
                    :selections="selections"
                    @selected="onSelected"
                    @deselected="onDeselected"
                />
            </li>
        </ul>
        <div v-else class="empty">
            <p>Nothing so far...</p>
        </div>
    </div>
</template>

<script>
import { markRaw } from 'vue'
import { mapGetters } from 'vuex'

import TeamInvitationAcceptedNotification from '../../notifications/invitations/Accepted.vue'
import TeamInvitationReceivedNotification from '../../notifications/invitations/Received.vue'

export default {
    name: 'NotificationsDrawer',
    data () {
        return {
            notificationsComponentMap: {
                // todo replace hardcoded value with actual notification type
                'team-invite': markRaw(TeamInvitationReceivedNotification),
                'team-invite-accepted-invitor': markRaw(TeamInvitationAcceptedNotification)
            },
            selections: []
        }
    },
    computed: {
        ...mapGetters('account', ['notifications']),
        canSelectAll () {
            return this.notifications.length !== this.selections.length
        },
        canDeselectAll () {
            return this.selections.length > 0
        },
        hasNotificationMessages () {
            return this.notifications.length > 0
        }
    },
    methods: {
        onSelected (notification) {
            this.selections.push(notification)
        },
        onDeselected (notification) {
            const index = this.selections.findIndex(n => n.id === notification.id)
            if (index > -1) {
                this.selections.splice(index, 1)
            }
        },
        selectAll () {
            this.selections = [...this.notifications]
        },
        deselectAll () {
            this.selections = []
        }
    }
}
</script>

<style scoped lang="scss">

</style>
