<template>
    <div class="message-wrapper ff-announcement" :class="messageClass" data-el="announcement-notification">
        <div class="action">
            <ff-checkbox v-model="isSelected" data-action="select-notification" @click="toggleSelection" />
        </div>
        <div class="body">
            <div class="header">
                <div class="icon ff-icon ff-icon-lg">
                    <MegaphoneIcon />
                </div>
                <h4 class="title">{{ notification.data.title }}</h4>
            </div>
            <div class="text">
                <AnnouncementBody :data="notification.data" @engaged="markAsRead" />
            </div>
            <div class="footer">
                <span v-ff-tooltip:left="createdAt">{{ notification.createdSince }}</span>
                <span
                    v-if="!notification.read"
                    class="forge-badge"
                    data-action="mark-announcement-read"
                    @click="markAsRead"
                >
                    mark as read
                </span>
            </div>
        </div>
    </div>
</template>

<script>
import { MegaphoneIcon } from '@heroicons/vue/24/outline'

import userApi from '../../api/user.js'

import NotificationMessageMixin from '../../mixins/NotificationMessage.js'

import AnnouncementBody from './announcements/AnnouncementBody.vue'

/**
 * A platform announcement.
 *
 * Unlike the generic notification, the card itself is not a link: an
 * announcement can carry markdown links, an embedded video and its own button,
 * so a card-wide click target would swallow those interactions.
 */
export default {
    name: 'AnnouncementNotification',
    components: { AnnouncementBody, MegaphoneIcon },
    mixins: [NotificationMessageMixin],
    computed: {
        createdAt () {
            return new Date(this.notification.createdAt).toLocaleString()
        },
        messageClass () {
            return {
                unread: !this.notification.read,
                selected: this.isSelected
            }
        }
    },
    methods: {
        markAsRead () {
            if (!this.notification.read) {
                this.notification.read = true
                userApi.markNotificationRead(this.notification.id)
            }
        }
    }
}
</script>

<style lang="scss">
// The selector matches the depth of the drawer rule it overrides
// (.ff-notifications-drawer .messages-wrapper .message-wrapper).
.ff-notifications-drawer .messages-wrapper .message-wrapper.ff-announcement {
    // The card is not a single click target: the body owns its own links,
    // video and button, so the card must not look or behave like a link.
    cursor: default;

    &:hover .title {
        color: inherit;
    }

    .footer {
        align-items: center;
        gap: $ff-unit-sm;

        .forge-badge {
            background-color: var(--ff-color-bg-surface-raised);
            border-radius: 5px;
            padding: 0 $ff-unit-sm;
            cursor: pointer;

            &:hover {
                background-color: var(--ff-color-border-strong);
            }
        }
    }
}
</style>
