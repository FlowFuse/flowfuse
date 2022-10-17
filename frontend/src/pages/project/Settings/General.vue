<template>
    <form class="space-y-6">
        <FormRow v-model="input.projectId" type="uneditable" id="projectId" inputClass="font-mono">
            Project ID
        </FormRow>

        <FormRow v-model="input.projectName" :type="editing.projectName?'text':'uneditable'" id="projectName">
            Name
        </FormRow>

        <FormRow v-model="input.projectTypeName" type="uneditable">
            Project Type
        </FormRow>

        <FormRow v-model="input.stackDescription" type="uneditable">
            Stack
            <template v-slot:append>
                <div v-if="project.stack && project.stack.replacedBy">
                    <ff-button size="small" to="./danger">Update</ff-button>
                </div>
            </template>
        </FormRow>
        <FormRow v-model="input.templateName" type="uneditable">
            Template
        </FormRow>

    </form>
</template>

<script>
import projectApi from '@/api/project'
import FormRow from '@/components/FormRow'

export default {
    name: 'ProjectSettings',

    props: ['project'],
    data () {
        return {
            editing: {
                projectName: false
            },
            input: {
                projectId: '',
                projectName: '',
                projectTypeName: '',
                stackDescription: '',
                templateName: ''
            },
            original: {
                projectName: ''
            }
        }
    },
    watch: {
        project: 'fetchData'
    },
    mounted () {
        this.fetchData()
    },
    // beforeRouteLeave(to, from, next) {
    //     console.log(to,from);
    //     if (this.editing.projectName) {
    //         next(false);
    //     } else {
    //         next();
    //     }
    // },
    methods: {
        copyProjectId () {

        },
        editName () {
            this.original.projectName = this.input.projectName
            this.editing.projectName = true
            setTimeout(() => {
                document.getElementById('projectName').focus()
            }, 0)
        },
        async saveEditName () {
            this.editing.projectName = false
            await projectApi.updateProject(this.project.id, { name: this.input.projectName })
            this.$emit('projectUpdated')
        },
        cancelEditName () {
            this.editing.projectName = false
            this.input.projectName = this.original.projectName
        },
        fetchData () {
            this.input.projectId = this.project.id
            if (this.project.stack) {
                this.input.stackDescription = this.project.stack.label || this.project.stack.name
            } else {
                this.input.stackDescription = 'none'
            }
            if (this.project.projectType) {
                this.input.projectTypeName = this.project.projectType.name
            } else {
                this.input.projectTypeName = 'none'
            }

            if (this.project.template) {
                this.input.templateName = this.project.template.name
            } else {
                this.input.templateName = 'none'
            }

            this.input.projectName = this.project.name
        }
    },
    components: {
        FormRow
    }
}
</script>
