<template>
    <div class="ff-dialog-container" :class="'ff-dialog-container--' + (open ? 'open' : 'closed')">
        <div class="ff-dialog-box">
            <div class="ff-dialog-header">{{ header }}</div>
            <div class="ff-dialog-content" ref="content">
                <slot></slot>
            </div>
            <div class="ff-dialog-actions">
                <slot name="actions">
                    <ff-button @click="cancel()" kind="secondary">Cancel</ff-button>
                    <ff-button @click="confirm()" :kind="kind" :disabled="disablePrimary">{{ confirmLabel }}</ff-button>
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
    emits: ['cancel', 'confirm'],
    props: {
        header: {
            type: String,
            default: 'Dialog Box'
        },
        confirmLabel: {
            type: String,
            default: 'Confirm'
        },
        disablePrimary: {
            type: Boolean,
            default: false
        },
        kind: {
            type: String,
            default: 'primary'
        },
        closeOnConfirm: {
            type: Boolean,
            default: true
        }
    },
    watch: {
        open: function () {
            this.$refs.content.scrollTop = 0
        }
    },
    data () {
        return {
            open: false
        }
    },
    methods: {
        show () {
            this.open = true
        },
        close () {
            this.open = false
        },
        cancel () {
            this.close()
            this.$emit('cancel')
        },
        confirm () {
            if (this.closeOnConfirm) {
                this.close()
            }
            this.$emit('confirm')
        }
    }
}
</script>
