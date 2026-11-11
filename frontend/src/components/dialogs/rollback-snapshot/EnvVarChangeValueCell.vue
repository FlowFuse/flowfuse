<template>
    <span v-if="hidden" class="italic text-gray-400">
        <EyeSlashIcon class="ff-icon-sm inline" /> Value hidden
    </span>
    <div v-else class="flex flex-col items-start gap-1 min-w-0" data-el="env-var-value-diff">
        <DiffValuePill
            v-if="kind !== 'added'"
            kind="removed"
            :text="display(from)"
            class="max-w-full break-all whitespace-pre-wrap line-clamp-3"
            data-change="removed"
        />
        <DiffValuePill
            v-if="kind !== 'removed'"
            kind="added"
            :text="display(to)"
            class="max-w-full break-all whitespace-pre-wrap line-clamp-3"
            data-change="added"
        />
    </div>
</template>

<script>
import { EyeSlashIcon } from '@heroicons/vue/24/outline'

import DiffValuePill from '../../diff/DiffValuePill.vue'

export default {
    name: 'EnvVarChangeValueCell',
    components: { DiffValuePill, EyeSlashIcon },
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
