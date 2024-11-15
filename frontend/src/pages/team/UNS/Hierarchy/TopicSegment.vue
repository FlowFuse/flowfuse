<template>
    <div>
        <p>{{ segment }}</p>
        <div v-if="hasChildren" class="ml-5">
            <topic-segment
                v-for="child in Object.keys(children)"
                :key="child"
                :segment="child"
                :children="children[child]"
            />
        </div>
    </div>
</template>

<script>
export default {
    name: 'TopicSegment',
    props: {
        segment: {
            required: true,
            type: String
        },
        children: {
            required: true,
            type: Object
        }
    },
    computed: {
        hasChildren () {
            return Object.keys(this.children).length > 0
        }
    }
}
</script>

<style scoped lang="scss">

</style>
