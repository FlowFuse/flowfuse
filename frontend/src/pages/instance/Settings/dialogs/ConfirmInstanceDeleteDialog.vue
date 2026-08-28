<template>
    <ff-dialog
        ref="dialog"
        :confirm-label="$t('ui.delete')"
        data-el="delete-instance-dialog"
        :header="'Delete Instance: \'' + localInstance?.name + '\''"
        kind="danger"
        :disable-primary="!formValid"
        @confirm="deleteInstance()"
        @cancel="$emit('cancel')"
    >
        <template #default>
            <form class="space-y-4" @submit.prevent>
                <p>
                    {{ $t('ui.areYouSureYouWantToDeleteThisInstanceOnceDeleted') }}
                </p>
                <p>
                    {{ $t('ui.name2') }} <span class="font-bold" data-el="instance-name">{{ localInstance?.name }}</span>
                </p>
                <p>
                    {{ $t('ui.pleaseTypeInTheInstanceNameToConfirm') }}
                </p>
                <FormRow v-model="input.instanceName" :placeholder="'Instance Name'" data-form="instance-name" />
            </form>
        </template>
    </ff-dialog>
</template>

<script>

import InstanceApi from '../../../../api/instances.js'
import FormRow from '../../../../components/FormRow.vue'
import { t } from '../../../../i18n.js'
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
                    .then(() => alerts.emit(t('ui.instanceSuccessfullyDeleted'), 'confirmation'))
                    .catch(err => {
                        console.warn(err)
                        alerts.emit(t('ui.instanceFailedToDelete'), 'warning')
                    })
            }
        },
        updateLocalInstance () {
            this.localInstance = this.instance
        }
    }
}
</script>
