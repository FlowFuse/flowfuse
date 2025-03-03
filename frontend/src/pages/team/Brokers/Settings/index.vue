<template>
    <section>
        <BrokerError v-if="brokerState === 'error' && errorCode" :errorCode="errorCode" />
        <BrokerForm :broker="activeBroker" :has-delete-button="true" @delete="onDelete" @submit="onSubmit" />
    </section>
</template>

<script>
import { mapGetters, mapState } from 'vuex'

import Alerts from '../../../../services/alerts.js'

import Dialog from '../../../../services/dialog.js'

import BrokerError from '../components/BrokerError.vue'
import BrokerForm from '../components/BrokerForm.vue'

export default {
    name: 'BrokerSettings',
    components: { BrokerForm, BrokerError },
    props: {
        brokerState: {
            type: String,
            required: true
        },
        errorCode: {
            type: String,
            default: ''
        }
    },
    emits: ['broker-updated'],
    computed: {
        ...mapGetters('product', ['hasFfUnsClients']),
        ...mapState('product', {
            brokers: state => state.UNS.brokers
        }),
        activeBroker () {
            return this.brokers.find(broker => broker.id === this.$route.params.brokerId)
        }
    },
    methods: {
        async onDelete () {
            return Dialog.showAsync({
                header: `Delete ${this.activeBroker.name}`,
                kind: 'danger',
                text: `Are you sure you want to delete your ${this.activeBroker.name} broker configuration?`,
                confirmLabel: 'Yes, delete'
            })
                .then(answer => {
                    if (answer === 'confirm') return this.deleteBroker()
                })
                .catch(e => e)
        },
        deleteBroker () {
            return this.$store.dispatch('product/deleteBroker', this.activeBroker.id)
                .then(() => {
                    let name = 'team-brokers'

                    if (this.brokers.length === 0 && !this.hasFfUnsClients) {
                        name = 'team-brokers-add'
                    }
                    return this.$router.push({ name })
                })
                .catch(e => e)
        },
        onSubmit (payload) {
            if (payload.credentials.username.length && payload.credentials.password.length) {
                delete payload.credentials
            }
            return this.$store.dispatch('product/updateBroker', { payload, brokerId: this.activeBroker.id })
                .then((res) => {
                    this.$emit('broker-updated')
                    Alerts.emit(`Broker ${res.name} updated successfully.`, 'confirmation')
                })
                .catch(e => console.error(e))
        }
    }
}
</script>

<style scoped lang="scss">

</style>
