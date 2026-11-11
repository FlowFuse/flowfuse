<template>
    <span v-if="hidden" class="italic text-gray-400">
        <EyeSlashIcon class="ff-icon-sm inline" /> Value hidden
    </span>
    <div v-else class="flex flex-col items-start gap-1 min-w-0" data-el="env-var-value-diff">
        <span
            v-if="kind !== 'added'"
            class="px-1.5 py-0.5 rounded-sm font-mono text-xs max-w-full break-all whitespace-pre-wrap line-clamp-3 bg-red-50 text-red-700 line-through"
            :title="from"
            data-change="removed"
        >{{ display(from) }}</span>
        <span
            v-if="kind !== 'removed'"
            class="px-1.5 py-0.5 rounded-sm font-mono text-xs max-w-full break-all whitespace-pre-wrap line-clamp-3 bg-green-50 text-green-700"
            :title="to"
            data-change="added"
        >{{ display(to) }}</span>
    </div>
</template>

<script>
import { EyeSlashIcon } from '@heroicons/vue/24/outline'

export default {
    name: 'EnvVarChangeValueCell',
    components: { EyeSlashIcon },
    props: {
        kind: {
            type: String,
            required: true
        },
        hidden: {
            type: Boolean,
            default: false
        },
        from: {
            type: String,
            default: undefined
        },
        to: {
            type: String,
            default: undefined
        }
    },
    methods: {
        display (value) {
            return value === '' ? '(empty)' : value
        }
    }
}
</script>
