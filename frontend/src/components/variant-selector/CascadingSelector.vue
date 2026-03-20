<template>
    <div class="ff-cascading-selector">
        <component
            :is="node.component"
            v-model="selectedId"
            :options="childOptions"
            v-bind="node.props"
        />
        <div v-if="selectedNode" class="mt-2">
            <CascadingSelector
                v-if="selectedNode.children && selectedNode.children.length"
                :key="selectedNode.id"
                :node="selectedNode"
            />
            <component
                :is="selectedNode.component"
                v-else
                v-bind="selectedNode.props"
            />
        </div>
    </div>
</template>

<script>
export default {
    name: 'CascadingSelector',
    props: {
        node: {
            type: Object,
            required: true
        }
    },
    data () {
        return {
            selectedId: this.node.children?.[0]?.id ?? null
        }
    },
    computed: {
        childOptions () {
            return (this.node.children ?? []).map(c => ({ id: c.id, ...c.props }))
        },
        selectedNode () {
            if (!this.selectedId) return null
            return (this.node.children ?? []).find(c => c.id === this.selectedId) ?? null
        }
    }
}
</script>
