<template>
    <div
        class="ff-counter rounded flex-1 p-3 cursor-pointer"
        :class="[backgroundColor, `text-${accent}-500`, accent, emptyCounter]"
        :data-state="state"
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
        },
        darkerGray: {
            type: Boolean,
            required: false,
            default: false
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
        },
        backgroundColor () {
            const opacity = (this.accent === 'gray' && this.darkerGray) ? 100 : 50
            return `bg-${this.accent}-${opacity}`
        },
        emptyCounter () {
            return this.counter === 0 ? 'empty' : ''
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
.ff-counter {
    border: 1px solid transparent;
    transition: ease-in-out .15s;
    will-change: border-color;

    &.empty {
        opacity: .3;
    }

    &:hover {
        opacity: 1;

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
