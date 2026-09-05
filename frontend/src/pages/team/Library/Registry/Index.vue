<template>
    <div class="banner-wrapper">
        <FeatureUnavailable v-if="!featuresCheck.isPrivateRegistryFeatureEnabledForPlatform" />
        <FeatureUnavailableToTeam v-else-if="!featuresCheck.isPrivateRegistryFeatureEnabledForTeam" />
    </div>
    <div class="-mt-2">
        <SectionTopMenu :hero="$t('ui.customNodeCatalog')" :info="$t('ui.yourTeamSPrivateNodeCatalogHereYouCanPublishPriv')">
            <template #tools>
                <div v-if="enabled" class="flex gap-2">
                    <ff-button
                        kind="secondary"
                        data-action="refresh-registry"
                        @click="loadRegistry"
                    >
                        <template #icon-left>
                            <ArrowPathIcon />
                        </template>
                        {{ $t('ui.refresh') }}
                    </ff-button>
                    <ff-button
                        v-if="canPublish"
                        data-action="publish-package"
                        @click="publish"
                    >
                        <template #icon-left>
                            <ArrowUpCircleIcon />
                        </template>
                        {{ $t('ui.publish') }}
                    </ff-button>
                </div>
            </template>
        </SectionTopMenu>
    </div>
    <div>
        <div v-if="loading">
            <ff-loading :message="$t('ui.loadingRegistry')" />
        </div>
        <EmptyState v-else-if="!registry.length" data-el="team-no-devices">
            <template #img>
                <img src="../../../../images/empty-states/team-library.png" alt="placeholder-image">
            </template>
            <template #header>{{ $t('ui.publishYourFirstCustomNodes') }}</template>
            <template #message>
                <p>
                    {{ $t('ui.storeAndManageYourOwnPrivateNodejsAndNodeRedPack') }}
                </p>
                <p>
                    {{ $t('ui.flowfuseHostsAPrivateNpmRegistryForYourTeamAnyth') }}
                </p>
            </template>
            <template v-if="enabled" #actions>
                <ff-button
                    kind="secondary"
                    data-action="refresh-registry"
                    @click="loadRegistry"
                >
                    <template #icon-left>
                        <ArrowPathIcon />
                    </template>
                    {{ $t('ui.refresh') }}
                </ff-button>
                <ff-button
                    v-if="canPublish"
                    kind="primary"
                    data-action="publish-package"
                    @click="publish"
                >
                    <template #icon-left>
                        <ArrowUpCircleIcon />
                    </template>
                    {{ $t('ui.publish') }}
                </ff-button>
            </template>
        </EmptyState>
        <div v-else class="mt-3 space-y-2">
            <label class="block text-lg font-medium" data-el="registry-count">{{ $t('ui.p0Package', { p0: registry.length }) }}<template v-if="registry.length > 1">s</template></label>
            <ul class="ff-registry-list">
                <RegistryEntry v-for="pkg in registry" :key="pkg.name" :pkg="pkg" />
            </ul>
        </div>
    </div>

    <PublishNodeDialog ref="publishNodeDialog" />
</template>

<script>
import { ArrowPathIcon, ArrowUpCircleIcon } from '@heroicons/vue/24/outline'
import { mapState } from 'pinia'

import TeamAPI from '../../../../api/team.js'

import EmptyState from '../../../../components/EmptyState.vue'
import SectionTopMenu from '../../../../components/SectionTopMenu.vue'
import FeatureUnavailable from '../../../../components/banners/FeatureUnavailable.vue'
import FeatureUnavailableToTeam from '../../../../components/banners/FeatureUnavailableToTeam.vue'

import RegistryEntry from './components/RegistryEntry.vue'

import PublishNodeDialog from './dialogs/PublishNode.vue'

import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'

export default {
    name: 'NodeRegistry',
    components: {
        ArrowUpCircleIcon,
        EmptyState,
        SectionTopMenu,
        PublishNodeDialog,
        RegistryEntry,
        ArrowPathIcon,
        FeatureUnavailable,
        FeatureUnavailableToTeam
    },
    data () {
        return {
            loading: false,
            registryByPackage: []
        }
    },
    computed: {
        ...mapState(useContextStore, ['team']),
        ...mapState(useAccountSettingsStore, ['featuresCheck']),
        enabled () {
            return this.featuresCheck?.isPrivateRegistryFeatureEnabledForPlatform && this.featuresCheck?.isPrivateRegistryFeatureEnabledForTeam
        },
        canPublish () {
            // user has access to publish
            return true
        },
        registry () {
            return Object.values(this.registryByPackage)
        }
    },
    mounted () {
        this.loadRegistry()
    },
    methods: {
        async loadRegistry () {
            this.loading = true
            if (this.enabled) {
                const registry = await TeamAPI.getTeamRegistry(this.team.id)
                if (registry.data) {
                    this.registryByPackage = registry.data
                }
            }
            this.loading = false
        },
        publish () {
            this.$refs.publishNodeDialog.show()
        }
    }
}
</script>

<style lang="scss" scoped>
.ff-registry-list {
    display: grid;
    gap: 6px;
}
</style>
