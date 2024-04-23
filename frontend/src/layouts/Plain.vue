<template>
    <div class="ff-layout--plain">
        <div class="ff-layout--plain--wrapper">
            <slot />
        </div>
        <ff-dialog ref="dialog" data-el="platform-dialog" :header="dialog.header" :kind="dialog.kind" :disable-primary="dialog.disablePrimary" :confirm-label="dialog.confirmLabel" @cancel="clearDialog(true)" @confirm="dialog.onConfirm">
            <p v-if="dialog.text">{{ dialog.text }}</p>
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
import AlertsMixin from '../mixins/Alerts.js'
import DialogMixin from '../mixins/Dialog.js'

export default {
    name: 'FfLayoutPlain',
    mixins: [DialogMixin, AlertsMixin]
}
</script>
