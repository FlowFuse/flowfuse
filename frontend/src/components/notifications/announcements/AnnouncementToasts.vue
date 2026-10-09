<template>
    <TransitionGroup
        class="ff-announcement-toasts"
        name="announcement-toast-list"
        tag="div"
        data-el="announcement-toasts"
        :style="{ right: rightOffset + 'px' }"
    >
        <template v-if="hasRoomBesideDrawer">
            <div v-for="announcement in visibleAnnouncements" :key="announcement.id" class="ff-announcement-toast" data-el="announcement-toast">
                <ff-notification-toast type="info" :countdown="null" @close="dismiss(announcement)">
                    <template #message>
                        <div class="ff-announcement-toast--content">
                            <div class="ff-announcement-toast--header">
                                <MegaphoneIcon class="ff-icon" />
                                <h4>{{ announcement.data.title }}</h4>
                            </div>
                            <AnnouncementBody :data="announcement.data" compact @engaged="markAsRead(announcement)" />
                            <button class="ff-announcement-toast--secondary" data-action="open-notifications" @click="openNotifications">
                                View in notifications
                            </button>
                        </div>
                    </template>
                </ff-notification-toast>
            </div>
        </template>
    </TransitionGroup>
</template>

<script>
import { MegaphoneIcon } from '@heroicons/vue/24/outline'
import { mapActions, mapState } from 'pinia'
import { markRaw } from 'vue'

import userApi from '../../../api/user.js'

import NotificationsDrawer from '../../drawers/notifications/NotificationsDrawer.vue'

import AnnouncementBody from './AnnouncementBody.vue'

import { useAccountStore } from '@/stores/account.js'
import { useUxDrawersStore } from '@/stores/ux-drawers.js'

const DISMISSED_KEY = 'ff-announcement-toasts-dismissed'
const MAX_VISIBLE = 2
// Gap between the toast stack and whatever is to the right of it
const EDGE_GAP = 18
const TOAST_WIDTH = 380
// The drawer animates its width over 300ms, so sample a little past that
const DRAWER_TRANSITION_MS = 400

/**
 * Surfaces unread announcements bottom-right so they do not depend on the user
 * opening the notifications drawer.
 *
 * Opening the drawer clears them: the same announcements are listed there, so
 * leaving the toasts up would duplicate the message on screen. Dismissing a
 * toast does not mark the announcement read - it stays unread in the drawer -
 * but it is remembered for the rest of the browser tab session so a reload does
 * not bring it back.
 */
export default {
    name: 'AnnouncementToasts',
    components: { AnnouncementBody, MegaphoneIcon },
    data () {
        return {
            dismissedIds: this.readDismissed(),
            drawerWidth: 0,
            viewportWidth: window.innerWidth
        }
    },
    computed: {
        ...mapState(useAccountStore, ['notifications']),
        ...mapState(useUxDrawersStore, ['rightDrawer']),
        notificationsDrawerOpen () {
            return this.rightDrawer.state && this.rightDrawer.component?.name === 'NotificationsDrawer'
        },
        maxRightOffset () {
            return Math.max(0, this.viewportWidth - TOAST_WIDTH - EDGE_GAP * 2)
        },
        rightOffset () {
            // Sit to the left of an open right drawer rather than under it
            return EDGE_GAP + Math.min(this.drawerWidth, this.maxRightOffset)
        },
        hasRoomBesideDrawer () {
            // A wide drawer, or a narrow viewport, leaves nowhere for the stack
            // to go. It stays below the dialog layer by design, so pushing it
            // under the drawer instead would hide it with no way to reach it.
            // Hold the announcements back until the drawer is out of the way;
            // they are still unread and still in the drawer's own list.
            return this.drawerWidth <= this.maxRightOffset
        },
        unreadAnnouncements () {
            return (this.notifications || [])
                .filter(notification => notification.type === 'announcement')
                .filter(notification => !notification.read)
                .filter(notification => !this.dismissedIds.includes(notification.id))
        },
        visibleAnnouncements () {
            return this.unreadAnnouncements.slice(0, MAX_VISIBLE)
        }
    },
    watch: {
        notificationsDrawerOpen (open) {
            if (open) {
                // Every unread one, not just the two on screen, or the next two
                // slide in over the drawer that is already listing them
                this.unreadAnnouncements.forEach(announcement => this.dismiss(announcement))
            }
        },
        'rightDrawer.state' () {
            this.trackDrawerTransition()
        },
        'rightDrawer.wider' () {
            this.trackDrawerTransition()
        },
        'rightDrawer.fixed' () {
            this.trackDrawerTransition()
        }
    },
    mounted () {
        this.measureDrawer()
        window.addEventListener('resize', this.measureDrawer)
        const drawer = document.getElementById('right-drawer')
        if (drawer && window.ResizeObserver) {
            // Follows a drag-resize of the drawer, and the width animation
            this.drawerObserver = new ResizeObserver(() => this.measureDrawer())
            this.drawerObserver.observe(drawer)
        }
    },
    beforeUnmount () {
        window.removeEventListener('resize', this.measureDrawer)
        this.drawerObserver?.disconnect()
        if (this.transitionFrame) {
            cancelAnimationFrame(this.transitionFrame)
        }
    },
    methods: {
        ...mapActions(useUxDrawersStore, ['openRightDrawer']),
        measureDrawer () {
            // window.innerWidth is not reactive, so it is tracked here alongside
            // the drawer rather than read straight from a computed
            this.viewportWidth = window.innerWidth
            const drawer = document.getElementById('right-drawer')
            if (!drawer) {
                this.drawerWidth = 0
                return
            }
            const rect = drawer.getBoundingClientRect()
            // A closed drawer is parked off the right edge, which gives 0 here
            this.drawerWidth = Math.max(0, Math.round(window.innerWidth - rect.left))
        },
        trackDrawerTransition () {
            // The drawer slides rather than jumps, so sample until it settles
            const until = performance.now() + DRAWER_TRANSITION_MS
            const sample = () => {
                this.measureDrawer()
                if (performance.now() < until) {
                    this.transitionFrame = requestAnimationFrame(sample)
                }
            }
            if (this.transitionFrame) {
                cancelAnimationFrame(this.transitionFrame)
            }
            this.transitionFrame = requestAnimationFrame(sample)
        },
        readDismissed () {
            try {
                return JSON.parse(window.sessionStorage.getItem(DISMISSED_KEY)) || []
            } catch (_err) {
                return []
            }
        },
        dismiss (announcement) {
            if (this.dismissedIds.includes(announcement.id)) {
                return
            }
            this.dismissedIds = [...this.dismissedIds, announcement.id]
            try {
                window.sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(this.dismissedIds))
            } catch (_err) {
                // A browser with storage disabled just gets per-page-load toasts
            }
        },
        markAsRead (announcement) {
            if (!announcement.read) {
                announcement.read = true
                userApi.markNotificationRead(announcement.id)
            }
        },
        openNotifications () {
            this.openRightDrawer({ component: markRaw(NotificationsDrawer) })
        }
    }
}
</script>

