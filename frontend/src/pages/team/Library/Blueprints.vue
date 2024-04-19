<template>
    <ul v-if="blueprints.length" class="flow-categories-wrapper">
        <li v-for="(flowBlueprints, category) in blueprintsByCategory" :key="category" class="category">
            <h2 class="title">{{ category }}</h2>
            <BlueprintTile
                v-for="(blueprint, index) in flowBlueprints"
                :key="index"
                class="blueprint-tile"
                :blueprint="blueprint"
                @selected="onBlueprintSelect"
            />
        </li>
    </ul>
    <EmptyState v-else :featureUnavailable="!isSharedLibraryFeatureEnabledForPlatform" :featureUnavailableToTeam="!isSharedLibraryFeatureEnabledForTeam">
        <template #img>
            <img src="../../../images/empty-states/team-library.png" alt="team-logo">
        </template>
        <template #header>Create your own Blueprints</template>
        <template #message>
            <p>
                Your Blueprints will be shown here, and will be available within all of your Node-RED instances on FlowFuse.
            </p>
        </template>
        <template #actions>
            <ff-button v-if="isSharedLibraryFeatureEnabled" :to="{name: 'AdminFlowBlueprints'}">Go To Blueprints</ff-button>
            <ff-button v-else :to="{name: 'AdminFlowBlueprints'}" :disabled="true">
                Add To Library
                <template #icon-right><PlusIcon /></template>
            </ff-button>
        </template>
    </EmptyState>
</template>

<script>
import { PlusIcon } from '@heroicons/vue/solid'
import { mapState } from 'vuex'

import flowBlueprintsApi from '../../../api/flowBlueprints.js'
import EmptyState from '../../../components/EmptyState.vue'
import BlueprintTile from '../../../components/blueprints/BlueprintTile.vue'
import featuresMixin from '../../../mixins/Features.js'

export default {
    name: 'BluePrints',
    components: {
        PlusIcon,
        EmptyState,
        BlueprintTile
    },
    mixins: [featuresMixin],
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
            if (!this.isSharedLibraryFeatureEnabled) {
                return
            }

            const res = await flowBlueprintsApi.getFlowBlueprintsForTeam(this.team.id)
            if (Object.hasOwnProperty.call(res, 'blueprints')) {
                this.blueprints = res.blueprints
            }
        },
        onBlueprintSelect (blueprint) {
            this.$router.push({ name: 'CreateInstance', query: { blueprintId: blueprint.id } })
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
