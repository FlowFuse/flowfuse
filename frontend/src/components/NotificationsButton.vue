<template>
    <div class="notifications-button-wrapper">
        <button class="notifications-button" data-el="notifications-button" @click="onClick">
            <MailIcon />
            <ff-notification-pill v-if="hasNotifications" data-el="notification-pill" class="ml-3" :count="notifications.total" />
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
        ...mapGetters('account', ['notifications'])
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
    border-left: 1px solid $ff-grey-500;
    color: white;
    display: flex;
    align-items: center;
    flex: 1;
    justify-content: center;
    width: 100%;
    height: 100%;
    padding: 18px;
    position: relative;

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
