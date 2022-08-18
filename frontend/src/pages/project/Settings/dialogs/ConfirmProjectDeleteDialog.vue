<template>
    <ff-dialog ref="dialog" header="Delete Project" kind="danger" confirm-label="Delete" :disable-primary="!formValid" @confirm="confirm()">
        <template v-slot:default>
            <form class="space-y-6" @submit.prevent>
                <div class="mt-2 space-y-2">
                    <p>
                        Are you sure you want to delete this project? Once deleted, there is no going back.
                    </p>
                    <p>
                        Enter the project name to continue.
                        <code class="block">{{ project?.name }}</code>
                    </p>
                </div>
                <FormRow v-model="input.projectName" id="projectName" data-form="project-name">Name</FormRow>
            </form>
        </template>
    </ff-dialog>
</template>

<script>

import FormRow from '@/components/FormRow'

export default {
    name: 'ConfirmProjectDeleteDialog',
    emits: ['confirm'],
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
            if (this.formValid) {
                this.$emit('confirm')
            }
        }
    },
    setup () {
        return {
            show (project) {
                this.$refs.dialog.show()
                this.project = project
            }
        }
    }
}
</script>
