<template>
    <ul v-if="blueprints.length" class="flow-categories-wrapper">
        <li v-for="(flowBlueprints, category) in blueprintsByCategory" :key="category" class="category" data-el="category">
            <h2 class="title">{{ category }}</h2>
            <div class="tiles-wrapper" data-el="tiles-wrapper">
                <BlueprintTile
                    v-for="(blueprint, index) in flowBlueprints"
                    :key="index"
                    class="blueprint-tile"
                    :blueprint="blueprint"
                    :data-el="blueprint.id"
                    @selected="onBlueprintSelect"
                />
            </div>
        </li>
    </ul>
    <EmptyState v-else>
        <template #img>
            <img src="../../../images/empty-states/team-library.png" alt="team-logo">
        </template>
        <template #header>
            <span>No Blueprints Available</span>
        </template>
        <template #message>
            <p v-if="isAdminUser">
                Blueprints can be created in your admin settings. They will be made available to all teams on the platform.
            </p>
            <p v-else>
                Speak to your platform Admin in order to use Blueprints.
            </p>
        </template>
        <template v-if="isAdminUser" #actions>
            <ff-button v-if="isSharedLibraryFeatureEnabled" :to="{name: 'AdminFlowBlueprints'}" data-el="go-to-blueprints">
                Go To Blueprints
            </ff-button>
            <ff-button v-else :to="{name: 'AdminFlowBlueprints'}" :disabled="true">
                Add To Library
                <template #icon-right><PlusIcon /></template>
            </ff-button>
        </template>
    </EmptyState>
</template>

<script>
import { PlusIcon } from '@heroicons/vue/solid'
import { mapGetters, mapState } from 'vuex'

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
        ...mapGetters('account', ['isAdminUser']),
        blueprintsByCategory () {
            return [...this.blueprints].sort((a, b) => {
                return a.order - b.order
            }).reduce((acc, blueprint) => {
                const category = blueprint.category || 'Other';
                (acc[category] = acc[category] || []).push(blueprint)
                return acc
            }, {})
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
      max-width: 250px;
      min-width: 200px;
    }

    .tiles-wrapper {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
    }
  }
}
</style>
