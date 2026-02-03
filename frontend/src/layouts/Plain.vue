<template>
    <div class="ff-layout--plain">
        <PageHeader />

        <div class="ff-layout--platform--wrapper">
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
            <RightDrawer />
        </div>
    </div>
</template>

<script>
import PageHeader from '../components/PageHeader.vue'
import RightDrawer from '../components/drawers/RightDrawer.vue'
import AlertsMixin from '../mixins/Alerts.js'
import DialogMixin from '../mixins/Dialog.js'

export default {
    name: 'FfLayoutPlain',
    components: { PageHeader, RightDrawer },
    mixins: [DialogMixin, AlertsMixin]
}
</script>
