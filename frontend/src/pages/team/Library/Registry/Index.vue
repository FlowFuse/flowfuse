<template>
    <div class="-mt-2">
        <SectionTopMenu hero="Custom Node Catalog" info="Your Team's private Node catalog. Here you can publish private npm repositories for your team to use within your Node-RED Instances.">
            <template #tools>
                <ff-button v-if="canPublish" @click="publish">
                    <template #icon-left>
                        <ArrowCircleUpIcon />
                    </template>
                    Publish
                </ff-button>
            </template>
        </SectionTopMenu>
    </div>
    <div>
        <EmptyState v-if="!registry.length" data-el="team-no-devices">
            <template #img>
                <img src="../../../../images/empty-states/team-library.png" alt="placeholder-image">
            </template>
            <template #header>Publish Your First Custom Nodes</template>
            <template #message>
                <p>
                    Store and manage your own private NodeJS and Node-RED packages.
                </p>
                <p>
                    FlowFuse hosts a private NPM registry for your team. Anything you publish to this registry
                    will then be made available to install within all of your Node-RED Instances via the Node-RED Palette Manager.
                </p>
            </template>
            <template #actions>
                <ff-button
                    v-if="canPublish"
                    kind="primary"
                    data-action="publish-package"
                    @click="publish"
                >
                    <template #icon-left>
                        <ArrowCircleUpIcon />
                    </template>
                    Publish
                </ff-button>
            </template>
        </EmptyState>
        <div v-else>
            <RegistryEntry v-for="pkg in registry" :key="pkg.name" :pkg="pkg" />
        </div>
    </div>

    <PublishNodeDialog ref="publishNodeDialog" />
</template>

<script>
import { ArrowCircleUpIcon } from '@heroicons/vue/outline'
import { mapState } from 'vuex'

import TeamAPI from '../../../../api/team.js'

import EmptyState from '../../../../components/EmptyState.vue'
import SectionTopMenu from '../../../../components/SectionTopMenu.vue'

import RegistryEntry from './components/RegistryEntry.vue'

import PublishNodeDialog from './dialogs/PublishNode.vue'

export default {
    name: 'NodeRegistry',
    components: {
        ArrowCircleUpIcon,
        EmptyState,
        SectionTopMenu,
        PublishNodeDialog,
        RegistryEntry
    },
    data () {
        return {
            registryByPackage: []
        }
    },
    computed: {
        ...mapState('account', ['settings', 'team']),
        registry () {
            return Object.values(this.registryByPackage)
        },
        canPublish () {
            // return this.hasPermission('team:publish')
            return true
        }
    },
    mounted () {
        this.loadRegistry()
    },
    methods: {
        async loadRegistry () {
            const registry = await TeamAPI.getTeamRegistry(this.team.id)
            this.registryByPackage = registry.data
        },
        publish () {
            this.$refs.publishNodeDialog.show()
        }
    }
}
</script>
