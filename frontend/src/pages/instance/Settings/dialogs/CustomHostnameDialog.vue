<template>
    <ff-dialog
        ref="dialog"
        confirm-label="Restart"
        data-el="change-custom-hostname"
        header="Set Custom Hostname"
        kind="danger"
        @confirm="confirm()"
    >
        <template #default>
            <form class="space-y-4" @submit.prevent>
                <p>
                    Changing the Custom Hostname for an instance will cause it to be restarted.
                </p>
            </form>
        </template>
    </ff-dialog>
</template>

<script>

export default {
    name: 'CustomHostnameDialog',
    emits: ['confirm'],
    setup () {
        return {
            show (instance) {
                this.instance = instance
                this.$refs.dialog.show()
            }
        }
    },
    data () {
        return {
            instance: null
        }
    },
    methods: {
        confirm () {
            this.$emit('confirm')
        }
    }
}
</script>
