<template>
    <ff-dialog :open="isOpen" header="Delete Stack" @close="close">
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
        <template v-slot:actions>
            <ff-button kind="secondary" @click="close">Cancel</ff-button>
            <ff-button kind="danger" class="ml-4" :disabled="deleteDisabled" @click="confirm">Delete</ff-button>
        </template>
    </ff-dialog>
</template>

<script>
import { ref } from 'vue'

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
            show (template) {
                this.template = template
                this.deleteDisabled = template.projectCount > 0
                isOpen.value = true
            }
        }
    }
}
</script>
