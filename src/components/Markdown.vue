<template>
    <div v-html="markdownToHtml"></div>
</template>

<script>
export default {
    name: 'MarkdownViewer',
    props: {
        content: {
            type: String
        }
    },
    computed: {
        markdownToHtml () {
            return this.md(this.content)
        }
    }
}
</script>
