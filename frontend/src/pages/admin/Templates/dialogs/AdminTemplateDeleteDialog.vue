<template>
    <ff-dialog ref="dialog" header="Delete Stack" kind="danger" confirm-label="Delete" @confirm="confirm()" :disable-primary="deleteDisabled">
        <template v-slot:default>
            <form class="space-y-6">
                <div class="mt-2 space-y-2">
                    <p class="text-sm text-gray-500">
                        <span v-if="!deleteDisabled">
                            Are you sure you want to delete this template?
                        </span>
                        <span v-else>
                            You cannot delete a template that is still being used by projects.
                        </span>
                    </p>
                </div>
            </form>
        </template>
    </ff-dialog>
</template>

<script>

export default {
    name: 'AdminStackDeleteDialog',
    data () {
        return {
            deleteDisabled: false,
            template: null
        }
    },
    methods: {
        confirm () {
            this.$emit('deleteTemplate', this.template)
        }
    },
    setup () {
        return {
            show (template) {
                this.$refs.dialog.show()
                this.template = template
                this.deleteDisabled = template.projectCount > 0
            }
        }
    }
}
</script>
