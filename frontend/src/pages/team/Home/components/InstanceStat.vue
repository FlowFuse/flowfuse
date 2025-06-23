<template>
    <div class="rounded-md flex-1 p-3" :class="[`bg-${accent}-50`, `text-${accent}-500`]">
        <label class="block">{{ title }}</label>
        <span class="counter font-bold text-4xl">{{ counter }}</span>
    </div>
</template>

<script>
import { mapGetters } from 'vuex'

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
        },
        counter: {
            required: true,
            type: Number
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
    }
}
</script>

<style scoped lang="scss">

</style>
