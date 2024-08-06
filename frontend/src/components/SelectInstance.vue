<template>
    <FormRow
        v-model="input.application"
        :options="options.applications"
        :disabled="noApplications || loading.applications"
        placeholder="Select an application"
        data-form="application"
    >
        Application
    </FormRow>
    <FormRow
        v-model="localValue"
        :options="options.instances"
        :disabled="noInstances || loading.instances"
        :placeholder="instancePlaceholder"
        data-form="instance"
    >
        Node-RED Instance
    </FormRow>
</template>
<script>

import ApplicationAPI from '../api/application.js'
import TeamAPI from '../api/team.js'

import FormRow from './FormRow.vue'

export default {
    name: 'SelectInstance',
    components: {
        FormRow
    },
    props: {
        team: {
            type: Object,
            required: true
        },
        modelValue: {
            type: Object,
            default: null
        },
        excludeInstanceIds: {
            type: Array,
            default: () => []
        }
    },
    emits: ['update:modelValue'],
    data () {
        return {
            loading: {
                applications: false,
                instances: false
            },
            options: {
                applications: null,
                instances: null
            },
            input: {
                application: null
            }
        }
    },
    computed: {
        localValue: {
            get () { return this.modelValue },
            set (localValue) { this.$emit('update:modelValue', localValue) }
        },
        noInstances () {
            return !this.options.instances || this.options.instances?.length === 0
        },
        noApplications () {
            return !this.options.applications || this.options.applications?.length === 0
        },
        instancePlaceholder () {
            return !this.input.application ? 'Select an application first' : 'Select an instance'
        }
    },
    watch: {
        'input.application': function () {
            this.localValue = null
            this.loadInstances(this.input.application.id)
        }
    },
    mounted () {
        this.loadApplications()
    },
    methods: {
        loadApplications () {
            this.loading.applications = true
            TeamAPI.getTeamApplications(this.team.id).then((data) => {
                this.options.applications = data.applications.map(application => { return { value: application, label: application.name } })
            }).catch((error) => {
                console.error(error)
            }).finally(() => {
                this.loading.applications = false
            })
        },
        loadInstances (applicationId) {
            this.loading.instances = true
            ApplicationAPI.getApplicationInstances(applicationId).then((instances) => {
                this.options.instances = instances?.filter((instance) => !this.excludeInstanceIds.includes(instance.id))
                    .map(instance => { return { value: instance, label: instance.name } }) ?? []
                if (this.options.instances.length === 1) {
                    this.localValue = this.options.instances[0].value
                }
            }).catch((error) => {
                console.error(error)
            }).finally(() => {
                this.loading.instances = false
            })
        }
    }
}
</script>
