<template>
    <div class="ff-notification-toast" :class="'ff-notification-toast--' + type">
        <div class="ff-notification-toast--message">
            <div>
                <span class="ff-notification-toast--bar"></span>
                <slot name="message">
                    {{ message }}
                </slot>
            </div>
            <span class="ff-notification-toast--close">
                <XIcon v-if="showClose" @click="close()" />
                <div class="countdown-wrapper" v-if="countdown">
                    <div class="countdown-pie countdown-spinner" :style="'animation: rota ' + (countdown/1000) + 's linear infinite;'"></div>
                    <div class="countdown-pie countdown-filler" :style="'animation: fill ' + (countdown/1000) + 's steps(1, end) infinite;'"></div>
                    <div class="countdown-mask" :style="'animation: mask ' + (countdown/1000) + 's steps(1, end) infinite;'"></div>
                </div>
            </span>
        </div>
        <div v-if="showActions" class="ff-notification-toast--actions">
            <slot name="actions"></slot>
        </div>
    </div>
</template>

<script>

import { XIcon } from '@heroicons/vue/solid'

export default {
    name: 'ff-notification-toast',
    emits: ['close'],
    props: {
        message: {
            default: null,
            type: String
        },
        type: {
            default: 'info',
            type: String
        },
        countdown: {
            default: null,
            type: Number
        },
        showClose: {
            default: true,
            type: Boolean
        }
    },
    components: {
        XIcon
    },
    computed: {
        showActions: function () {
            return this.$slots.actions
        }
    },
    mounted () {
        if (this.countdown) {
            // if a countdown is set, emit the "close" event after the countdown timer expires
            setTimeout(() => {
                this.close()
            }, this.countdown)
        }
    },
    methods: {
        close: function () {
            this.$emit('close')
        }
    }
}
</script>
