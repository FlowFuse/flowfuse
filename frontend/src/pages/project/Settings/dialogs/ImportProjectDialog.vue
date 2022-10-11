<template>
    <ff-dialog ref="dialog" header="Import Flows" confirm-label="Import Project" @confirm="confirm()" kind="danger" :disablePrimary="disabled">
        <template v-slot:default>
            <form class="space-y-6" @submit.prevent>
                <div class="mt-2 space-y-2">
                    <p class="text-sm text-gray-500">
                        Replace current flows by uploading a new flow file. This will restart the project to pick up the new flow or credentials
                    </p>
                </div>
                <ImportProjectComponents id="importSettings" v-model="parts"/>
            </form>
        </template>
    </ff-dialog>
</template>

<script>
import ImportProjectComponents from '../../components/ImportProjectComponents'

export default {
    name: 'ImportProjectDialog',
    emits: ['confirm'],
    components: {
        ImportProjectComponents
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
    methods: {
        confirm () {
            const parts = this.parts
            if (parts.credentials && parts.credsSecret && parts.credsSecret.trim()) {
                parts.credsSecret = parts.credsSecret.trim()
            }
            console.log('confirm')
            this.$emit('confirm', this.parts)
        }
    },
    computed: {
        disabled () {
            return !(((this.parts.credentials && this.parts.credsSecret) || !this.parts.credentials) && this.parts.flows)
        }
    },
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
    }
}
</script>
