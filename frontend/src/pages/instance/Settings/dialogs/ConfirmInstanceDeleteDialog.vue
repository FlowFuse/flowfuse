<template>
    <ff-dialog
        ref="dialog"
        confirm-label="Delete"
        data-el="delete-instance-dialog"
        header="Delete Instance"
        kind="danger"
        :disable-primary="!formValid"
        @confirm="confirm()"
    >
        <template #default>
            <form class="space-y-6" @submit.prevent>
                <div class="mt-2 space-y-2">
                    <p>
                        Are you sure you want to delete this instance and the application that contains it? Once deleted, there is no going back.
                    </p>
                    <code class="flex w-max h-4 items-center">{{ instance?.name }}</code>
                </div>
                <FormRow v-model="input.instanceName" data-form="instance-name" placeholder="Enter the instance name to continue">Name</FormRow>
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
