<template>
    <div
        class="ff-stat rounded-md flex-1 p-3 cursor-pointer"
        :class="[`bg-${accent}-50`, `text-${accent}-500`, accent]"
        @click="clicked()"
    >
        <label class="block">{{ title }}</label>
        <span class="counter font-bold text-4xl">{{ counter }}</span>
    </div>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
    name: 'InstanceCounter',
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
    emits: ['clicked'],
    computed: {
        ...mapGetters('account', ['team']),
        accent () {
            switch (this.state) {
            case 'running':
                return 'green'
            case 'error':
                return 'red'
            case 'stopped':
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
            case 'stopped':
            default:
                return 'Not Running'
            }
        }
    },
    methods: {
        clicked () {
            this.$emit('clicked', { type: this.type, state: this.state })
        }
    }
}
</script>

<style scoped lang="scss">
.ff-stat {
    border: 1px solid transparent;
    transition: ease-in-out .15s;
    will-change: border-color;

    &:hover {
        &.green {
            border-color: $ff-green-500;
        }
        &.red {
            border-color: $ff-red-500;
        }
        &.gray {
            border-color: $ff-grey-500;
        }
    }
}
</style>
