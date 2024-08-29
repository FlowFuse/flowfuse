<template>
    <div class="message" :class="messageClass" @click="go(to)">
        <div class="body">
            <div class="icon ff-icon ff-icon-lg">
                <slot name="icon" />
            </div>
            <div class="text">
                <div class="header">
                    <h4 class="title"><slot name="title" /></h4>
                    <div class="counter">
                        <slot name="counter">
                            <ff-notification-pill v-if="counter" v-ff-tooltip:left="counter + ' occurrences'" :count="counter" />
                        </slot>
                    </div>
                </div>
                <div class="content">
                    <slot name="message" />
                </div>
            </div>
        </div>
        <div class="footer">
            <slot name="timestamp">
                <span v-ff-tooltip:left="tooltip"> {{ notification.createdSince }} </span>
            </slot>
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
                error: this.notification.data?.meta?.severity === 'error'
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

<style scoped lang="scss">
.messages-wrapper {
    $read: $ff-grey-400;
    $info: blue;
    $warning: $ff-yellow-600;
    $error: $ff-red-500;
    .message {
        .icon {
            min-width: 20px;
            min-height: 20px;
            max-width: fit-content;
            max-height: fit-content;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .counter {
            margin-top: 0.2rem;

            .ff-notification-pill {
                background-color: $read;
                color: white;
                padding: 2px 7px;
                border-radius: 6px;
                font-size: 0.65rem;
            }
        }

        &.unread {
            border-left: 3px solid $info;

            &.warning {
                border-left: 3px solid $warning;

                .counter .ff-notification-pill {
                    background-color: $warning;
                }
            }

            &.error {
                border-left: 3px solid $error;

                .counter .ff-notification-pill {
                    background-color: $error;
                }
            }

            .counter .ff-notification-pill {
                background-color: $info;
            }
        }
    }
}
</style>
