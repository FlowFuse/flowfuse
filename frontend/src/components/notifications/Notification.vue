<template>
    <div class="message" @click="go(to)">
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
    computed: {
        invitorName () {
            return this.notification.invitor.name
        },
        teamName () {
            return this.notification.team.name
        }
    },
    methods: {
        ...mapActions('ux', ['closeRightDrawer']),
        go (to) {
            this.closeRightDrawer()
            this.$router.push(to)
        }
    }
}
</script>

<style scoped lang="scss">

</style>
