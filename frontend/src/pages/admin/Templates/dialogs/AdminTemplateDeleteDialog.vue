<template>
    <TransitionRoot appear :show="isOpen" as="template">
        <Dialog as="div" @close="close">
            <div class="fixed inset-0 z-10 overflow-y-auto">
                <div class="min-h-screen px-4 text-center">
                    <DialogOverlay class="fixed inset-0 bg-black opacity-50" />
                    <span class="inline-block h-screen align-middle" aria-hidden="true">
                        &#8203;
                    </span>
                    <TransitionChild
                        as="template"
                        enter="duration-300 ease-out"
                        enter-from="opacity-0 scale-95"
                        enter-to="opacity-100 scale-100"
                        leave="duration-200 ease-in"
                        leave-from="opacity-100 scale-100"
                        leave-to="opacity-0 scale-95"
                    >
                        <div class="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-lg rounded">
                            <DialogTitle as="h3" class="text-lg font-medium leading-6 text-red-700">Delete template</DialogTitle>
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
                                <div class="mt-4 flex flex-row justify-end">
                                    <ff-button kind="secondary" @click="close">Cancel</ff-button>
                                    <ff-button kind="danger" class="ml-4" :disabled="deleteDisabled" @click="confirm">Delete</ff-button>
                                </div>
                            </form>
                        </div>
                    </TransitionChild>
                </div>
            </div>
        </Dialog>
    </TransitionRoot>
</template>

<script>
import { ref } from 'vue'
import {
    TransitionRoot,
    TransitionChild,
    Dialog,
    DialogOverlay,
    DialogTitle
} from '@headlessui/vue'

export default {
    name: 'AdminStackDeleteDialog',

    components: {
        TransitionRoot,
        TransitionChild,
        Dialog,
        DialogOverlay,
        DialogTitle
    },
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
