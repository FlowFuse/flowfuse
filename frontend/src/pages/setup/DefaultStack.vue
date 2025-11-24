<template>
    <form class="px-4 sm:px-6 lg:px-8 mt-8 space-y-4  pt-4">
        <FormHeading>Default Stack</FormHeading>
        <p>This will create the default Stack for Hosted Node-RED instances.</p>
        <p>Here you can change the default values (you can always change them later)</p>
        <template v-for="(prop) in stackProperties" :key="prop.name">
            <FormRow v-model="input.properties[prop.name]" :error="errors[prop.name]">
                {{ prop.label }}
                <template v-if="prop.description" #description>{{ prop.description }}</template>
            </FormRow>
        </template>
        <div class="space-x-2">
            <ff-button class="mt-6" :disabled="!formValid" @click="next()">
                Next
            </ff-button>
        </div>
    </form>
</template>

<script>
import FormHeading from '../../components/FormHeading.vue'
import FormRow from '../../components/FormRow.vue'

export default {
    name: 'DefaultStack',
    components: {
        FormHeading,
        FormRow
    },
    props: {
        state: {
            type: Object,
            required: true
        }
    },
    emits: ['next'],
    data () {
        return {
            input: {
                properties: {}
            },
            errors: {}
        }
    },
    computed: {
        stackProperties () {
            return Object.entries(this.state.stackDefaults.properties).map(([key, value]) => {
                return {
                    name: key,
                    label: value.label,
                    description: value.description,
                    invalidMessage: value.invalidMessage || 'Invalid',
                    validator: new RegExp(value.validate)
                }
            })
        },
        formValid () {
            let propError = false
            // check for validation errors:
            this.stackProperties.forEach(prop => {
                if (!this.input.properties[prop.name] || this.errors[prop.name]) {
                    propError = true
                }
            })
            return !propError
        }
    },
    watch: {
        'input.properties': {
            deep: true,
            handler (v) {
                this.stackProperties.forEach(prop => {
                    if (v[prop.name] && !prop.validator.test(v[prop.name])) {
                        this.errors[prop.name] = prop.invalidMessage
                    } else {
                        this.errors[prop.name] = ''
                    }
                })
            }
        }
    },
    mounted () {
        if (this.state.stackDefaults.defaults) {
            Object.entries(this.state.stackDefaults.defaults).map(([key, value]) => {
                this.input.properties[key] = value
                return
            })
        }
    },
    methods: {
        next () {
            if (this.formValid) {
                this.$emit('next', { stackOverrides: this.input.properties })
            }
        }
    }
}
</script>
