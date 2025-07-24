<template>
    <section class="ff-applications-list-instances--compact" data-el="application-devices">
        <label class="delimiter">
            <IconDeviceSolid class="ff-icon ff-icon-sm text-teal-700" />
            Remote Instances
        </label>
        <div class="items-wrapper">
            <instance-counter
                v-for="state in states" :key="state"
                :counter="groupedStates[state] ?? 0"
                :state="state"
                type="remote"
                @click="onCounterClick(state)"
            />
        </div>
    </section>
</template>

<script>
import { mapState } from 'vuex'

import teamApi from '../../../../../api/team.js'

import IconDeviceSolid from '../../../../../components/icons/DeviceSolid.js'
import InstanceCounter from '../../../../../components/tiles/InstanceCounter.vue'
import { useInstanceStates } from '../../../../../composables/InstanceStates.js'

export default {
    name: 'DevicesWrapper',
    components: { IconDeviceSolid, InstanceCounter },
    props: {
        application: {
            type: Object,
            required: true,
            default: null
        }
    },
    setup () {
        const { groupBySimplifiedStates, statesMap: instanceStatesMap } = useInstanceStates()

        return {
            groupBySimplifiedStates,
            instanceStatesMap
        }
    },
    data () {
        return {
            instanceStates: { },
            states: ['running', 'error', 'stopped']
        }
    },
    computed: {
        ...mapState('account', ['team']),
        groupedStates () {
            return this.groupBySimplifiedStates(this.instanceStates)
        },
        isSearching () {
            return this.searchQuery.length > 0
        }
    },
    mounted () {
        teamApi.getTeamInstanceCounts(this.team.id, [], 'remote', this.application.id)
            .then(res => {
                this.instanceStates = res
            })
            .catch(e => e)
    },
    methods: {
        onCounterClick (state) {
            const searchQuery = Object.prototype.hasOwnProperty.call(this.instanceStatesMap, state)
                ? this.instanceStatesMap[state].join(' | ')
                : ''

            this.$router.push({
                name: 'ApplicationDevices',
                params: { team_slug: this.team.slug, id: this.application.id },
                query: { searchQuery }
            })
        }
    }
}
</script>

<style scoped lang="scss">

</style>
