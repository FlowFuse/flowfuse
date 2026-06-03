<template>
    <div class="terminal-command-section">
        <p>{{ title }}</p>
        <pre
            class="overflow-auto text-xs font-light p-4 my-2 border rounded-sm bg-gray-800 text-gray-200"
            style="text-wrap: wrap"
        >{{ command }}</pre>
        <div class="flex flex-row justify-end space-x-2 -mt-1">
            <ff-button kind="tertiary" size="small" @click="copy(command)">
                <template #icon-right><ClipboardDocumentIcon /></template>
                <span class="">Copy</span>
            </ff-button>
        </div>
    </div>
</template>

<script>
import { ClipboardDocumentIcon } from '@heroicons/vue/24/outline'

import clipboardMixin from '../../../../../../mixins/Clipboard.js'
import Alerts from '../../../../../../services/alerts.js'

export default {
    name: 'TerminalCommandSection',
    components: { ClipboardDocumentIcon },
    mixins: [clipboardMixin],
    props: {
        title: {
            type: String,
            required: true
        },
        command: {
            type: String,
            required: true
        }
    },
    methods: {
        copy (text) {
            this.copyToClipboard(text).then(() => {
                Alerts.emit('Copied to Clipboard.', 'confirmation')
            }).catch((err) => {
                console.warn('Clipboard write permission denied: ', err)
                Alerts.emit('Clipboard write permission denied.', 'warning')
            })
        }
    }
}
</script>

<style scoped lang="scss">

</style>
