<template>
    <ff-dialog header="Change Project Stack" :open="isOpen">
        <template v-slot:default>
            <form class="space-y-6">
                <p >
                    Select the new stack you want to use for this project:
                </p>
                <FormRow :options="stacks" v-model="input.stack">Stack</FormRow>
            </form>
        </template>
        <template v-slot:actions>
            <ff-button kind="secondary" @click="close()">Cancel</ff-button>
            <ff-button class="ml-4" @click="confirm()">Change Stack</ff-button>
        </template>
    </ff-dialog>
</template>

<script>
import { ref } from 'vue'

import stacksApi from '@/api/stacks'

import FormRow from '@/components/FormRow'

export default {
    name: 'ChangeStackDialog',
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
            this.$emit('changeStack', this.input.stack)
            this.isOpen = false
        }
    },
    setup () {
        const isOpen = ref(false)

        return {
            isOpen,
            close () {
                isOpen.value = false
            },
            async show (project) {
                this.project = project
                console.log(this.project)
                this.input.stack = this.project.stack.id
                isOpen.value = true
                const stackList = await stacksApi.getStacks()
                this.stacks = stackList.stacks
                    .filter(stack => (stack.active || stack.id === this.project.stack.id))
                    .map(stack => {
                        return {
                            value: stack.id,
                            label: stack.name + (stack.id === this.project.stack.id ? ' (current)' : '')
                        }
                    })
            }
        }
    }
}
</script>
