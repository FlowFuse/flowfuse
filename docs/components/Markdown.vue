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
            console.log(this.content)
            return this.md(this.content)
        }
    }
}
</script>
