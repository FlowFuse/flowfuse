<template>
    <BrokerForm :has-back-button="true" @submit="onSubmit" />
</template>

<script>

import BrokerForm from './components/BrokerForm.vue'

export default {
    name: 'NewBroker',
    components: { BrokerForm },
    methods: {
        onSubmit (payload) {
            return this.$store.dispatch('product/createBroker', payload)
                .then(res => this.$router.push({
                    name: 'team-brokers-hierarchy',
                    params: { brokerId: res.id }
                }))
                .catch(e => console.error(e))
        }
    }
}
</script>
