<template>
    <div class="ff-layout--plain">
        <div class="ff-layout--plain--wrapper">
            <slot />
        </div>
        <ff-dialog ref="dialog" data-el="platform-dialog" :header="dialog.header" :kind="dialog.kind" :disable-primary="dialog.disablePrimary" :confirm-label="dialog.confirmLabel" @cancel="clearDialog(true)" @confirm="dialog.onConfirm">
            <p v-if="dialog.text">{{ dialog.text }}</p>
            <component :is="dialog.is.component" v-bind="dialog.is.payload" v-else-if="dialog.is" />
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div class="space-y-2" v-html="dialog.html" />
        </ff-dialog>
        <TransitionGroup class="ff-notifications" name="notifications-list" tag="div">
            <ff-notification-toast
                v-for="(a, $index) in alertsReversed" :key="a.timestamp"
                :type="a.type" :message="a.message" data-el="notification-alert"
                :countdown="a.countdown || 3000" @close="clear($index)"
            />
        </TransitionGroup>
    </div>
</template>

<script>
import { mapActions, mapState } from 'pinia'

import AlertsMixin from '../mixins/Alerts.js'
import dialogService from '../services/dialog.js'

import { useUxDialogStore } from '@/stores/ux-dialog.js'

export default {
    name: 'FfLayoutPlain',
    mixins: [AlertsMixin],
    computed: {
        ...mapState(useUxDialogStore, ['dialog'])
    },
    mounted () {
        dialogService.bind(this.$refs.dialog, this.showDialogHandler)
    },
    methods: {
        ...mapActions(useUxDialogStore, ['clearDialog', 'showDialogHandlers']),
        showDialogHandler (msg, onConfirm, onCancel) {
            return this.showDialogHandlers({ payload: msg, onConfirm, onCancel })
        }
    }
}
</script>
