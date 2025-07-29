<template>
    <section class="ff-applications-list-instances" data-el="application-instances">
        <label class="delimiter">
            Hosted Instances
        </label>
        <div v-if="doesntHaveInstances" class="empty-message">
            <p>
                This Application currently has no
                <router-link :to="{name: 'ApplicationInstances', params: {team_slug: team.slug, id: application.id}}" class="ff-link">attached Hosted Instances</router-link>.
            </p>
        </div>
        <div v-else class="items-wrapper">
            <instance-counter
                v-for="state in states" :key="state"
                :counter="groupedStates[state] ?? 0"
                :state="state"
                type="hosted"
                :darker-gray="true"
                @click="onCounterClick(state)"
            />
        </div>
    </section>
</template>

<script>
import { mapState } from 'vuex'

import teamApi from '../../../../../api/team.js'

import InstanceCounter from '../../../../../components/tiles/InstanceCounter.vue'
import { useInstanceStates } from '../../../../../composables/InstanceStates.js'

export default {
    name: 'InstancesWrapper',
    components: { InstanceCounter },
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
        doesntHaveInstances () {
            return parseInt(this.application.instanceCount) === 0
        }

    },
    mounted () {
        teamApi.getTeamInstanceCounts(this.team.id, [], 'hosted', this.application.id)
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
                name: 'ApplicationInstances',
                params: { team_slug: this.team.slug, id: this.application.id },
                query: { searchQuery }
            })
        }
    }
}
</script>
