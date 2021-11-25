<template>
    <form class="space-y-6">
        <FormRow v-model="input.projectId" type="uneditable" id="projectId" inputClass="font-mono">
            Project ID
        </FormRow>

        <FormRow v-model="input.projectName" :type="editing.projectName?'text':'uneditable'" id="projectName">
            Name
        </FormRow>

        <div class="space-x-4 whitespace-nowrap">
            <template v-if="!editing.projectName">
                <button type="button" class="forge-button forge-button-small" @click="editName">Edit project settings</button>
            </template>
            <template v-else>
                <button type="button" class="forge-button-tertiary forge-button-small" @click="cancelEditName">Cancel</button>
                <button type="button" class="forge-button forge-button-small" @click="saveEditName">Save project settings</button>
            </template>
        </div>

    </form>
</template>

<script>
import projectApi from '@/api/project'
import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'
import { ClipboardCopyIcon } from '@heroicons/vue/outline'


export default {
    name: 'ProjectSettings',

    props:[ "project" ],
    data() {
        return {
            editing: {
                projectName: false
            },
            input: {
                projectId: "",
                projectName: ""
            },
            original: {
                projectName: ""
            }
        }
    },
    watch: {
         project: 'fetchData'
    },
    mounted() {
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
        copyProjectId() {

        },
        editName() {
            this.original.projectName = this.input.projectName;
            this.editing.projectName = true
            setTimeout(() => {
                document.getElementById("projectName").focus()
            },0)
        },
        async saveEditName() {
            this.editing.projectName = false
            await projectApi.updateProject(this.project.id, {name: this.input.projectName});
            this.$emit('projectUpdated')
        },
        cancelEditName() {
            this.editing.projectName = false
            this.input.projectName = this.original.projectName;
        },
        fetchData () {
            this.input.projectId = this.project.id;
            this.input.projectName = this.project.name;
        }
    },
    components: {
        FormRow,
        FormHeading,
        ClipboardCopyIcon
    }
}
</script>