<style lang="scss">
.ff-announcement-toasts {
    position: fixed;
    bottom: $ff-unit-lg;
    // Below the dialog layer: a modal and its backdrop must cover the toast,
    // not compete with it. The stack clears the right drawer by sitting beside
    // it rather than above it.
    z-index: 100;
    width: 380px;
    max-width: calc(100vw - #{$ff-unit-lg * 2});
    // Two announcements carrying video are taller than a laptop viewport, so the
    // stack scrolls itself rather than running off the top of the screen.
    max-height: calc(100vh - 60px - #{$ff-unit-lg * 2});
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: $ff-unit-md;

    .ff-notification-toast {
        margin-bottom: 0;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        // The coloured type bar is the alert affordance. An announcement is not
        // an alert, so drop it. Without the bar the component's asymmetric
        // padding has nothing to reserve space for, so even it out into a card.
        padding: $ff-unit-lg;
        border-radius: $ff-unit-sm;

        .ff-notification-toast--bar {
            display: none;
        }

        .ff-notification-toast--message {
            // The component reserves a grid column for the close button, which
            // would narrow the body all the way down. The close control only
            // needs the header line, so let the content have the full width and
            // lift the control out of the flow.
            grid-template-columns: 1fr;
            gap: 0;

            > div {
                flex: 1;
                min-width: 0;
            }
        }

        .ff-notification-toast--close {
            // Match the drawer's close control: a 20px glyph in a 30px hit area,
            // its glyph aligned with the title rather than the card edge.
            position: absolute;
            top: calc(#{$ff-unit-lg} - 5px);
            right: calc(#{$ff-unit-lg} - 5px);
            max-height: 30px;

            svg {
                width: 30px;
                height: 30px;
                padding: 5px;
            }
        }

        .ff-announcement-toast--header {
            // Keep the title clear of the close button that now overlays it
            padding-right: 30px;
        }
    }

    .ff-announcement-toast--content {
        display: flex;
        flex-direction: column;
        gap: $ff-unit-sm;
        width: 100%;
    }

    .ff-announcement-toast--header {
        display: flex;
        align-items: center;
        gap: $ff-unit-sm;

        h4 {
            font-weight: 600;
            margin: 0;
        }
    }

    .ff-announcement-toast--secondary {
        align-self: flex-start;
        color: var(--ff-color-link);
        text-decoration: underline;
        font-size: 90%;
    }
}

.announcement-toast-list-enter-active,
.announcement-toast-list-leave-active {
    transition: opacity 0.3s ease, transform 0.3s ease;
}

.announcement-toast-list-enter-from,
.announcement-toast-list-leave-to {
    opacity: 0;
    transform: translateY(12px);
}
</style>
