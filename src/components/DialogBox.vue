<template>
    <div class="ff-dialog-container" :class="'ff-dialog-container--' + (open ? 'open' : 'closed')">
        <div class="ff-dialog-box">
            <div class="ff-dialog-header">{{ header }}</div>
            <div ref="content" class="ff-dialog-content">
                <slot></slot>
            </div>
            <div class="ff-dialog-actions">
                <slot name="actions">
                    <ff-button kind="secondary" @click="cancel()">Cancel</ff-button>
                    <ff-button :kind="kind" :disabled="disablePrimary" @click="confirm()">{{ confirmLabel }}</ff-button>
                </slot>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'ff-dialog',
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
    emits: ['cancel', 'confirm'],
    data () {
        return {
            open: false
        }
    },
    watch: {
        open: function () {
            this.$refs.content.scrollTop = 0
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
