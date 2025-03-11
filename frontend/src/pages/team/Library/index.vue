<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Library" :tabs="navigation">
                <template #context>
                    Common resources that are shared across all of your Team's Node-RED instances.
                </template>
                <template #pictogram>
                    <img src="../../../images/pictograms/library_red.png" alt="logo">
                </template>
                <template #helptext>
                    <p>In Node-RED you can export and import flows and functions, and save them to your Team Library.</p>
                    <p>The contents of your Team Library are available across any of your application instances in FlowFuse.</p>
                    <p>You can read more about <a href="https://nodered.org/docs/user-guide/editor/workspace/import-export" target="_blank">Import &amp; Exporting Flows</a> in the Node-RED documentation</p>
                </template>
            </ff-page-header>
        </template>

        <router-view />
    </ff-page>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
    name: 'SharedLibrary',
    computed: {
        ...mapGetters('account', ['featuresCheck']),
        navigation () {
            const list = [
                {
                    label: 'Team Library',
                    to: {
                        name: 'LibraryTeamLibrary'
                    }
                },
                {
                    label: 'Blueprints',
                    to: {
                        name: 'LibraryBlueprints'
                    }
                }
            ]
            if (this.featuresCheck?.isPrivateRegistryFeatureEnabledForPlatform) {
                list.splice(1, 0, {
                    label: 'Custom Nodes',
                    featureUnavailable: !this.featuresCheck?.isPrivateRegistryFeatureEnabledForPlatform || !this.featuresCheck?.isPrivateRegistryFeatureEnabledForTeam,
                    to: {
                        name: 'LibraryRegistry'
                    }
                })
            }
            return list
        }
    }
}
</script>
