<template>
    <div class="space-y-4 my-3">
        <FormRow type="file" accept=".json" ref="flows" v-model="localData.flows" :error="errors.flows">
            Flow File
        </FormRow>
        <FormRow type="file" accept=".json" ref="creds" v-model="localData.creds" :errors="errors.creds">
            Credentials File
        </FormRow>
        <FormRow :disabled="withCreds" type="text" v-model="localData.secret">
            Credentials Secret
        </FormRow>
    </div>
</template>

<script>
import FormRow from '@/components/FormRow'

export default {
    name: 'ImportProjectComponent',
    components: {
        FormRow
    },
    props: ['modelValue'],
    data () {
        return {
            disableCredsSecret: true,
            localData: {
                flows: '',
                creds: '',
                secret: ''
            },
            errors: {
                flows: '',
                creds: '',
                secret: ''
            }
        }
    },
    mounted () {
        this.disableCredsSecret = true
        this.localData.flows = null
        this.localData.creds = null
        this.localData.secret = ''
    },
    watch: {
        localData: {
            deep: true,
            handler (value) {
                if (value.flows?.val) {
                    this.getFlowFile(value.flows.obj.files[0])
                }
                if (value.creds?.val) {
                    this.disableCredsSecret = false
                    this.getCredsFile(value.creds.obj.files[0])
                }

                this.parts.credsSecret = value.secret
            }
        }
    },
    methods: {
        getFlowFile (file) {
            const reader = new FileReader()
            reader.onload = (evt) => {
                try {
                    const flow = JSON.parse(reader.result)
                    if (Array.isArray(flow)) {
                        // Good Start
                        this.parts.flows = reader.result
                        this.errors.flows = ''
                    } else {
                        this.parts.flows = undefined
                        this.errors.flows = 'Does not look like a flow file'
                    }
                } catch (err) {
                    // problem
                    console.log(err)
                    this.parts.flows = undefined
                    this.errors.flows = 'Not JSON'
                }
            }
            reader.readAsText(file)
        },
        getCredsFile (file) {
            const reader = new FileReader()
            reader.onload = (evt) => {
                try {
                    const creds = JSON.parse(reader.result)
                    if (creds.$) {
                        // Good Start
                        this.parts.credentials = reader.result
                        this.errors.creds = ''
                    } else {
                        this.parts.credentials = undefined
                        this.errors.creds = 'Does not look like a creds file'
                    }
                } catch (err) {
                    // problem
                    console.log(err)
                    this.parts.credentials = undefined
                    this.errors.creds = 'Not JSON'
                }
            }
            reader.readAsText(file)
        },
        clear () {
            if (this.localData.flows?.obj) {
                this.localData.flows.obj.value = ''
            }
            this.localData.flows = undefined
            if (this.localData.creds?.obj) {
                this.localData.creds.obj.value = ''
            }
            this.localData.creds = undefined
            this.localData.secret = ''
        }
    },
    computed: {
        parts: {
            get () {
                return this.modelValue
            },
            set (localValue) {
                this.$emit('update:modelValue', localValue)
            }
        },
        withCreds () {
            return this.disableCredsSecret
        }
    }
}
</script>
