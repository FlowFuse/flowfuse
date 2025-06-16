<template>
    <div
        class="rounded-md flex-1 p-3" :class="[`bg-${accent}-50`, `text-${accent}-500`]"
        @click="clicked('running')"
    >
        <p class="title">{{ title }}</p>
        <span class="counter font-extrabold text-4xl">{{ counter }}</span>
    </div>
</template>

<script>
import { mapGetters } from 'vuex'

import teamClient from '../../../../api/team.js'

export default {
    name: 'InstanceStat',
    props: {
        type: {
            required: true,
            type: String
        },
        state: {
            required: true,
            type: String
        }
    },
    data () {
        return {
            counter: 0
        }
    },
    computed: {
        ...mapGetters('account', ['team']),
        accent () {
            switch (this.state) {
            case 'running':
                return 'green'
            case 'error':
                return 'red'
            case 'not-running':
            default:
                return 'gray'
            }
        },
        title () {
            switch (this.state) {
            case 'running':
                return 'Running'
            case 'error':
                return 'Error'
            case 'not-running':
            default:
                return 'Not Running'
            }
        },
        apiStates () {
            switch (this.state) {
            case 'running':
                return ['starting', 'importing',
                    'connected', 'info', 'success', 'pushing', 'pulling',
                    'loading', 'installing', 'safe', 'protected', 'running', 'warning']
            case 'error':
                return ['error', 'crashed']
            case 'not-running':
            default:
                return ['stopping', 'restarting', 'suspending', 'rollback', 'stopped', 'suspended', '']
            }
        }
    },
    mounted () {
        teamClient.getTeamInstanceCounts(this.team.id, this.apiStates, this.type)
            .then(res => {
                this.counter = res.counter
            })
            .catch(e => e)
    },
    methods: {
        clicked (on) {
            // todo figure out why instances with state error get to the FE as suspended
            //  because atm we can't redirect users to any instance page due to it
            // this.$router.push({ name: '' })
        }
    }
}
</script>

<style scoped lang="scss">

</style>
