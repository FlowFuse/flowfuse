<template>
    <ff-dialog
        ref="dialog"
        confirm-label="Delete"
        data-el="delete-instance-dialog"
        :header="'Delete Instance: \'' + instance?.name + '\''"
        kind="danger"
        :disable-primary="!formValid"
        @confirm="confirm()"
    >
        <template #default>
            <form class="space-y-4" @submit.prevent>
                <p>
                    Are you sure you want to delete this instance? Once deleted, there is no going back.
                </p>
                <p>
                    Name: <span class="font-bold">{{ instance?.name }}</span>
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

import FormRow from '../../../../components/FormRow.vue'

export default {
    name: 'ConfirmInstanceDeleteDialog',
    components: {
        FormRow
    },
    emits: ['confirm'],
    setup () {
        return {
            show (instance) {
                this.instance = instance
                this.$refs.dialog.show()
            }
        }
    },
    data () {
        return {
            input: {
                instanceName: ''
            },
            instance: null
        }
    },
    computed: {
        formValid () {
            return this.instance?.name && this.input.instanceName === this.instance.name
        }
    },
    methods: {
        confirm () {
            if (this.formValid) {
                this.$emit('confirm', this.instance)
            }
        }
    }
}
</script>
