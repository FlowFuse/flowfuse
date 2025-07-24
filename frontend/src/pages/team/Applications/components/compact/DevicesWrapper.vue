<template>
    <section class="ff-applications-list-instances--compact" data-el="application-devices">
        <label class="delimiter">
            <IconDeviceSolid class="ff-icon ff-icon-sm text-teal-700" />
            Remote Instances
        </label>
        <div class="items-wrapper">
            <instance-counter :counter="groupedStates.running ?? 0" state="running" type="remote" />
            <instance-counter :counter="groupedStates.error ?? 0" state="error" type="remote" />
            <instance-counter :counter="groupedStates.stopped ?? 0" state="stopped" type="remote" />
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
        const { groupBySimplifiedStates } = useInstanceStates()

        return {
            groupBySimplifiedStates
        }
    },
    data () {
        return {
            instanceStates: { }
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
    }
}
</script>

<style scoped lang="scss">

</style>
