<template>
    <div class="ff-layout--immersive" :class="{ 'ff-layout--immersive--fullscreen': editorImmersiveDrawer.fullscreen }">
        <PageHeader v-show="!editorImmersiveDrawer.fullscreen" />
        <div class="ff-layout--immersive--wrapper">
            <slot />
        </div>
        <ff-dialog
            ref="dialogEl" data-el="platform-dialog"
            :header="dialog.header"
            :kind="dialog.kind"
            :disable-primary="dialog.disablePrimary"
            :confirm-label="dialog.confirmLabel"
            :cancel-label="dialog.cancelLabel"
            :canBeCanceled="dialog.canBeCanceled"
            :notices="dialog.notices"
            :box-class="dialog.boxClass"
            @cancel="dialogStore.clearDialog(true)"
            @confirm="dialog.onConfirm"
        >
            <template v-if="dialog.textLines">
                <div class="space-y-2">
                    <p v-for="(text, $index) in dialog.textLines" :key="$index">{{ text }}</p>
                </div>
            </template>
            <component :is="dialog.is.component" v-bind="dialog.is.payload" v-else-if="dialog.is" v-on="dialog.is.on" />
            <p v-else-if="dialog.text">{{ dialog.text }}</p>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div v-else class="space-y-2" v-html="dialog.html" />
            <div v-if="dialog.notices?.length" class="notices flex flex-col gap-3 mt-5">
                <hr class="mb-5">
                <template v-for="notice in dialog.notices" :key="notice">
                    <component :is="notice" v-if="typeof notice === 'object'" />
                    <notice-banner v-else :text="notice" />
                </template>
            </div>
        </ff-dialog>
        <TransitionGroup class="ff-notifications" name="notifications-list" tag="div">
            <ff-notification-toast
                v-for="(a, $index) in alertsReversed" :key="a.timestamp"
                :type="a.type" :message="a.message" data-el="notification-alert"
                :countdown="a.countdown || 3000" @close="clearAlert($index)"
            />
        </TransitionGroup>
    </div>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'

import PageHeader from '../components/PageHeader.vue'
import NoticeBanner from '../components/notices/NoticeBanner.vue'
import alertsService from '../services/alerts.js'
import dialogService from '../services/dialog.js'

import { useUxDialogStore } from '@/stores/ux-dialog.js'
import { useUxDrawersStore } from '@/stores/ux-drawers.js'

defineOptions({ name: 'FfLayoutImmersiveEditor' })

const dialogStore = useUxDialogStore()
const drawersStore = useUxDrawersStore()
const { dialog } = storeToRefs(dialogStore)
const { editorImmersiveDrawer } = storeToRefs(drawersStore)

const dialogEl = ref(null)

const alerts = ref([])
const alertsReversed = computed(() => [...alerts.value].reverse())
function clearAlert (i) {
    alerts.value.splice(alerts.value.length - 1 - i, 1)
}

onMounted(() => {
    alertsService.subscribe((message, type, countdown) => {
        alerts.value.push({ message, type, countdown, timestamp: Date.now() })
    })
    dialogService.bind(dialogEl.value, (msg, onConfirm, onCancel) => {
        return dialogStore.showDialogHandlers({ payload: msg, onConfirm, onCancel })
    })
})
</script>

<style lang="scss">
.ff-layout--immersive {
    height: 100vh;
    display: flex;
    flex-direction: column;

    &--wrapper {
        display: flex;
        flex-direction: row;
        flex: 1;
        height: calc(100vh - 60px);
        margin-top: 60px;
    }

    &--fullscreen &--wrapper {
        height: 100vh;
        margin-top: 0;
    }
}
</style>
