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
/**
 * CascadingSelector
 *
 * A generic recursive component that renders a multi-level selector UI from a tree of nodes.
 * Each level owns its own independent selection state, so selecting an option at one level
 * does not affect selections at sibling levels.
 *
 * ---
 * NODE SHAPE
 *
 * Every node in the tree has the same shape:
 *
 *   {
 *     id: string,                  // unique identifier used for selection tracking
 *     component: markRaw(Component), // what to render — see below
 *     props?: { ... },             // passed to this node's component AND used as display entry in parent
 *     children?: Node[]            // present on intermediate nodes, absent on leaf nodes
 *   }
 *
 * - Intermediate node: `component` is a selector UI (e.g. TabSelector, OptionTileSelector).
 *   It receives `v-model`, `options`, and `node.props` spread onto it. Its children become the options.
 *
 * - Leaf node: `component` is the content to render when this option is selected.
 *   It receives `node.props` spread onto it. No children.
 *
 * `component` lives on the PARENT node, not on each child. This means selector config
 * (e.g. separator: 'or') is defined once — not duplicated across siblings.
 *
 * ---
 * PROPS DUAL PURPOSE
 *
 * `node.props` is intentionally generic and serves two roles at once:
 *   1. Display entry — `label` and `icon` are picked up by the parent when building its options list
 *   2. Component config — everything in props is spread onto this node's own component
 *
 * This means CascadingSelector never inspects props — it just passes them through.
 * Individual components are responsible for only using what they declare.
 *
 * Leaf content components (e.g. ScriptInstallContent, NpmInstallContent) should use
 * `inheritAttrs: false` to prevent display-only props (label, icon) from becoming
 * unwanted HTML attributes on their root element.
 *
 * Selector components (TabSelector, OptionTileSelector) should NOT use inheritAttrs: false,
 * so that class/style passthrough works normally when used outside of CascadingSelector.
 *
 * ---
 * USAGE EXAMPLE
 *
 *   import { markRaw } from 'vue'
 *   import { CascadingSelector, TabSelector, OptionTileSelector } from '@/components/variant-selector'
 *   import MyLeafContent from './MyLeafContent.vue'
 *
 *   // Define the tree (typically a computed property so dynamic values stay reactive)
 *   const tree = {
 *     id: 'root',
 *     component: markRaw(TabSelector),
 *     props: { separator: 'or' },
 *     children: [
 *       {
 *         id: 'option-a',
 *         component: markRaw(OptionTileSelector),
 *         props: { label: 'Option A', title: 'Choose a platform' },
 *         children: [
 *           {
 *             id: 'platform-1',
 *             component: markRaw(MyLeafContent),
 *             props: { label: 'Platform 1', command: 'npm run start' }
 *           }
 *         ]
 *       }
 *     ]
 *   }
 *
 *   // In template:
 *   <CascadingSelector :node="tree" />
 */
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
