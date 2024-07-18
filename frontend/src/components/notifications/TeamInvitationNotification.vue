<template>
    <div class="message" data-el="invitation-message">
        <div class="icon">
            <UserAddIcon class="ff-btn--icon" />
        </div>
        <div class="body">
            <div class="header">
                <router-link class="title" :to="{name: 'User Invitations'}" @click="closeRightDrawer">
                    <h4>Team Invitation</h4>
                </router-link>
            <!--            <ff-checkbox :model-value="isSelected" label="" @click.prevent.stop="toggleSelection" />-->
            </div>
            <div class="content">
                You have been invited by <i>{{ invitorName }}</i> to join <i>{{ teamName }}</i>.
            </div>
            <div class="footer">
                {{ notification.createdSince }}
            </div>
        </div>
    </div>
</template>

<script>
import { UserAddIcon } from '@heroicons/vue/solid'
import { mapActions } from 'vuex'

import NotificationMessageMixin from '../../mixins/NotificationMessage.js'

export default {
    name: 'TeamInvitationNotification',
    components: { UserAddIcon },
    mixins: [NotificationMessageMixin],
    computed: {
        invitorName () {
            return this.notification.invitor.name
        },
        teamName () {
            return this.notification.team.name
        }
    },
    methods: {
        ...mapActions('ux', ['closeRightDrawer'])
    }
}
</script>

<style scoped lang="scss">

</style>
