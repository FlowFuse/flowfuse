<template>
    <div class="text-cell">
        <code v-if="!isTooLong" class="value whitespace-pre-wrap">
            {{ isJson || value }}
        </code>
        <span
            v-else title="View more..."
            class="cursor-pointer hover:text-indigo-500"
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
        value: {
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
                return JSON.stringify(JSON.parse(this.value), null, 2)
            } catch (e) {
                return false
            }
        },
        isTooLong () {
            return this.value.length > 50
        }
    },
    methods: {
        openDetailedView () {
            let html = ''
            if (this.isJson) {
                html = `<pre class="break-words overflow-auto py-3">${this.isJson}</pre>`
            } else {
                html = `<code class="whitespace-normal break-words block">${this.value}</code>`
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
