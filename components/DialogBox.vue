<template>
    <div class="ff-dialog-container" :class="'ff-dialog-container--' + (open ? 'open' : 'closed')">
        <div class="ff-dialog-box">
            <div class="ff-dialog-header">{{ header }}</div>
            <div class="ff-dialog-content" ref="content">
                <slot></slot>
            </div>
            <div class="ff-dialog-actions">
                <slot name="actions">
                    <ff-button @click="$emit('cancel')" kind="secondary">Cancel</ff-button>
                    <ff-button @click="$emit('confirm')">Confirm</ff-button>
                </slot>
            </div>
        </div>
        <div class="ff-dialog-backdrop">

        </div>
    </div>
</template>

<script>
export default {
    name: 'ff-dialog',
    props: {
        open: {
            type: Boolean,
            default: false
        },
        header: {
            type: String,
            default: 'Dialog Box'
        }
    },
    watch: {
        open: function () {
            this.$refs.content.scrollTop = 0
        }
    },
    emits: ['cancel', 'confirm']
}
</script>
