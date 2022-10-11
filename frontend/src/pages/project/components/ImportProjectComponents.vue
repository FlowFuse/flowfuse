<template>
    <div class="space-y-4 my-3">
        <FormRow type="file" accept=".json" ref="flows" v-model="localData.flows">
            Flow File
        </FormRow>
        <FormRow type="file" accept=".json" ref="creds" v-model="localData.creds">
            Credentials File
        </FormRow>
        <FormRow :disabled="withCreds" type="text" v-model="localData.secret">
            Credentials Secret
        </FormRow>
    </div>
</template>

<style>
input::file-selector-button {
    float: right;
    border-radius: 6px;
    color: #F9FAFB;
    background-color: #4338CA;
    height: auto;
    line-height: 20px;
    font-weight: bold;
    border: 1px solid #1E3A8A;
}
</style>

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
            }
        }
    },
    mounted () {
        this.disableCredsSecret = true
        this.localData.flows = ''
        this.localData.creds = ''
        this.localData.secret = ''
    },
    watch: {
        localData: {
            deep: true,
            handler: function (value) {
                if (value.flows) {
                    this.getFlowFile(value.flows.files[0])
                }
                if (value.creds) {
                    this.disableCredsSecret = false
                    this.getCredsFile(value.creds.files[0])
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
                    } else {
                        this.parts.flows = undefined
                    }
                } catch (err) {
                    // problem
                    console.log(err)
                    this.parts.flows = undefined
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
                    } else {
                        this.parts.credentials = undefined
                    }
                } catch (err) {
                    // problem
                    console.log(err)
                    this.parts.credentials = undefined
                }
            }
            reader.readAsText(file)
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
