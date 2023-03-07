<template>
    <div class="w-full max-w-4xl" data-el="change-project">
        <ff-loading v-if="saving" message="Updating Instance..." />
        <InstanceForm v-else :instance="instanceDetails || instance" :team="team" :billingEnabled="!!features.billing" @on-submit="changeInstanceDefinition" />
    </div>
</template>

<script>
import { mapState } from 'vuex'

import InstanceApi from '../../../api/instances'

import InstanceForm from '../components/InstanceForm'

import Alerts from '@/services/alerts'

export default {
    name: 'ChangeInstanceType',
    components: {
        InstanceForm
    },
    inheritAttrs: false,
    props: {
        instance: {
            required: true,
            type: Object
        }
    },
    emits: ['instance-updated'],
    data () {
        return {
            saving: false,
            instanceDetails: null
        }
    },
    computed: {
        ...mapState('account', ['team', 'features'])
    },
    methods: {
        changeInstanceDefinition (instanceDetails) {
            if (typeof instanceDetails.projectType !== 'string' || instanceDetails.projectType === '') {
                Alerts.emit('No instance is selected. Try refreshing your browser and try again', 'warning', 3500)
                return
            }
            const changePayload = { ...instanceDetails, team: this.team.id }
            this.saving = true
            InstanceApi.updateInstance(this.instance.id, changePayload).then(() => {
                this.$emit('instance-updated')
                Alerts.emit('Instance successfully updated.', 'confirmation')
                this.$router.push({
                    name: 'Instance'
                })
            }).catch(err => {
                console.warn(err)
                Alerts.emit('Instance update failed.', 'warning')
                this.instanceDetails = { ...instanceDetails, id: this.instance.id }
            }).finally(() => {
                this.saving = false
            })
        }
    }
}
</script>
