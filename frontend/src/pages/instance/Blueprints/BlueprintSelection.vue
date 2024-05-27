<template>
    <div>
        <h3>Select Your Blueprint</h3>
        <p>To get started, we have a collection of pre-built flow templates that you can use as a starting point for your Node-RED Instance.</p>
    </div>
    <div v-for="(prints, group) in blueprintsGrouped" :key="group" class="ff-blueprint-groups" data-form="blueprint-group">
        <div>
            <h4>{{ group }}</h4>
        </div>
        <div class="gap-3 blueprint-group" data-form="blueprint-selection">
            <BlueprintTile v-for="print in prints" :key="print.id" :blueprint="print" @selected="$emit('selected', print)" />
        </div>
    </div>
</template>

<script>
import flowBlueprintsApi from '../../../api/flowBlueprints.js'

import BlueprintTile from '../../../components/blueprints/BlueprintTile.vue'

export default {
    name: 'BlueprintSelection',
    components: {
        BlueprintTile
    },
    props: {
        blueprints: {
            type: Array,
            default: null
        }
    },
    emits: ['selected'],
    data () {
        return {
            localBlueprints: []
        }
    },
    computed: {
        blueprintsGrouped () {
            return (this.blueprints || this.localBlueprints).sort((a, b) => {
                return a.order - b.order
            }).reduce((acc, blueprint) => {
                const category = blueprint.category || 'Other';
                (acc[category] = acc[category] || []).push(blueprint)
                return acc
            }, {})
        }
    },
    mounted () {
        if (!this.blueprints) {
            this.loadBlueprints()
        }
    },
    methods: {
        async loadBlueprints () {
            const response = await flowBlueprintsApi.getFlowBlueprints()

            this.localBlueprints = response.blueprints
        }
    }
}
</script>

<style lang="scss">
@import '../../../stylesheets/components/blueprint-selection.scss';
.blueprint-group {
  display: flex;
  flex-wrap: wrap;
}
</style>
