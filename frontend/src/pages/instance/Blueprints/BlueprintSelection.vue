<template>
    <div>
        <h3>Select Your Blueprint</h3>
        <p>To get started, we have a collection of pre-built flow templates that you can use as a starting point for your Node-RED Instance.</p>
    </div>
    <div v-for="(prints, group) in blueprintsGrouped" :key="group" class="ff-blueprint-groups" data-form="blueprint-group">
        <div>
            <h4>{{ group }}</h4>
        </div>
        <div class="grid grid-cols-3 gap-3" data-form="blueprint-selection">
            <BlueprintTile v-for="print in prints" :key="print.id" :blueprint="print" @selected="$emit('selected', print)" />
        </div>
    </div>
</template>

<script>
import flowBlueprintsApi from '../../../api/flowBlueprints.js'

import BlueprintTile from './BlueprintTile.vue'

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
            const grouped = (this.blueprints || this.localBlueprints).reduce((acc, blueprint) => {
                const category = blueprint.category || 'Other';
                (acc[category] = acc[category] || []).push(blueprint)
                return acc
            }, {})

            // sort each group
            Object.keys(grouped).forEach(key => {
                grouped[key].sort((a, b) => {
                    return a.order - b.order
                })
            })

            return grouped
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
            const blueprints = response.blueprints

            this.localBlueprints = blueprints
        }
    }
}
</script>

<style lang="scss">
@import '../../../stylesheets/components/blueprint-selection.scss';
</style>
