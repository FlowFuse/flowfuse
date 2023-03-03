<template>
    <ff-dialog ref="dialog" header="Import Flows" confirm-label="Import Project" kind="danger" :disablePrimary="disabled" @confirm="confirm()" @cancel="cancel()">
        <template #default>
            <form class="space-y-6" @submit.prevent>
                <div class="mt-2 space-y-2">
                    <p class="text-sm text-gray-500">
                        Replace current flows by uploading a new flow file. This will restart the project to pick up the new flow or credentials
                    </p>
                </div>
                <ImportInstanceComponents id="importSettings" ref="project-components" v-model="parts" />
            </form>
        </template>
    </ff-dialog>
</template>

<script>
import ImportInstanceComponents from '../../components/ImportInstanceComponents'

export default {
    name: 'ImportInstanceDialog',
    components: {
        ImportInstanceComponents
    },
    emits: ['confirm'],
    setup () {
        return {
            async show (project) {
                this.$refs.dialog.show()
                this.project = project
                this.parts = {
                    flows: '',
                    credentials: '',
                    credsSecret: ''
                }
            }
        }
    },
    data () {
        return {
            parts: {
                flows: '',
                credentials: '',
                credsSecret: ''
            }
        }
    },
    computed: {
        disabled () {
            return !(((this.parts.credentials && this.parts.credsSecret) || !this.parts.credentials) && this.parts.flows)
        }
    },
    methods: {
        confirm () {
            const parts = this.parts
            if (parts.credentials && parts.credsSecret && parts.credsSecret.trim()) {
                parts.credsSecret = parts.credsSecret.trim()
            }
            this.$emit('confirm', this.parts)
            // need to clean up
            this.$refs['project-components'].clear()
        },
        cancel () {
            // need to clean up
            this.$refs['project-components'].clear()
        }
    }
}
</script>
