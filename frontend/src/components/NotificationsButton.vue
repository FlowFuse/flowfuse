<template>
    <div class="notifications-button-wrapper">
        <button class="notifications-button" data-el="notifications-button" data-click-exclude="right-drawer" @click="onClick">
            <MailIcon />
            <ff-notification-pill v-if="hasNotifications" data-el="notification-pill" class="ml-3" :count="notificationsCount" />
        </button>
    </div>
</template>

<script>
import { MailIcon } from '@heroicons/vue/solid'
import { markRaw } from 'vue'
import { mapActions, mapGetters, mapState } from 'vuex'

import NotificationsDrawer from './drawers/notifications/NotificationsDrawer.vue'

export default {
    name: 'NotificationsButton',
    components: { MailIcon },
    computed: {
        ...mapState('ux', ['rightDrawer']),
        ...mapGetters('account', ['hasNotifications']),
        ...mapGetters('account', ['unreadNotificationsCount']),
        notificationsCount: function () {
            // Return null if count = 0 so we don't show a 0 in the pill
            if (!this.unreadNotificationsCount) {
                return null
            }
            return this.unreadNotificationsCount
        }
    },
    methods: {
        ...mapActions('ux', ['openRightDrawer', 'closeRightDrawer']),
        onClick () {
            if (this.rightDrawer.state) {
                this.closeRightDrawer()
            } else this.openRightDrawer({ component: markRaw(NotificationsDrawer) })
        }
    }
}
</script>

<style scoped lang="scss">
.notifications-button-wrapper {

  .notifications-button {
    color: white;
    display: flex;
    align-items: center;
    flex: 1;
    justify-content: center;
    width: 100%;
    height: 100%;
    padding: 18px;
    position: relative;

    > * {
      pointer-events: none;
    }

    &:hover {
      background-color: $ff-grey-700;
    }

    svg {
      flex: 1;
      width: 24px;
      height: 24px;
    }

    .ff-notification-pill {
      bottom: 10px;
      right: 5px;
      position: absolute;
      font-size: 0.65rem;
      padding: 0 7px;
      background-color: $ff-red-500;
    }
  }

}
</style>
