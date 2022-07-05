<template>
    <ff-dialog :open="isOpen" header="Delete Project Type" @close="close">
        <template v-slot:default>
            <form class="space-y-6">
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
        <template v-slot:actions>
            <ff-button kind="secondary" @click="close()">Cancel</ff-button>
            <ff-button kind="danger" :disabled="deleteDisabled" @click="confirm()">Delete</ff-button>
        </template>
    </ff-dialog>
</template>

<script>
import { ref } from 'vue'

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
            this.$emit('deleteProjectType', this.projectType)
            this.isOpen = false
        }
    },
    setup () {
        const isOpen = ref(false)
        return {
            isOpen,
            close () {
                isOpen.value = false
            },
            show (projectType) {
                this.projectType = projectType
                this.deleteDisabled = projectType.projectCount > 0
                isOpen.value = true
            }
        }
    }
}
</script>
