<template>
    <ff-dialog header="Export Project" :open="isOpen">
        <template v-slot:default>
            <form class="space-y-6">
                <div class="mt-2 space-y-2">
                    <p class="text-sm text-gray-500">
                        Select project components to export:
                    </p>
                </div>
                <ExportProjectComponents id="exportSettings" v-model="parts" showSecret="true"/>
            </form>
        </template>
        <template v-slot:actions>
            <ff-button kind="secondary" @click="close()">Cancel</ff-button>
            <ff-button class="ml-4" @click="confirm()">Export project</ff-button>
        </template>
    </ff-dialog>
</template>

<script>
import { ref } from 'vue'

// import FormRow from '@/components/FormRow'
import ExportProjectComponents from '../../components/ExportProjectComponents'

export default {
    name: 'ExportProjectDialog',
    components: {
        ExportProjectComponents
    },
    data () {
        return {
            parts: {
                flows: true,
                credentials: false,
                nodes: true,
                envVars: true,
                envVarsKo: false
            }
        }
    },
    methods: {
        confirm () {
            const parts = this.parts
            if (parts.creds && parts.credsSecret && parts.credsSecret.trim()) {
                parts.creds = parts.credsSecret.trim()
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
                    credentials: false,
                    nodes: true,
                    envVars: true,
                    envVarsKo: false
                }
                isOpen.value = true
            }
        }
    }
}
</script>
