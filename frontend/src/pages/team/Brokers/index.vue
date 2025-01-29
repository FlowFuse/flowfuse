<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Broker" :tabs="tabs">
                <template #context>
                    View the recently used topics and configure clients for your FlowFuse MQTT Broker.
                </template>
                <template #pictogram>
                    <img alt="info" src="../../../images/pictograms/mqtt_broker_red.png">
                </template>
                <template #helptext>
                    <p>The <b>Broker</b> feature provides a centralized framework for managing and visualizing your entire data ecosystem, consolidating MQTT broker instances and topic structures within a single interface.</p>
                    <p>Within the Broker, <b>Client</b> page allows you to manage the clients that have access to the Broker, with customizable Access Control List (ACL) rules for secure and controlled data flow.</p>
                    <p>The topic <b>Hierarchy</b> offers a clear, organized visualization of the topics being used within your broker.</p>
                    <p>Together, these components deliver an integrated approach to managing client connections, security settings, and message flow, supporting efficient and secure data communication across your system.</p>
                    <p>Documentation <a href="https://flowfuse.com/docs/user/teambroker" target="_blank">here</a></p>
                </template>
            </ff-page-header>
        </template>

        <router-view />
    </ff-page>
</template>

<script>

import { mapActions, mapGetters } from 'vuex'

import usePermissions from '../../../composables/Permissions.js'
import { Roles } from '../../../utils/roles.js'

export default {
    name: 'TeamBrokers',
    setup () {
        const { hasAMinimumTeamRoleOf } = usePermissions()

        return { hasAMinimumTeamRoleOf }
    },
    computed: {
        ...mapGetters('account', ['featuresCheck']),
        ...mapGetters('product', ['hasFfUnsClients', 'hasOtherBrokers']),
        tabs () {
            if (!this.hasOtherBrokers && (!this.hasFfUnsClients || this.isCreatingFirstClient)) {
                // hides tabs while configuring a broker
                return []
            }
            return [
                { label: 'Hierarchy', to: { name: 'team-brokers-hierarchy' }, tag: 'team-brokers-hierarchy' },

                // todo should be hidden when third party broker is displayed
                { label: 'Clients', to: { name: 'team-brokers-clients' }, tag: 'team-brokers-clients' },

                // todo should be hidden when the ff broker is displayed
                {
                    label: 'Settings',
                    to: { name: 'team-brokers-settings', params: { id: 1 /* todo hardcoded */ } },
                    tag: 'team-brokers-settings'
                }
            ]
        },
        isCreatingFirstClient () {
            return Object.hasOwnProperty.call(this.$route.query, 'creating-client')
        }
    },
    watch: {
        team: 'fetchData'
    },
    async mounted () {
        if (!this.hasAMinimumTeamRoleOf(Roles.Member)) {
            return this.$router.push({ name: 'Home' })
        }

        await this.fetchData()

        if (!this.hasOtherBrokers && (!this.hasFfUnsClients && !this.isCreatingFirstClient)) {
            return this.$router.push({ name: 'team-brokers-add' })
        }
    },
    methods: {
        ...mapActions('product', ['fetchUnsClients']),
        async fetchData () {
            if (this.featuresCheck.isMqttBrokerFeatureEnabled) {
                this.loading = true
                return this.$store.dispatch('product/fetchUnsClients')
                    .catch(err => console.error(err))
                    .then(() => this.$store.dispatch('product/getBrokers'))
                    .catch(err => console.error(err))
                    .finally(() => {
                        this.loading = false
                    })
            }
        }
    }
}
</script>

<style scoped lang="scss">

</style>
