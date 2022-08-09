<template>
    <ff-dialog ref="dialog" header="Delete Project Type" kind="danger" confirm-label="Delete" @confirm="confirm()" :disable-primary="deleteDisabled">
        <template v-slot:default>
            <form class="space-y-6" @submit.prevent>
                <div class="mt-2 space-y-2">
                    <p>
                        <span v-if="!deleteDisabled">
                            Are you sure you want to delete this project type?
                        </span>
                        <span v-else>
                            You cannot delete a project type that is still being used by projects.
                        </span>
                    </p>
                </div>
            </form>
        </template>
    </ff-dialog>
</template>

<script>

export default {
    name: 'ProjectTypeDeleteDialog',
    emits: ['deleteProjectType'],
    data () {
        return {
            deleteDisabled: false,
            projectType: null
        }
    },
    methods: {
        confirm () {
            if (!this.deleteDisabled) {
                this.$emit('deleteProjectType', this.projectType)
            }
        }
    },
    setup () {
        return {
            show (projectType) {
                this.$refs.dialog.show()
                this.projectType = projectType
                this.deleteDisabled = projectType.projectCount > 0
            }
        }
    }
}
</script>
