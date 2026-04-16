<template>
    <BrokerForm :has-back-button="true" @submit="onSubmit" />
</template>

<script>

import { mapActions, mapState } from 'pinia'

import BrokerForm from './components/BrokerForm.vue'

import { useAccountSettingsStore } from '@/stores/account-settings.js'

import { useProductBrokersStore } from '@/stores/product-brokers.js'

export default {
    name: 'NewBroker',
    components: { BrokerForm },
    computed: {
        ...mapState(useAccountSettingsStore, ['featuresCheck'])
    },
    mounted () {
        if (!this.featuresCheck.isExternalMqttBrokerFeatureEnabled) {
            this.$router.push({ name: 'team-brokers' })
        }
    },
    methods: {
        ...mapActions(useProductBrokersStore, ['createBroker']),
        onSubmit (payload) {
            return this.createBroker(payload)
                .then(res => this.$router.push({
                    name: 'team-brokers-hierarchy',
                    params: { brokerId: res.id }
                }))
                .catch(e => console.error(e))
        }
    }
}
</script>
