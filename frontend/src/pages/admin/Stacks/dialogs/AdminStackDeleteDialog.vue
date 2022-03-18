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
                            <DialogTitle as="h3" class="text-lg font-medium leading-6 text-red-700">Delete stack</DialogTitle>
                            <form class="space-y-6">
                                <div class="mt-2 space-y-2">
                                    <p class="text-sm text-gray-500">
                                        <span v-if="!deleteDisabled">
                                            Are you sure you want to delete this stack?
                                        </span>
                                        <span v-else>
                                            You cannot delete a stack that is still being used by projects.
                                        </span>
                                    </p>
                                </div>
                                <div class="mt-4 flex flex-row justify-end">
                                    <button type="button" class="forge-button-secondary ml-4" @click="close">Cancel</button>
                                    <button type="button" class="forge-button-danger ml-4" :disabled="deleteDisabled" @click="confirm">Delete</button>
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
            stack: null
        }
    },
    methods: {
        confirm () {
            this.$emit('deleteStack', this.stack)
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
            show (stack) {
                this.stack = stack
                this.deleteDisabled = stack.projectCount > 0
                isOpen.value = true
            }
        }
    }
}
</script>
