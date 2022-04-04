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
                            <DialogTitle as="h3" class="text-lg font-medium leading-6 text-red-700">Change project stack</DialogTitle>
                            <form class="space-y-6">
                                <div class="mt-2 space-y-2">
                                    <p class="text-sm text-gray-500">
                                        Select the new stack you want to use for this project:
                                    </p>
                                </div>
                                <FormRow :options="stacks" v-model="input.stack">Stack</FormRow>
                                <div class="mt-4 flex flex-row justify-end">
                                    <ff-button kind="secondary" @click="close()">Cancel</ff-button>
                                    <ff-button class="ml-4" @click="confirm()">Change stack</ff-button>
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

import stacksApi from '@/api/stacks'

import FormRow from '@/components/FormRow'

export default {
    name: 'ChangeStackDialog',

    components: {
        TransitionRoot,
        TransitionChild,
        Dialog,
        DialogOverlay,
        DialogTitle,
        FormRow
    },
    data () {
        return {
            input: {
                stack: ''
            },
            stacks: [],
            project: null
        }
    },
    methods: {
        confirm () {
            this.$emit('changeStack', this.input.stack)
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
            async show (project) {
                this.project = project
                this.input.stack = this.project.stack.id
                isOpen.value = true
                const stackList = await stacksApi.getStacks()
                this.stacks = stackList.stacks
                    .filter(stack => (stack.active || stack.id === this.project.stack.id))
                    .map(stack => {
                        return {
                            value: stack.id,
                            label: stack.name + (stack.id === this.project.stack.id ? ' (current)' : '')
                        }
                    })
            }
        }
    }
}
</script>
