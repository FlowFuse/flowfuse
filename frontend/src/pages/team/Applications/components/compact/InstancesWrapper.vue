<template>
    <section class="ff-applications-list-instances--compact" data-el="application-instances">
        <label class="delimiter">
            <IconNodeRedSolid class="ff-icon ff-icon-sm text-red-800" /> Hosted Instances
        </label>
        <div class="items-wrapper">
            <instance-counter :counter="groupedStates.running ?? 0" state="running" type="hosted" />
            <instance-counter :counter="groupedStates.error ?? 0" state="error" type="hosted" />
            <instance-counter :counter="groupedStates.stopped ?? 0" state="stopped" type="hosted" />
        </div>
    </section>
</template>

<script>
import { mapState } from 'vuex'

import teamApi from '../../../../../api/team.js'

import IconNodeRedSolid from '../../../../../components/icons/NodeRedSolid.js'
import InstanceCounter from '../../../../../components/tiles/InstanceCounter.vue'
import { useInstanceStates } from '../../../../../composables/InstanceStates.js'

export default {
    name: 'InstancesWrapper',
    components: { InstanceCounter, IconNodeRedSolid },
    props: {
        application: {
            type: Object,
            required: true,
            default: null
        }
    },
    setup () {
        const { groupedInstanceStates } = useInstanceStates()

        return {
            groupedInstanceStates
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
            return this.groupedInstanceStates(this.instanceStates)
        }
    },
    mounted () {
        teamApi.getTeamInstanceCounts(this.team.id, [], 'hosted', this.application.id)
            .then(res => {
                this.instanceStates = res
            })
            .catch(e => e)
    }
}
</script>
