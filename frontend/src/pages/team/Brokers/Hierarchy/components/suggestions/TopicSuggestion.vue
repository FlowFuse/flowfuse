<template>
    <li class="suggestion p-4 border border-gray-200 bg-white rounded-md flex gap-10 items-center justify-between">
        <div class="content flex flex-col gap-1">
            <div class="title-wrapper">
                <span class="title">Message Format: </span>
                <span class="format">{{ capitalize(format) }}</span>
            </div>
            <div class="description-wrapper">
                <p v-if="description" class="description opacity-50 text-sm">{{ description }}</p>
                <p v-else class="description opacity-50 text-sm">
                    FlowFuse has detected that the messages sent to this topic are {{ format.toUpperCase() }}.
                    <template v-if="format === 'object'">FlowFuse has also established a full Schema for this Object, which you can inspect using the button to the right.</template>
                    Would you like to apply this suggestion to your Schema?
                </p>
            </div>
        </div>
        <div class="actions flex gap-3 items-center">
            <span v-if="inferredSuggestion" v-ff-tooltip:left="'Preview Suggestion'">
                <EyeIcon class="preview ff-icon-md cursor-pointer" @click="preview" />
            </span>
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
import { CheckCircleIcon, EyeIcon, XCircleIcon } from '@heroicons/vue/outline'
import { defineComponent } from 'vue'

import { capitalize } from '../../../../../../composables/String.js'
import Dialog from '../../../../../../services/dialog.js'

import ObjectProperties from '../schema/ObjectProperties.vue'

export default {
    name: 'TopicSuggestion',
    components: {
        CheckCircleIcon,
        XCircleIcon,
        EyeIcon
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
        },
        suggestion: {
            required: false,
            type: Object,
            default: null
        }
    },
    emits: ['suggestion-accepted', 'suggestion-rejected'],
    computed: {
        inferredSuggestion () {
            if (this.format === 'object' && this.suggestion) {
                return this.suggestion
            }
            return null
        }
    },
    methods: {
        capitalize,
        accept () {
            this.$emit('suggestion-accepted')
        },
        reject () {
            this.$emit('suggestion-rejected')
        },
        preview () {
            const suggestion = this.inferredSuggestion
            Dialog.show({
                header: 'Inferred Schema',
                kind: 'primary',
                is: {
                    // eslint-disable-next-line vue/one-component-per-file
                    component: defineComponent({
                        components: { ObjectProperties },
                        data () {
                            return {
                                properties: suggestion.properties
                            }
                        },
                        template: `
                            <div class="p-4 border border-indigo-100 bg-indigo-50 rounded-md shadow-sm overflow-auto text-indigo-600" style="max-height: 70vh;">
                                <object-properties :properties="properties"/>
                            </div>`
                    })
                },
                confirmLabel: 'OK',
                canBeCanceled: false
            }, async () => {
            })
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
        .preview {
            color: $ff-grey-500
        }
        .accept {
            color: $ff-green-500
        }
        .reject {
            color: $ff-red-500
        }
    }
}
</style>
