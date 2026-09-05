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
                    :display-external-url-button="true"
                    @selected="onBlueprintSelect"
                />
            </div>
        </li>
    </ul>
    <EmptyState v-else :featureUnavailable="!featuresCheck.isBlueprintsFeatureEnabled" :featureUnavailableToTeam="!featuresCheck.isBlueprintsFeatureEnabledForTeam">
        <template #img>
            <img src="../../../images/empty-states/team-library.png" alt="team-logo">
        </template>
        <template #header>
            <span>{{ $t('ui.noBlueprintsAvailable') }}</span>
        </template>
        <template #message>
            <p v-if="isAdminUser">
                {{ $t('ui.blueprintsCanBeCreatedInYourAdminSettingsTheyWil') }}
            </p>
            <p v-else>
                {{ $t('ui.speakToYourPlatformAdminInOrderToUseBlueprints') }}
            </p>
        </template>
        <template v-if="isAdminUser" #actions>
            <ff-button v-if="featuresCheck.isSharedLibraryFeatureEnabled" :to="{name: 'admin-flow-blueprints'}" data-el="go-to-blueprints">
                {{ $t('ui.goToBlueprints') }}
            </ff-button>
            <ff-button v-else :to="{name: 'admin-templates-template'}" :disabled="true">
                {{ $t('ui.addToLibrary') }}
                <template #icon-right><PlusIcon /></template>
            </ff-button>
        </template>
    </EmptyState>
</template>

<script>
import { PlusIcon } from '@heroicons/vue/20/solid'
import { mapState } from 'pinia'

import flowBlueprintsApi from '../../../api/flowBlueprints.js'
import EmptyState from '../../../components/EmptyState.vue'
import BlueprintTile from '../../../components/blueprints/BlueprintTile.vue'

import { useAccountAuthStore } from '@/stores/account-auth.js'
import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'

export default {
    name: 'BluePrints',
    components: {
        PlusIcon,
        EmptyState,
        BlueprintTile
    },
    data () {
        return {
            blueprints: []
        }
    },
    computed: {
        ...mapState(useAccountSettingsStore, ['featuresCheck']),
        ...mapState(useContextStore, ['team']),
        ...mapState(useAccountAuthStore, ['isAdminUser']),
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
            if (this.featuresCheck.isBlueprintsFeatureEnabled && this.featuresCheck.isBlueprintsFeatureEnabledForTeam) {
                const res = await flowBlueprintsApi.getFlowBlueprintsForTeam(this.team.id)
                if (Object.hasOwnProperty.call(res, 'blueprints')) {
                    this.blueprints = res.blueprints
                }
            }
        },
        onBlueprintSelect (blueprint) {
            this.$router.push({ name: 'team-instance-create', query: { blueprintId: blueprint.id } })
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
