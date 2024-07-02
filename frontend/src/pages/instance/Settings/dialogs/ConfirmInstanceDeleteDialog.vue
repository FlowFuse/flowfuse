<template>
    <ff-dialog
        ref="dialog"
        confirm-label="Delete"
        data-el="delete-instance-dialog"
        :header="'Delete Instance: \'' + localInstance?.name + '\''"
        kind="danger"
        :disable-primary="!formValid"
        @confirm="deleteInstance()"
    >
        <template #default>
            <form class="space-y-4" @submit.prevent>
                <p>
                    Are you sure you want to delete this instance? Once deleted, there is no going back.
                </p>
                <p>
                    Name: <span class="font-bold">{{ localInstance?.name }}</span>
                </p>
                <p>
                    Please type in the instance name to confirm.
                </p>
                <FormRow v-model="input.instanceName" :placeholder="'Instance Name'" data-form="instance-name" />
            </form>
        </template>
    </ff-dialog>
</template>

<script>

import InstanceApi from '../../../../api/instances.js'
import FormRow from '../../../../components/FormRow.vue'
import alerts from '../../../../services/alerts.js'

export default {
    name: 'ConfirmInstanceDeleteDialog',
    components: {
        FormRow
    },
    props: {
        // this prop is required except for when called via show method
        instance: {
            required: false,
            type: Object,
            default: null
        }
    },
    emits: ['confirm'],
    setup () {
        return {
            show (instance) {
                this.input.instanceName = ''
                this.localInstance = instance
                this.$refs.dialog.show()
            }
        }
    },
    data () {
        return {
            input: {
                instanceName: ''
            },
            localInstance: null
        }
    },
    computed: {
        formValid () {
            return this.localInstance?.name && this.input.instanceName === this.localInstance.name
        }
    },
    watch: {
        instance: 'updateLocalInstance'
    },
    methods: {
        deleteInstance () {
            if (this.formValid) {
                InstanceApi.deleteInstance(this.localInstance)
                    .then(() => this.$emit('confirm', this.localInstance))
                    .then(() => alerts.emit('Instance successfully deleted.', 'confirmation'))
                    .catch(err => {
                        console.warn(err)
                        alerts.emit('Instance failed to delete.', 'warning')
                    })
            }
        },
        updateLocalInstance () {
            this.localInstance = this.instance
        }
    }
}
</script>
