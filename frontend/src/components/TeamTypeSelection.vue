<template>
    <div class="space-y-16">
        <div class="flex gap-6 justify-center relative z-10 flex-wrap">
            <team-type-tile
                v-for="type in types" :key="type.id"
                :team-type="type"
                :billingInterval="isAnnualBilling ? 'year' : 'month'"
                :enableCTA="!isBillingEnabled || !isAnnualBilling || !!type.annualBillingPrice"
            />
        </div>
        <div class="flex gap-6 justify-center relative z-10 flex-wrap mt-4">
            <div v-if="isBillingEnabled && annualBillingAvailable" class="text-sm font-medium text-gray-400 flex items-center gap-2">
                <span :class="{'text-gray-800': !isAnnualBilling }">Monthly</span>
                <ff-toggle-switch v-model="isAnnualBilling" />
                <span :class="{'text-gray-800': isAnnualBilling }">Yearly</span>
            </div>
        </div>
    </div>
</template>

<script>
import { mapGetters, mapState } from 'vuex'

import teamTypesApi from '../api/teamTypes.js'

import TeamTypeTile from './TeamTypeTile.vue'

export default {
    name: 'TeamTypeSelection',
    components: {
        'team-type-tile': TeamTypeTile
    },
    data () {
        return {
            isAnnualBilling: false,
            annualBillingAvailable: true,
            types: []
        }
    },
    computed: {
        ...mapState('account', ['user']),
        ...mapGetters('account', ['isBillingEnabled'])
    },
    async created () {
        const { types } = await teamTypesApi.getTeamTypes()
        this.types = types.sort((a, b) => a.order - b.order)
    }
}
</script>
