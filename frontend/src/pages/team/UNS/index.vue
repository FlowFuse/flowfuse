<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Unified Namespace" :tabs="tabs">
                <template #context>
                    A list of the recent Topicss used by your team on the FlowFuse MQTT Broker.
                </template>
                <template #pictogram>
                    <img alt="info" src="../../../images/pictograms/mqtt_broker_red.png">
                </template>
                <template #helptext>
                    <p>The <b>Unified Namespace (UNS)</b> feature provides a centralized framework for managing and visualizing your entire data ecosystem, consolidating MQTT broker instances and topic structures within a single interface.</p>
                    <p>Within the UNS, <b>Client</b> page enables seamless client management with customizable Access Control List (ACL) rules for secure and controlled data flow. The topic <b>Hierarchy</b> offers a clear, organized visualization of topic structures, providing fine-grained control over publishing and subscribing permissions.</p>
                    <p>Together, these components deliver an integrated approach to managing client connections, security settings, and message flow, supporting efficient and secure data communication across your system.</p>
                </template>
            </ff-page-header>
        </template>

        <router-view />
    </ff-page>
</template>

<script>

import usePermissions from '../../../composables/Permissions.js'
import { Roles } from '../../../utils/roles.js'

export default {
    name: 'UnifiedNameSpace',
    setup () {
        const { hasAMinimumTeamRoleOf } = usePermissions()

        return { hasAMinimumTeamRoleOf }
    },
    computed: {
        tabs () {
            return [
                { label: 'Hierarchy', to: { name: 'team-namespace-hierarchy' }, tag: 'team-namespace-hierarchy' },
                { label: 'Clients', to: { name: 'team-namespace-clients' }, tag: 'team-namespace-clients' }
            ]
        }
    },
    mounted () {
        if (!this.hasAMinimumTeamRoleOf(Roles.Member)) {
            return this.$router.push({ name: 'Home' })
        }
    }
}
</script>

<style scoped lang="scss">

</style>
