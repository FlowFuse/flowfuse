<template>
    <div class="suggestions">
        <h4>
            <information-circle-icon class="ff-icon" />
            <streamable-content v-model="streamingTitle" :should-stream="shouldStream" />
        </h4>
        <ul v-if="!shouldStream || streamingTitle.streamed">
            <li v-for="(item, index) in visibleItems" :key="index">
                <streamable-content
                    :string="item.content.streamable"
                    :should-stream="shouldStream"
                    @streaming-complete="setSubItemStreamedState(index, 'content')"
                />
            </li>
        </ul>
    </div>
</template>

<script>
import { InformationCircleIcon } from '@heroicons/vue/solid'

import useStreamingList from '../../../../../../composables/StreamingListHelper.js'

import StreamableContent from './StreamableContent.vue'

export default {
    name: 'SuggestionsList',
    components: { StreamableContent, InformationCircleIcon },
    props: {
        suggestions: {
            type: Array,
            required: true
        },
        shouldStream: {
            type: Boolean,
            default: false
        }
    },
    emits: ['streaming-complete'],
    setup () {
        const { initStreamer, setSubItemStreamedState, visibleItems, items } = useStreamingList()

        return { initStreamer, setSubItemStreamedState, visibleItems, items }
    },
    data () {
        return {
            streamingTitle: {
                streamable: 'Suggestions',
                streamed: false
            }
        }
    },
    async mounted () {
        const suggestions = this.suggestions.map(suggestion => ({ content: suggestion }))

        await this.initStreamer(suggestions, { shouldStream: this.shouldStream })

        this.$emit('streaming-complete')
    }
}
</script>

<style scoped lang="scss">
.suggestions {
    margin-top: 1.25rem;

    h4 {
        font-weight: bold;
        display: flex;
        align-items: center;
        gap: 5px;
        color: $ff-grey-600;

        .ff-icon {
            color: $ff-grey-500;
        }
    }

    ul {
        list-style: disc;
        padding-left: 1.4rem;

        li {
            margin-top: .5rem;
        }
    }
}
</style>
