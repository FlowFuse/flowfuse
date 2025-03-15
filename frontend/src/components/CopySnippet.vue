<template>
    <div class="flex flex-row justify-end space-x-2 mt-1">
        <ff-button kind="tertiary" size="small" @click="copy(snippet)">
            <template #icon-right><ClipboardCopyIcon /></template>
            <span class="">Copy</span>
        </ff-button>
    </div>
</template>
<script>
import { ClipboardCopyIcon } from '@heroicons/vue/outline'

import clipboardMixin from '../mixins/Clipboard.js'
import Alerts from '../services/alerts.js'
export default {
    name: 'CopySnippet',
    components: {
        ClipboardCopyIcon
    },
    mixins: [clipboardMixin],
    props: {
        snippet: {
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
