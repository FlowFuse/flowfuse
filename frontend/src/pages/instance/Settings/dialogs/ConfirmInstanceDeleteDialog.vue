<template>
    <ff-dialog
        ref="dialog"

        :confirm-label="loading ? 'Deleting...' : 'Delete'"
        data-el="delete-instance-dialog"
        :header="'Delete Instance: \'' + localInstance?.name + '\''"
        kind="danger"
        :closeOnConfirm="false"
        :disable-primary="!formValid || loading"
        @confirm="deleteInstance()"
        @cancel="$emit('cancel')"
    >
        <template #default>
            <form class="space-y-4" @submit.prevent>
                <p>
                    Are you sure you want to delete this instance? Once deleted, there is no going back.
                </p>
                <p>
                    Name: <span class="font-bold" data-el="instance-name">{{ localInstance?.name }}</span>
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
    emits: ['confirm', 'cancel'],
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
            localInstance: null,
            loading: false
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
            if (!this.formValid || this.loading) {
                return
            }
            // Keep the dialog open and the button disabled until the backend
            // confirms the deletion. Closing early lets the instance linger in
            // the list long enough for a second delete to be triggered
            this.loading = true
            InstanceApi.deleteInstance(this.localInstance)
                .then(() => {
                    this.$refs.dialog.close()
                    this.$emit('confirm', this.localInstance)
                    alerts.emit('Instance successfully deleted.', 'confirmation')
                })
                .catch(err => {
                    console.warn(err)
                    alerts.emit('Instance failed to delete.', 'warning')
                })
                .finally(() => {
                    this.loading = false
                })
        },
        updateLocalInstance () {
            this.localInstance = this.instance
        }
    }
}
</script>
