<template>
    <div class="notifications-button-wrapper">
        <button class="notifications-button" data-el="notifications-button" data-click-exclude="right-drawer" @click="onClick">
            <MailIcon />
            <ff-notification-pill v-if="hasNotifications" data-el="notification-pill" class="ml-3" :count="notificationsCount" />
        </button>
    </div>
</template>

<script>
import { MailIcon } from '@heroicons/vue/outline'
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
            this.openRightDrawer({ component: markRaw(NotificationsDrawer) })
        }
    }
}
</script>

<style scoped lang="scss">
.notifications-button-wrapper {

  .notifications-button {
    color: $ff-grey-800;
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

    svg {
      flex: 1;
      width: 24px;
      height: 24px;
      transition: ease-in-out .1s;
      object-fit: contain;
    }

    &:hover {
      svg {
        will-change: transform ;
        color: $ff-indigo-600;
        transform: scale(1.25) translateZ(0); /* Using slight adjustments to whole values */
        backface-visibility: hidden;
        perspective: 1000px;
        stroke-width: 1.5px;
        shape-rendering: geometricPrecision;
        text-rendering: geometricPrecision;
      }
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
