<template>
    <section>
        <BrokerForm :broker="activeBroker" />
    </section>
</template>

<script>
import { mapState } from 'vuex'

import BrokerForm from '../components/BrokerForm.vue'

export default {
    name: 'BrokerSettings',
    components: { BrokerForm },
    computed: {
        ...mapState('product', {
            brokers: state => state.UNS.brokers
        }),
        activeBroker () {
            return this.brokers.find(broker => broker.id === this.$route.params.brokerId)
        }
    }
}
</script>

<style scoped lang="scss">

</style>
