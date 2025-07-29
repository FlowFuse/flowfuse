<template>
    <div class="text-cell">
        <code v-if="!isTooLong" class="value whitespace-pre-wrap">
            {{ isJson || rowValue }}
        </code>
        <span
            v-else title="View more..."
            class="cursor-pointer text-indigo-500 hover:text-indigo-700"
            @click="openDetailedView"
        >
            View more..
        </span>
    </div>
</template>

<script>
import { defineComponent } from 'vue'

import Dialog from '../../../../../../../services/dialog.js'
export default defineComponent({
    name: 'text-cell',
    props: {
        rowValue: {
            required: true,
            type: String
        },
        column: {
            required: true,
            type: String
        }
    },
    computed: {
        isJson () {
            try {
                return JSON.stringify(JSON.parse(this.rowValue), null, 2)
            } catch (e) {
                return false
            }
        },
        isTooLong () {
            return this.rowValue.length > 50
        }
    },
    methods: {
        openDetailedView () {
            let html = ''
            if (this.isJson) {
                html = `<pre class="break-words overflow-auto py-3">${this.isJson}</pre>`
            } else {
                html = `<code class="whitespace-normal break-words block">${this.rowValue}</code>`
            }
            Dialog.show({
                header: `${this.column} value`,
                kind: 'primary',
                html,
                confirmLabel: 'OK',
                canBeCanceled: false
            }, async () => {
            })
        }
    }
})
</script>

<style scoped lang="scss">
.text-cell {
    overflow: auto;
    max-height: 3rem;

    .value {
        background: none;
        border: none;
    }
}
</style>
