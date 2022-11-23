<template>
    <ff-dialog
        ref="dialog"
        header="Change Project Stack"
        confirm-label="Change Stack"
        class="ff-dialog-fixed-height"
        data-el="change-stack-dialog"
        @confirm="confirm()"
    >
        <template v-slot:default>
            <form class="space-y-6" @submit.prevent>
                <p >
                    Select the new stack you want to use for this project:
                </p>
                <FormRow
                    :options="stacks"
                    v-model="input.stack"
                    data-form="snapshot"
                    containerClass="w-full"
                >
                    Stack
                </FormRow>
            </form>
        </template>
    </ff-dialog>
</template>

<script>

import stacksApi from '@/api/stacks'

import FormRow from '@/components/FormRow'

export default {
    name: 'ChangeStackDialog',
    emits: ['confirm'],
    components: {
        FormRow
    },
    data () {
        return {
            input: {
                stack: ''
            },
            stacks: [],
            project: null
        }
    },
    methods: {
        confirm () {
            this.$emit('confirm', this.input.stack)
        }
    },
    setup () {
        return {
            async show (project) {
                this.$refs.dialog.show()
                this.project = project
                this.input.stack = this.project.stack?.id
                const stackList = await stacksApi.getStacks(null, null, 'all', this.project.projectType?.id)
                this.stacks = stackList.stacks
                    .filter(stack => (stack.active || stack.id === this.project.stack?.id))
                    .map(stack => {
                        return {
                            value: stack.id,
                            label: (stack.label || stack.name) + (stack.id === this.project.stack?.id ? ' (current)' : '')
                        }
                    })
            }
        }
    }
}
</script>
