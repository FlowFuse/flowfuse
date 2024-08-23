<template>
    <div class="message" :class="{ unread: !notification.read }" @click="go(to)">
        <div class="body">
            <div class="icon ff-icon ff-icon-lg">
                <slot name="icon" />
            </div>
            <div class="text">
                <div class="header">
                    <h4 class="title"><slot name="title" /></h4>
                <!--            <ff-checkbox :model-value="isSelected" label="" @click.prevent.stop="toggleSelection" />-->
                </div>
                <div class="content">
                    <slot name="message" />
                </div>
            </div>
        </div>
        <div class="footer">
            <slot name="timestamp" />
        </div>
    </div>
</template>

<script>
import { mapActions } from 'vuex'

import userApi from '../../api/user.js'

import NotificationMessageMixin from '../../mixins/NotificationMessage.js'

export default {
    name: 'TeamInvitationNotification',
    mixins: [NotificationMessageMixin],
    props: {
        to: {
            type: Object,
            required: true
        }
    },
    methods: {
        ...mapActions('ux', ['closeRightDrawer']),
        go (to) {
            this.closeRightDrawer()
            this.notification.read = true
            userApi.markNotificationRead(this.notification.id)
            if (to.url) {
            // Handle external links
                window.open(to.url, '_blank').focus()
            } else {
                this.$router.push(to)
            }
        }
    }
}
</script>

<style scoped lang="scss">
.body.unread {
    border-left: 3px solid blue;
}

</style>
