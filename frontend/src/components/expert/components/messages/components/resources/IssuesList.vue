<template>
    <div class="issues">
        <h4>
            <exclamation-icon class="ff-icon" />
            <streamable-content v-model="streamedTitle" :should-stream="shouldStream" />
        </h4>
        <ul>
            <li v-for="(item, index) in visibleItems" :key="index">
                <streamable-content
                    :rich-content="true"
                    :string="item.content.streamable"
                    :should-stream="shouldStream"
                    @streaming-complete="setSubItemStreamedState(index, 'content')"
                />
            </li>
        </ul>
    </div>
</template>

<script>
import { ExclamationIcon } from '@heroicons/vue/solid'

import useStreamingList from '../../../../../../composables/StreamingListHelper.js'
import { sanitize } from '../../../../../../composables/strings/String.js'

import StreamableContent from './StreamableContent.vue'

export default {
    name: 'IssuesList',
    components: { StreamableContent, ExclamationIcon },
    props: {
        issues: {
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

        return { initStreamer, setSubItemStreamedState, visibleItems, items, sanitize }
    },
    data () {
        return {
            streamedTitle: {
                streamable: 'Issues',
                streamed: false
            }
        }
    },
    async mounted () {
        const issues = this.issues.map(issue => ({ content: issue }))

        await this.initStreamer(issues, { shouldStream: this.shouldStream })

        this.$emit('streaming-complete')
    }
}
</script>

<style scoped lang="scss">
.issues {
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
