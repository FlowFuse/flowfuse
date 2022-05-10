<template>
    <ff-dialog header="Delete Project" :open="isOpen">
        <template v-slot:default>
            <form class="space-y-6">
                <div class="mt-2 space-y-2">
                    <p>
                        Are you sure you want to delete this project? Once deleted, there is no going back.
                    </p>
                    <p>
                        Enter the project name to continue.
                        <code class="block">{{ project?.name }}</code>
                    </p>
                </div>
                <FormRow v-model="input.projectName" id="projectName">Name</FormRow>
            </form>
        </template>
        <template v-slot:actions>
            <ff-button kind="secondary" @click="close()">Cancel</ff-button>
            <ff-button kind="danger" :disabled="!formValid" class="ml-4" @click="confirm()">Delete</ff-button>
        </template>
    </ff-dialog>
</template>

<script>
import { ref } from 'vue'

import FormRow from '@/components/FormRow'

export default {
    name: 'ConfirmProjectDeleteDialog',
    components: {
        FormRow
    },
    data () {
        return {
            input: {
                projectName: ''
            },
            formValid: false,
            project: null
        }
    },
    watch: {
        input: {
            handler: function (v) {
                this.formValid = this.project.name === v.projectName
            },
            deep: true
        }
    },
    methods: {
        confirm () {
            this.$emit('deleteProject')
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
            show (project) {
                this.project = project
                isOpen.value = true
            }
        }
    }
}
</script>
