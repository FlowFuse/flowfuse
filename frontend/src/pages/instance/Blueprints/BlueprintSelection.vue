<template>
    <div>
        <h3>Select Your Blueprint</h3>
        <p>We have a collection of pre-built flow templates that you can use as a starting point for your Node-RED Instance.</p>
    </div>
    <div v-for="(prints, group) in blueprints" :key="group" class="ff-blueprint-groups">
        <div>
            <h4>{{ group }}</h4>
        </div>
        <div class="grid grid-cols-3 gap-3">
            <BlueprintTile v-for="print in prints" :key="print.id" :blueprint="print" @selected="emit('selected', print)" />
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
    emits: ['selected'],
    data () {
        return {
            blueprints: []
        }
    },
    mounted () {
        this.loadBlueprints()
    },
    methods: {
        async loadBlueprints () {
            const response = await flowBlueprintsApi.getFlowBlueprints()
            console.log(response)
            const blueprints = response.blueprints

            // group the blueprints by category
            this.blueprints = blueprints.reduce((acc, blueprint) => {
                const category = blueprint.category || 'Other';
                (acc[category] = acc[category] || []).push(blueprint)
                return acc
            }, {})
        }
    }
}
</script>

<style lang="scss">
@import '../../../stylesheets/components/blueprint-selection.scss';
</style>
