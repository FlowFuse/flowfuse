<template>
    <li class="suggestion p-4 border border-gray-200 bg-white rounded-md flex gap-10 items-center justify-between">
        <div class="content flex flex-col gap-1">
            <div class="title-wrapper">
                <span class="title">Message Format: </span>
                <span class="format">{{ capitalize(format) }}</span>
            </div>
            <div class="description-wrapper">
                <p v-if="description" class="description opacity-50 text-xs leading-none">{{ description }}</p>
                <p v-else class="description opacity-50 text-xs leading-none">
                    FlowFuse has detected that the messages sent to this topic are {{ format.toUpperCase() }}. Would you like to save this to your Schema?
                </p>
            </div>
        </div>
        <div class="actions flex gap-3 items-center">
            <span v-ff-tooltip:left="'Accept'">
                <CheckCircleIcon class="accept ff-icon-md cursor-pointer color:green" @click="accept" />
            </span>
            <span v-ff-tooltip:left="'Reject'">
                <XCircleIcon class="reject ff-icon-md cursor-pointer color:green" @click="reject" />
            </span>
        </div>
    </li>
</template>

<script>
import { CheckCircleIcon, XCircleIcon } from '@heroicons/vue/outline'

import { capitalize } from '../../../../../../composables/String.js'

export default {
    name: 'TopicSuggestion',
    components: {
        CheckCircleIcon,
        XCircleIcon
    },
    props: {
        format: {
            required: true,
            type: String
        },
        description: {
            required: false,
            type: String,
            default: null
        }
    },
    emits: ['suggestion-accepted', 'suggestion-rejected'],
    methods: {
        capitalize,
        accept () {
            this.$emit('suggestion-accepted')
        },
        reject () {
            this.$emit('suggestion-rejected')
        }
    }
}
</script>

<style scoped lang="scss">
.suggestion {
    .content {
        .format {
            color: $ff-indigo-500;
        }
    }

    .actions {
        .accept {
            color: $ff-green-500
        }
        .reject {
            color: $ff-red-500
        }
    }
}
</style>
