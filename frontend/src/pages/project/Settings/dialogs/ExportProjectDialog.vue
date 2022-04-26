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
                            <DialogTitle as="h3" class="text-lg font-medium leading-6 text-red-700">Export project</DialogTitle>
                            <form class="space-y-6">
                                <div class="mt-2 space-y-2">
                                    <p class="text-sm text-gray-500">
                                        Select project components to export:
                                    </p>
                                </div>
                                <ExportProjectComponents id="exportSettings" v-model="parts" />
                                <div class="mt-4 flex flex-row justify-end">
                                    <ff-button kind="secondary" @click="close()">Cancel</ff-button>
                                    <ff-button class="ml-4" @click="confirm()">Export project</ff-button>
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

// import FormRow from '@/components/FormRow'
import ExportProjectComponents from '../../components/ExportProjectComponents'

export default {
    name: 'ExportProjectDialog',
    components: {
        TransitionRoot,
        TransitionChild,
        Dialog,
        DialogOverlay,
        DialogTitle,
        ExportProjectComponents
    },
    data () {
        return {
            parts: {
                flows: true,
                creds: false,
                nodes: true,
                envVars: true,
                envVarsKo: false,
                settings: true
            }
        }
    },
    methods: {
        confirm () {
            const parts = this.parts
            if (parts.creds && parts.credsSecret) {
                parts.creds = parts.credsSecret
                delete parts.credsSecret
            }
            this.$emit('exportProject', this.parts)
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
                this.parts = {
                    flows: true,
                    creds: false,
                    nodes: true,
                    envVars: true,
                    envVarsKo: false,
                    settings: true
                }
                isOpen.value = true
            }
        }
    }
}
</script>
