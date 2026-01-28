<template>
    <ff-dialog ref="dialog" header="Grant Administrator Privileges?" kind="danger" confirm-label="Grant Admin Access" @confirm="confirm()" @cancel="cancel()">
        <template #default>
            <div class="space-y-4">
                <p class="text-sm text-gray-700">
                    Administrator privileges grant <span class="font-bold">full access to the platform</span>, including:
                </p>
                <ul class="list-disc list-inside text-sm text-gray-600 space-y-1 ml-2">
                    <li>Managing all users and teams</li>
                    <li>Accessing system settings and configuration</li>
                    <li>Viewing and modifying all projects and instances</li>
                    <li>Managing platform licenses and billing</li>
                </ul>
                <p class="text-sm text-red-700 font-semibold mt-4">
                    This is a sensitive permission. Only grant to trusted users.
                </p>
            </div>
        </template>
    </ff-dialog>
</template>

<script>

export default {
    name: 'ConfirmAdminGrantDialog',
    emits: ['confirmed', 'cancel'],
    setup () {
        return {
            show () {
                this.$refs.dialog.show()
            }
        }
    },
    methods: {
        confirm () {
            this.$emit('confirmed')
            this.$refs.dialog.close()
        },
        cancel () {
            this.$emit('cancel')
            this.$refs.dialog.close()
        }
    }
}
</script>
