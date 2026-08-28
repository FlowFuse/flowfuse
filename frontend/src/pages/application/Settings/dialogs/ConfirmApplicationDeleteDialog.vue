<template>
    <ff-dialog
        ref="dialog"
        :disable-primary="!formValid"
        :confirm-label="$t('ui.delete')"
        data-el="delete-application-dialog"
        :header="'Delete Application: \'' + application?.name + '\''"
        kind="danger"
        @confirm="confirm()"
    >
        <template #default>
            <form class="space-y-4" @submit.prevent>
                <p>
                    {{ $t('ui.areYouSureYouWantToDeleteThisApplicationOnceDele') }}
                </p>
                <p>
                    {{ $t('ui.name2') }} <span class="font-bold" data-el="application-name">{{ application?.name }}</span>
                </p>
                <p>
                    {{ $t('ui.pleaseTypeInTheApplicationNameToConfirm') }}
                </p>
                <FormRow id="projectName" v-model="input.projectName" :placeholder="'Application Name'" data-form="application-name" />
            </form>
        </template>
    </ff-dialog>
</template>

<script>

import FormRow from '../../../../components/FormRow.vue'

export default {
    name: 'ConfirmApplicationDeleteDialog',
    components: {
        FormRow
    },
    emits: ['confirm'],
    setup () {
        return {
            show (application) {
                this.$refs.dialog.show()
                this.application = application
            }
        }
    },
    data () {
        return {
            input: {
                projectName: ''
            },
            formValid: false,
            application: null
        }
    },
    watch: {
        input: {
            handler: function (v) {
                this.formValid = this.application.name === v.projectName
            },
            deep: true
        }
    },
    methods: {
        confirm () {
            if (this.formValid) {
                this.$emit('confirm')
            }
        }
    }
}
</script>
