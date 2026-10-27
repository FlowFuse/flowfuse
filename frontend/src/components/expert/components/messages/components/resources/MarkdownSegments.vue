<template>
    <template v-for="(segment, index) in segments" :key="index">
        <diagram-block v-if="segment.diagram" v-bind="segment.diagram" />
        <component
            :is="segment.list.ordered ? 'ol' : 'ul'"
            v-else-if="segment.list"
            :start="segment.list.ordered && segment.list.start !== 1 ? segment.list.start : null"
            :class="{ 'ff-task-list': segment.list.task }"
        >
            <li v-for="(item, itemIndex) in segment.list.items" :key="itemIndex">
                <markdown-segments :segments="item" />
            </li>
        </component>
        <blockquote v-else-if="segment.blockquote">
            <markdown-segments :segments="segment.blockquote" />
        </blockquote>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-else v-html="segment.html" />
    </template>
</template>

<script>
import DiagramBlock from './DiagramBlock.vue'

// Renders the segments of a message: runs of markdown as HTML, diagrams as their own component,
// and the lists and blockquotes that hold a diagram as elements around their own segments.
export default {
    name: 'MarkdownSegments',
    components: { DiagramBlock },
    props: {
        segments: {
            type: Array,
            required: true
        }
    }
}
</script>
