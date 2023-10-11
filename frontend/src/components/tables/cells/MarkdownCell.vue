<template>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div class="list-disc " v-html="renderedMarkdown" />
</template>
<script>

const marked = require('marked')

export default {
    name: 'MarkdownCell',
    props: {
        markdown: {
            type: String,
            default: ''
        }
    },
    computed: {
        renderedMarkdown () {
            return marked.parse(this.markdown)
        }
    }
}
</script>
