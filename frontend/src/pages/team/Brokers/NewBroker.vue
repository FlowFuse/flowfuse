<template>
    <BrokerForm :has-back-button="true" @submit="onSubmit" />
</template>

<script>

import { mapActions } from 'pinia'
import { mapGetters } from 'vuex'

import BrokerForm from './components/BrokerForm.vue'

import { useProductBrokersStore } from '@/stores/product-brokers.js'

export default {
    name: 'NewBroker',
    components: { BrokerForm },
    computed: {
        ...mapGetters('account', ['featuresCheck'])
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
