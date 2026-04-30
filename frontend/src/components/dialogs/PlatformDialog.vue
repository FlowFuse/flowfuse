<template>
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
                <NoticeBanner v-else :text="notice" />
            </template>
        </div>
    </ff-dialog>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'

import dialogService from '../../services/dialog.js'
import NoticeBanner from '../notices/NoticeBanner.vue'

import { useUxDialogStore } from '@/stores/ux-dialog.js'

const dialogStore = useUxDialogStore()
const { dialog } = storeToRefs(dialogStore)
const dialogEl = ref(null)

onMounted(() => {
    dialogService.bind(dialogEl.value, (msg, onConfirm, onCancel) => {
        return dialogStore.showDialogHandlers({ payload: msg, onConfirm, onCancel })
    })
})
</script>
