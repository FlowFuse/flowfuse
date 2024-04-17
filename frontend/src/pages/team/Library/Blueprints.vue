<template>
    <h1>Blueprints</h1>
    <ul class="flow-categories-wrapper">
        <li v-for="(flowBlueprints, category) in blueprintsByCategory" :key="category" class="category">
            <h2 class="title">{{ category }}</h2>
            <BlueprintTile
                v-for="(blueprint, index) in flowBlueprints"
                :key="index"
                class="blueprint-tile"

                :blueprint="blueprint"
                :editable="true"
            />
        </li>
    </ul>
</template>

<script>
import { mapState } from 'vuex'

import flowBlueprintsApi from '../../../api/flowBlueprints.js'
import BlueprintTile from '../../../components/blueprints/BlueprintTile.vue'

export default {
    name: 'BluePrints',
    components: { BlueprintTile },
    data () {
        return {
            blueprints: []
        }
    },
    computed: {
        ...mapState('account', ['team']),
        blueprintsByCategory () {
            return Object.groupBy(this.blueprints, (category) => category.category)
        }
    },
    async created () {
        await this.loadBlueprints()
    },
    methods: {
        async loadBlueprints () {
            const res = await flowBlueprintsApi.getFlowBlueprintsForTeam(this.team.id)
            if (Object.hasOwnProperty.call(res, 'blueprints')) {
                this.blueprints = res.blueprints
            }
        }
    }
}
</script>

<style scoped lang="scss">
.flow-categories-wrapper {
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    gap: 20px;

  .category {
    margin-bottom: 20px;

    .blueprint-tile {
      max-width: 250px
    }
  }
}
</style>
