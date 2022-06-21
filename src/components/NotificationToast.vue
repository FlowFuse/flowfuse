<template>
    <div class="ff-notification-toast" :class="'ff-notification-toast--' + type">
        <div class="ff-notification-toast--message">
            <div>
                <span class="ff-notification-toast--bar"></span>
                <slot name="message">
                    {{ message }}
                </slot>
            </div>
            <XIcon v-if="showClose" @click="$emit('close')" class="ff-icon ff-notification-toast--close"/>
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
    }
}
</script>
