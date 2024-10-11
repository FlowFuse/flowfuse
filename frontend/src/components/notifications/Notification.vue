<template>
    <div class="message-wrapper" :class="messageClass" @click="go(to)">
        <div class="action" @click.prevent.stop>
            <ff-checkbox v-model="isSelected" data-action="select-notification" @click="toggleSelection" />
        </div>
        <div class="body">
            <div class="header">
                <div class="icon ff-icon ff-icon-lg">
                    <slot name="icon" />
                </div>
                <h4 class="title"><slot name="title" /></h4>
                <div class="counter">
                    <slot name="counter">
                        <ff-notification-pill v-if="counter" v-ff-tooltip:left="counter + ' occurrences'" :count="counter" />
                    </slot>
                </div>
            </div>
            <div class="text">
                <slot name="message" />
            </div>
            <div class="footer">
                <slot name="timestamp">
                    <span v-ff-tooltip:left="tooltip"> {{ notification.createdSince }} </span>
                </slot>
            </div>
        </div>
    </div>
</template>

<script>
import { mapActions } from 'vuex'

import userApi from '../../api/user.js'

import NotificationMessageMixin from '../../mixins/NotificationMessage.js'

export default {
    name: 'NotificationBase',
    mixins: [NotificationMessageMixin],
    props: {
        to: {
            type: Object,
            default: null
        }
    },
    computed: {
        counter () {
            if (typeof this.notification.data?.meta?.counter === 'number' && this.notification.data?.meta?.counter > 1) {
                return this.notification.data?.meta?.counter
            }
            return null
        },
        createdAt () {
            return new Date(this.notification.createdAt).toLocaleString()
        },
        tooltip () {
            if (this.counter) {
                return `First occurrence: ${this.createdAt}`
            }
            return this.createdAt
        },
        messageClass () {
            return {
                unread: !this.notification.read,
                warning: this.notification.data?.meta?.severity === 'warning',
                error: this.notification.data?.meta?.severity === 'error',
                selected: this.isSelected
            }
        }
    },
    methods: {
        ...mapActions('ux', ['closeRightDrawer']),
        go (to) {
            this.closeRightDrawer()
            this.notification.read = true
            userApi.markNotificationRead(this.notification.id)
            if (to?.url) {
                // Handle external links
                window.open(to.url, '_blank').focus()
            } else if (to?.name || to?.path) {
                this.$router.push(to)
            }
        }
    }
}
</script>
