<template>
    <pre class="ff-code-previewer">
        <code>
            {{ strippedSnippet }}
        </code>
    </pre>
</template>

<script>
export default {
    name: 'ff-code-previewer',
    props: {
        snippet: {
            required: true,
            type: [Object, Array, String]
        }
    },
    computed: {
        strippedSnippet: function () {
            console.log(this.snippet)
            return this.snippet
        }
    }
}
</script>

<style lang="scss" scoped>
@import "@/stylesheets/components/code-previewer.scss";
</style>
