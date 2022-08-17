<template>
    <ff-dialog ref="dialog" header="Export Project" confirm-label="Export Project" @confirm="confirm()">
        <template v-slot:default>
            <form class="space-y-6" @submit.prevent>
                <div class="mt-2 space-y-2">
                    <p class="text-sm text-gray-500">
                        Select project components to export:
                    </p>
                </div>
                <ExportProjectComponents id="exportSettings" v-model="parts" showSecret="true"/>
            </form>
        </template>
    </ff-dialog>
</template>

<script>

// import FormRow from '@/components/FormRow'
import ExportProjectComponents from '../../components/ExportProjectComponents'

export default {
    name: 'ExportProjectDialog',
    emits: ['confirm'],
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
            this.$emit('confirm', this.parts)
        }
    },
    setup () {
        return {
            async show (project) {
                this.$refs.dialog.show()
                this.project = project
                this.parts = {
                    flows: true,
                    credentials: false,
                    nodes: true,
                    envVars: true,
                    envVarsKo: false
                }
            }
        }
    }
}
</script>
