<template>
    <div class="ff-notifications-drawer" data-el="notifications-drawer">
        <div class="header">
            <div class="flex">
                <h2 class="title flex-grow">Notifications</h2>
                <ff-checkbox v-model="hideReadNotifications" class=" mt-2 mr-4" data-action="show-read-check">
                    Hide Read
                </ff-checkbox>
            </div>

            <!--            <div class="actions">-->
            <!--                <span class="forge-badge" :class="{disabled: !canSelectAll}" @click="selectAll">select all</span>-->
            <!--                <span class="forge-badge" :class="{disabled: !canDeselectAll}" @click="deselectAll">deselect all</span>-->
            <!--                <span class="forge-badge disabled">mark as read</span>-->
            <!--                <span class="forge-badge disabled">mark as unread</span>-->
            <!--            </div>-->
        </div>
        <ul v-if="hasNotificationMessages" class="messages-wrapper" data-el="messages-wrapper">
            <li v-for="notification in filteredNotifications" :key="notification.id" data-el="message">
                <component
                    :is="getNotificationsComponent(notification)"
                    :notification="notification"
                    :selections="selections"
                    @selected="onSelected"
                    @deselected="onDeselected"
                />
            </li>
        </ul>
        <div v-else-if="hideReadNotifications" class="empty">
            <p>No unread notifications...</p>
        </div>
        <div v-else class="empty">
            <p>No notifications...</p>
        </div>
    </div>
</template>

<script>
import { markRaw } from 'vue'
import { mapGetters } from 'vuex'

import GenericNotification from '../../notifications/Generic.vue'
import TeamInvitationAcceptedNotification from '../../notifications/invitations/Accepted.vue'
import TeamInvitationReceivedNotification from '../../notifications/invitations/Received.vue'

export default {
    name: 'NotificationsDrawer',
    data () {
        return {
            componentCache: {},
            selections: [],
            hideReadNotifications: true
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
            return this.filteredNotifications.length > 0
        },
        filteredNotifications () {
            return this.hideReadNotifications ? this.notifications.filter(n => !n.read) : this.notifications
        }
    },
    methods: {
        getNotificationsComponent (notification) {
            let comp = this.componentCache[notification.type]
            if (comp) {
                return comp
            }
            // return specific notification component based on type
            switch (notification.type) {
            case 'team-invite':
                comp = markRaw(TeamInvitationReceivedNotification)
                break
            case 'team-invite-accepted-invitor':
                comp = markRaw(TeamInvitationAcceptedNotification)
                break
            default:
                // default to generic notification
                comp = markRaw(GenericNotification)
                break
            }
            this.componentCache[notification.type] = comp
            return comp
        },
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
