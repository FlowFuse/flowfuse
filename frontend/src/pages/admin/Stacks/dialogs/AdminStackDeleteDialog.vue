<template>
    <ff-dialog ref="dialog" header="Delete Stack" kind="danger" confirm-label="Delete" @confirm="confirm" :disable-primary="deleteDisabled">
        <template v-slot:default>
            <form class="space-y-6" @submit.prevent>
                <div class="mt-2 space-y-2">
                    <p>
                        <span v-if="!deleteDisabled">
                            Are you sure you want to delete this stack?
                        </span>
                        <span v-else>
                            You cannot delete a stack that is still being used by projects.
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
    emits: ['deleteStack'],
    data () {
        return {
            deleteDisabled: false,
            stack: null
        }
    },
    methods: {
        confirm () {
            if (!this.deleteDisabled) {
                this.$emit('deleteStack', this.stack)
            }
        }
    },
    setup () {
        return {
            show (stack) {
                this.$refs.dialog.show()
                this.stack = stack
                this.deleteDisabled = stack.projectCount > 0
            }
        }
    }
}
</script>
